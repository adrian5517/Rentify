/*
  Patch: property controller (apply to your server controllers file)
  Changes included:
  - Flip ALLOW_FIRST default: default allow first listing unless ALLOW_FIRST_LISTING='false'
  - Add MAX_PRICE enforcement (default 50000). validatePriceOrThrow now checks min and max.
  - Preserve existing behavior (cloudinary uploads, owner checks), with clearer error codes.

  To apply: replace your existing properties controller with this file (keep relative require helpers if needed), then restart the server.
*/

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function requireAny(paths) {
  for (const p of paths) {
    try {
      return require(p);
    } catch (err) {
      // continue
    }
  }
  return require(paths[0]);
}

const cloudinary = requireAny([
  path.join(__dirname, '..', 'cloudinary'),
  path.join(process.cwd(), 'server', 'cloudinary'),
  path.join(process.cwd(), 'cloudinary')
]);

function requireModel(modelFileName) {
  const tryPaths = [
    path.join(__dirname, '..', 'models', modelFileName),
    path.join(process.cwd(), 'server', 'models', modelFileName),
    path.join(process.cwd(), 'models', modelFileName),
  ];

  for (const p of tryPaths) {
    try {
      return require(p);
    } catch (err) {
      // ignore
    }
  }
  return require(path.join(__dirname, '..', 'models', modelFileName));
}

const Property = requireModel('propertyModel');

// (env config above)

// Read min/max from env; keep previous default MIN 50000 for compatibility
const MIN_PRICE = Number(process.env.MIN_PROPERTY_PRICE ?? 0); // if you want a minimum, set env; default 0
const MAX_PRICE = Number(process.env.MAX_PROPERTY_PRICE ?? 50000); // enforce max 50k by default
// Flip default: allow first listing unless explicitly disabled by ALLOW_FIRST_LISTING='false'
const ALLOW_FIRST = process.env.ALLOW_FIRST_LISTING !== 'false';

function validatePriceOrThrow(price) {
  if (price == null || price === '') return; // allow missing in some updates
  const n = Number(price);
  if (Number.isNaN(n)) {
    const err = new Error('Invalid price value');
    err.statusCode = 400;
    throw err;
  }
  if (MIN_PRICE && n < MIN_PRICE) {
    const err = new Error(`Price must be at least ₱${MIN_PRICE.toLocaleString()}`);
    err.statusCode = 400;
    throw err;
  }
  if (MAX_PRICE && n > MAX_PRICE) {
    const err = new Error(`Price must be at most ₱${MAX_PRICE.toLocaleString()}`);
    err.statusCode = 400;
    throw err;
  }
}

async function userHasExistingListing(userId) {
  if (!userId) return false;
  const count = await Property.countDocuments({
    $or: [{ postedBy: userId }, { createdBy: userId }]
  });
  return count > 0;
}

