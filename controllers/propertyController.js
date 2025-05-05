const Property = require('../models/propertyModel');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Setup Multer Storage Configuration
const storage = multer.memoryStorage(); // Use memory storage to process images before saving
const upload = multer({ storage: storage }).array('images'); // Assuming "images" is the field name in the form

// GET ALL PROPERTIES
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// GET SINGLE PROPERTY
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property Not Found' });
    res.json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// CREATE NEW PROPERTY WITH IMAGE PROCESSING
exports.createProperty = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error uploading files', error: err.message });
    }

    try {
      const {
        title,
        description,
        price,
        latitude,
        longitude,
        propertyType = 'Residential',   // default value
        postedBy = 'Anonymous',
        amenities = '[]',              // expecting JSON string
        status = 'Available',
        createdBy = 'System'
      } = req.body;

      // Basic validation
      if (!title || !description || !price || !latitude || !longitude) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Parse location from latitude & longitude
      const location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };

      // Parse amenities
      let parsedAmenities = [];
      try {
        parsedAmenities = JSON.parse(amenities);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid amenities format. Must be a JSON array.' });
      }

      // Save images
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

      const imagePaths = [];

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          if (!file.mimetype.startsWith('image/')) {
            return res.status(400).json({ message: 'Only image files are allowed' });
          }

          const outputFilename = `${Date.now()}-${file.originalname.split('.')[0]}.png`;
          const outputPath = path.join(uploadDir, outputFilename);

          await sharp(file.buffer).png().toFile(outputPath);
          imagePaths.push(`/uploads/${outputFilename}`);
        }
      }

      const newProperty = new Property({
        name: title,
        description,
        location,
        price: parseFloat(price),
        propertyType,
        postedBy,
        amenities: parsedAmenities,
        status,
        createdBy,
        images: imagePaths,
      });

      const savedProperty = await newProperty.save();
      res.status(201).json(savedProperty);
    } catch (error) {
      console.error('Create Property Error:', error);
      res.status(500).json({ message: 'Server Error during property creation' });
    }
  });
};


// UPDATE PROPERTY
exports.updateProperty = async (req, res) => {
  try {
    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(updatedProperty);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// DELETE PROPERTY
exports.deleteProperty = async (req, res) => {
  try {
    const deletedProperty = await Property.findByIdAndDelete(req.params.id);
    if (!deletedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json({ message: 'Property deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
