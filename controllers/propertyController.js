const Property = require('../models/propertyModel');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../cloudinary');

// Create directory if not exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
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
      postedBy,
      amenities,
      status = 'available',
      createdBy
    } = req.body;

    const imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const base64Str = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const uploadResult = await cloudinary.uploader.upload(base64Str, {
          folder: 'properties'
        });
        imageUrls.push(uploadResult.secure_url);
      }
    }

    const amenitiesArray = Array.isArray(amenities)
      ? amenities
      : typeof amenities === 'string'
      ? [amenities]
      : [];

    const property = new Property({
      name,
      description,
      location: { address, latitude, longitude },
      price,
      propertyType,
      postedBy,
      amenities: amenitiesArray,
      status,
      createdBy,
      images: imageUrls
    });

    const saved = await property.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Property not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const deleted = await Property.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Property not found' });
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