exports.getAllProperties = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      Property.find()
        .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
        .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Property.countDocuments(),
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      count: properties.length,
      properties: properties
    });
  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    res.json({ success: true, property });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createProperty = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      latitude,
      longitude,
      address,
      propertyType = 'other',
      amenities,
      status = 'available',
      phoneNumber
    } = req.body;

    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const userId = req.user._id;

    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      const hasListing = await userHasExistingListing(userId);
      if (!hasListing) return res.status(403).json({ success: false, message: 'You must already have an existing listing to create another.' });
    }

    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const base64Str = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          const uploadResult = await cloudinary.uploader.upload(base64Str, {
            folder: 'properties',
            transformation: [ { width: 800, height: 600, crop: 'fill' }, { quality: 'auto' } ]
          });
          imageUrls.push(uploadResult.secure_url);
        } catch (err) {
          console.error('Cloudinary upload failed:', err);
          return res.status(500).json({ success: false, message: 'Image upload failed' });
        }
      }
    }

    const amenitiesArray = Array.isArray(amenities)
      ? amenities
      : typeof amenities === 'string'
      ? amenities.split(',').map(a => a.trim())
      : [];

    try {
      if (price === undefined || price === null || price === '') {
        const err = new Error('Price is required'); err.statusCode = 400; throw err;
      }
      validatePriceOrThrow(price);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }

    const lat = latitude !== undefined && latitude !== '' ? parseFloat(latitude) : undefined;
    const lng = longitude !== undefined && longitude !== '' ? parseFloat(longitude) : undefined;

    const property = new Property({
      name,
      description,
      location: { address, latitude: lat, longitude: lng },
      price: Number(price),
      propertyType,
      postedBy: userId,
      createdBy: userId,
      amenities: amenitiesArray,
      status,
      phoneNumber,
      images: imageUrls
    });

    await property.save();
    await property.populate('postedBy', 'username email fullName profilePicture phoneNumber address');
    await property.populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.status(201).json({ success: true, message: 'Property created successfully', property });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const ownerId = property.createdBy || property.postedBy || (property.owner && property.owner.id);
    if (req.user && ownerId && String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      const hasListing = await userHasExistingListing(req.user._id);
      if (!hasListing) return res.status(403).json({ success: false, message: 'You must have an existing listing to update properties.' });
    }

    if (req.body.amenities) {
      if (typeof req.body.amenities === 'string') req.body.amenities = req.body.amenities.split(',').map(a => a.trim());
    }

    if (req.body.address || req.body.latitude || req.body.longitude) {
      const newLat = req.body.latitude !== undefined && req.body.latitude !== '' ? parseFloat(req.body.latitude) : property.location.latitude;
      const newLng = req.body.longitude !== undefined && req.body.longitude !== '' ? parseFloat(req.body.longitude) : property.location.longitude;
      property.location = { address: req.body.address || property.location.address, latitude: newLat, longitude: newLng };
      delete req.body.address; delete req.body.latitude; delete req.body.longitude;
    }

    try { if (req.body.price !== undefined) validatePriceOrThrow(req.body.price); } catch (err) { return res.status(err.statusCode || 400).json({ success: false, message: err.message }); }

    const allowed = ['name','description','price','propertyType','amenities','status','phoneNumber','images'];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === 'price') property.price = Number(req.body.price);
        else property[key] = req.body[key];
      }
    }

    if (req.user) { property.createdBy = req.user._id; property.postedBy = req.user._id; }
    await property.save();
    await property.populate('postedBy', 'username email fullName profilePicture phoneNumber address');
    await property.populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.json({ success: true, message: 'Property updated successfully', property });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const ownerId = property.createdBy || property.postedBy || (property.owner && property.owner.id);
    if (req.user && ownerId && String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }

    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      const hasListing = await userHasExistingListing(req.user._id);
      if (!hasListing) return res.status(403).json({ success: false, message: 'You must have an existing listing to delete properties.' });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPropertiesByUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { userId } = req.params;
    if (String(req.user._id) !== String(userId) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });

    const properties = await Property.find({ $or: [ { postedBy: userId }, { createdBy: userId }, { 'owner.id': userId } ] })
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
      .sort({ createdAt: -1 });

    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.json({ success: true, count: properties.length, properties });
  } catch (error) {
    console.error('Get properties by user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.searchProperties = async (req, res) => {
  try {
    const { location, propertyType, minPrice, maxPrice, status, amenities } = req.query;
    let query = {};
    if (location) query['location.address'] = { $regex: location, $options: 'i' };
    if (propertyType && propertyType !== 'all') query.propertyType = propertyType;
    if (minPrice || maxPrice) { query.price = {}; if (minPrice) query.price.$gte = Number(minPrice); if (maxPrice) query.price.$lte = Number(maxPrice); }
    if (status && status !== 'all') query.status = status;
    if (amenities) {
      const amenitiesArray = typeof amenities === 'string' ? amenities.split(',').map(a => a.trim()) : amenities;
      query.amenities = { $in: amenitiesArray };
    }

    const properties = await Property.find(query)
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: properties.length, properties });
  } catch (error) {
    console.error('Search properties error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
