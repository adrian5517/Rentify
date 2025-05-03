const Property = require('../models/propertyModel');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

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
      address = '',
      propertyType = 'other',
      postedBy,
      amenities = '[]',
      status = 'available',
      createdBy
    } = req.body;

    // Parse amenities
    let parsedAmenities = [];
    try {
      parsedAmenities = JSON.parse(amenities);
    } catch {
      parsedAmenities = [];
    }

    const imagePaths = [];
    if (req.files && req.files.length > 0) {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      for (const file of req.files) {
        if (!validImageTypes.includes(file.mimetype)) continue;

        const filename = `${Date.now()}-${file.originalname.split('.')[0]}.png`;
        const outputPath = path.join(uploadDir, filename);

        await sharp(file.buffer)
          .resize(800)
          .png()
          .toFile(outputPath);

        imagePaths.push(`/uploads/${filename}`);
      }
    }

    const property = new Property({
      name,
      description,
      location: { address, latitude, longitude },
      price,
      propertyType,
      postedBy,
      amenities: parsedAmenities,
      status,
      createdBy,
      images: imagePaths
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
