const Property = require('../models/propertyModel');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../cloudinary');

// Create directory if not exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Get all properties with populated owner information
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find()
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
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

    // Get user ID from authenticated request (set by auth middleware)
    const userId = req.user ? req.user._id : req.body.postedBy;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
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

    // Create property object
    const property = new Property({
      name,
      description,
      location: { address, latitude, longitude },
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
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ 
        success: false,
        message: 'Property not found' 
      });
    }

    // Check if user owns this property (if authenticated)
    if (req.user && property.postedBy && property.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // Handle amenities if provided
    if (req.body.amenities) {
      if (typeof req.body.amenities === 'string') {
        req.body.amenities = req.body.amenities.split(',').map(a => a.trim());
      }
    }

    // Update location if provided
    if (req.body.address || req.body.latitude || req.body.longitude) {
      property.location = {
        address: req.body.address || property.location.address,
        latitude: req.body.latitude || property.location.latitude,
        longitude: req.body.longitude || property.location.longitude
      };
      delete req.body.address;
      delete req.body.latitude;
      delete req.body.longitude;
    }

    // Update other fields
    Object.assign(property, req.body);
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
    if (req.user && property.postedBy && property.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
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
    const properties = await Property.find({
      $or: [
        { postedBy: req.params.userId },
        { createdBy: req.params.userId }
      ]
    })
    .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
    .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
    .sort({ createdAt: -1 });
    
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
