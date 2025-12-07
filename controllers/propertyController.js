const Property = require('../models/propertyModel');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../cloudinary');

// Create directory if not exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Pagination, MIN_PRICE already in your code
const MIN_PRICE = Number(process.env.MIN_PROPERTY_PRICE ?? 50000); // fallback 50k
const ALLOW_FIRST = process.env.ALLOW_FIRST_LISTING === 'true'; // env override

function validatePriceOrThrow(price) {
  if (price == null || price === '') return; // allow missing if not required in updates; otherwise enforce below
  const n = Number(price);
  if (Number.isNaN(n)) {
    const err = new Error('Invalid price value');
    err.statusCode = 400;
    throw err;
  }
  if (n < MIN_PRICE) {
    const err = new Error(`Price must be at least ₱${MIN_PRICE.toLocaleString()}`);
    err.statusCode = 400;
    throw err;
  }
}

// Helper: check if user has >=1 existing listing
async function userHasExistingListing(userId) {
  if (!userId) return false;
  const count = await Property.countDocuments({
    $or: [{ postedBy: userId }, { createdBy: userId }]
  });
  return count > 0;
}

// Get all properties with populated owner information
exports.getAllProperties = async (req, res) => {
  try {
    // Pagination support
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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get single property by ID with populated owner information
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      property: property
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create new property (requires authentication)
// Only users who already have >=1 listing may create another,
// unless ALLOW_FIRST=true OR req.user.role === 'admin'
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

    // Require authenticated user (route already uses protect middleware)
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userId = req.user._id;

    // Enforce "must already have a listing" rule (unless override/admin)
    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      try {
        const hasListing = await userHasExistingListing(userId);
        if (!hasListing) {
          return res.status(403).json({
            success: false,
            message: 'You must already have an existing listing to create another.'
          });
        }
      } catch (err) {
        console.error('Error checking existing listings:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
    }

    const imageUrls = [];

    // Upload images to Cloudinary if provided
    if (req.files && req.files.length > 0) {
      console.log(`Uploading ${req.files.length} images to Cloudinary...`);
      for (const file of req.files) {
        const base64Str = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const uploadResult = await cloudinary.uploader.upload(base64Str, {
          folder: 'properties',
          transformation: [
            { width: 800, height: 600, crop: 'fill' },
            { quality: 'auto' }
          ]
        });
        imageUrls.push(uploadResult.secure_url);
      }
      console.log(`Successfully uploaded ${imageUrls.length} images`);
    }

    // Handle amenities (can be array or string)
    const amenitiesArray = Array.isArray(amenities)
      ? amenities
      : typeof amenities === 'string'
      ? amenities.split(',').map(a => a.trim())
      : [];

    // Validate price presence and value on create
    try {
      if (price === undefined || price === null || price === '') {
        const err = new Error('Price is required');
        err.statusCode = 400;
        throw err;
      }
      validatePriceOrThrow(price);
    } catch (err) {
      console.error('Validation error:', err);
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }

    // Create property object
    // Parse numeric latitude/longitude if provided
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

    // Populate before returning
    await property.populate('postedBy', 'username email fullName profilePicture phoneNumber address');
    await property.populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    console.log('Property created successfully:', property._id);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      property: property
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update property (requires authentication and ownership)
// Additionally require user has existing listing (unless admin/override)
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Resolve owner id from multiple possible fields (defensive)
    const ownerId = property.createdBy || property.postedBy || (property.owner && property.owner.id);
    // Check if user owns this property (if authenticated). Allow admins.
    if (req.user && ownerId && String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // Additional rule: user must already have at least one listing to update (unless admin/override)
    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      try {
        const hasListing = await userHasExistingListing(req.user._id);
        if (!hasListing) {
          return res.status(403).json({
            success: false,
            message: 'You must have an existing listing to update properties.'
          });
        }
      } catch (err) {
        console.error('Error checking existing listings:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
    }

    // Handle amenities if provided
    if (req.body.amenities) {
      if (typeof req.body.amenities === 'string') {
        req.body.amenities = req.body.amenities.split(',').map(a => a.trim());
      }
    }

    // Update location if provided
    if (req.body.address || req.body.latitude || req.body.longitude) {
      const newLat = req.body.latitude !== undefined && req.body.latitude !== '' ? parseFloat(req.body.latitude) : property.location.latitude;
      const newLng = req.body.longitude !== undefined && req.body.longitude !== '' ? parseFloat(req.body.longitude) : property.location.longitude;
      property.location = {
        address: req.body.address || property.location.address,
        latitude: newLat,
        longitude: newLng
      };
      // remove location-related fields from further processing
      delete req.body.address;
      delete req.body.latitude;
      delete req.body.longitude;
    }

    try {
      if (req.body.price !== undefined) validatePriceOrThrow(req.body.price);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }

    // Whitelist allowed updatable fields to avoid overwriting protected fields
    const allowed = ['name','description','price','propertyType','amenities','status','phoneNumber','images'];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === 'price') {
          property.price = Number(req.body.price);
        } else {
          property[key] = req.body[key];
        }
      }
    }
    // Force owner values to the authenticated user (defense in depth)
    if (req.user) {
      property.createdBy = req.user._id;
      property.postedBy = req.user._id;
    }
    await property.save();

    // Populate before returning
    await property.populate('postedBy', 'username email fullName profilePicture phoneNumber address');
    await property.populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    console.log('Property updated successfully:', property._id);

    res.json({
      success: true,
      message: 'Property updated successfully',
      property: property
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete property (requires authentication and ownership)
// Additionally require user has existing listing (unless admin/override)
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user owns this property (if authenticated)
    if (req.user && property.postedBy && property.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    // Additional rule: user must already have at least one listing to delete (unless admin/override)
    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      try {
        const hasListing = await userHasExistingListing(req.user._id);
        if (!hasListing) {
          return res.status(403).json({
            success: false,
            message: 'You must have an existing listing to delete properties.'
          });
        }
      } catch (err) {
        console.error('Error checking existing listings:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
    }

    await Property.findByIdAndDelete(req.params.id);

    console.log('Property deleted successfully:', req.params.id);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get properties by user ID (for user profile page)
exports.getPropertiesByUser = async (req, res) => {
  try {
    // Require authenticated user
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { userId } = req.params;

    // Only allow the authenticated user to fetch their own listings (admins allowed)
    if (String(req.user._id) !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const properties = await Property.find({
      $or: [
        { postedBy: userId },
        { createdBy: userId },
        { 'owner.id': userId }
      ]
    })
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
      .sort({ createdAt: -1 });

    // Prevent caching of user-specific listings
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.json({
      success: true,
      count: properties.length,
      properties: properties
    });
  } catch (error) {
    console.error('Get properties by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Search/Filter properties
exports.searchProperties = async (req, res) => {
  try {
    const { location, propertyType, minPrice, maxPrice, status, amenities } = req.query;

    let query = {};

    // Filter by location (case-insensitive)
    if (location) {
      query['location.address'] = { $regex: location, $options: 'i' };
    }

    // Filter by property type
    if (propertyType && propertyType !== 'all') {
      query.propertyType = propertyType;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by amenities
    if (amenities) {
      const amenitiesArray = typeof amenities === 'string'
        ? amenities.split(',').map(a => a.trim())
        : amenities;
      query.amenities = { $in: amenitiesArray };
    }

    console.log('Search query:', query);

    const properties = await Property.find(query)
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: properties.length,
      properties: properties
    });
  } catch (error) {
    console.error('Search properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};