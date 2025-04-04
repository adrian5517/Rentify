const Property = require('../models/propertyModel');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure the 'uploads' directory exists
const uploadDirectory = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Middleware to handle file uploads (up to 7 images)
const uploadImages = upload.array('images', 7);

// Controller to create a property
const createProperty = async (req, res) => {
    const { name, description, address, city, province, zipCode, coordinates, price, type, availableRooms, amenities, status } = req.body;

    // Check if files were uploaded and map file paths
    const imagePaths = req.files ? req.files.map(file => file.path) : [];

    try {
        // Create a new property in the database
        const newProperty = await Property.create({
            ownerId: req.user._id,
            name,
            description,
            address,
            city,
            province,
            zipCode,
            coordinates,
            price,
            type,
            availableRooms,
            amenities,
            status,
            images: imagePaths
        });

        await newProperty.save();
        res.status(201).json({ message: 'Property created successfully', property: newProperty });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Controller to get all properties
const getAllProperties = async (req, res) => {
    try {
        const properties = await Property.find().populate('ownerId', 'firstName lastName');
        res.status(200).json(properties);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Controller to get a property by its ID
const getPropertyById = async (req, res) => {
    const { id } = req.params;
    try {
        const property = await Property.findById(id).populate('ownerId', 'firstName lastName');
        if (!property) return res.status(404).json({ message: 'Property not found' });
        res.status(200).json(property);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Controller to update a property
const updateProperty = async (req, res) => {
    const { id } = req.params;

    try {
        const property = await Property.findById(id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (property.ownerId.toString() !== req.user.id) return res.status(403).json({ message: 'You are not authorized to update this property' });

        // Update property fields
        Object.assign(property, req.body);

        // Handle image uploads if any
        if (req.files) {
            const imagePaths = req.files.map(file => file.path);
            property.images = imagePaths;
        }

        await property.save();
        res.status(200).json({ message: 'Property updated successfully', property });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Controller to delete a property
const deleteProperty = async (req, res) => {
    const { id } = req.params;
    try {
        const property = await Property.findById(id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        if (property.ownerId.toString() !== req.user.id) return res.status(403).json({ message: 'You are not authorized to delete this property' });

        await Property.findByIdAndDelete(id);
        res.status(200).json({ message: 'Property deleted successfully' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createProperty,
    getAllProperties,
    getPropertyById,
    deleteProperty,
    uploadImages,
    updateProperty
};
