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
      title,
      description,
      price,
      latitude,
      longitude,
      address = '',
      propertyType = 'other',
      postedBy = 'Anonymous',
      amenities = '[]',
      status = 'available',
      createdBy
    } = req.body;

    // Check for required fields
    if (!title || !price || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Parse amenities and check if it's a valid JSON
    let parsedAmenities = [];
    try {
      parsedAmenities = JSON.parse(amenities);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid amenities format' });
    }

    // Validate amenities is an array
    if (!Array.isArray(parsedAmenities)) {
      return res.status(400).json({ message: 'Amenities should be an array' });
    }

    const imagePaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Validate image file type (optional but recommended)
        const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validImageTypes.includes(file.mimetype)) {
          return res.status(400).json({ message: 'Invalid file type. Only PNG/JPG/JPEG are allowed' });
        }

        const filename = `${Date.now()}-${file.originalname.split('.')[0]}.png`;
        const outputPath = path.join(uploadDir, filename);

        // Resize and save image using sharp
        await sharp(file.buffer)
          .resize(800)
          .png()
          .toFile(outputPath);

        imagePaths.push(`/uploads/${filename}`);
      }
    }

    const property = new Property({
      name: title,
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

    // Save property to the database
    const saved = await property.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error(error); // Add some logging for server errors
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
