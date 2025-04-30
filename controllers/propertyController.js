const Property = require('../models/propertyModel');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// GET ALL PROPERTIES
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// GET SINGLE PROPERTY
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Not Found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// CREATE NEW PROPERTY WITH IMAGE PROCESSING
exports.createProperty = async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      price,
      propertyType,
      postedBy,
      amenities,
      status,
      createdBy
    } = req.body;

    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    const imagePaths = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const outputFilename = `${Date.now()}-${file.originalname.split('.')[0]}.png`;
        const outputPath = path.join(uploadDir, outputFilename);

        await sharp(file.buffer)
          .png()
          .toFile(outputPath);

        imagePaths.push(`/uploads/${outputFilename}`);
      }
    }

    const newProperty = new Property({
      name,
      description,
      location: JSON.parse(location),
      price,
      propertyType,
      postedBy,
      amenities: amenities ? JSON.parse(amenities) : [],
      status,
      createdBy,
      images: imagePaths
    });

    const savedProperty = await newProperty.save();
    res.status(201).json(savedProperty);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error during property creation' });
  }
};

// UPDATE PROPERTY
exports.updateProperty = async (req, res) => {
  try {
    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedProperty);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// DELETE PROPERTY
exports.deleteProperty = async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
