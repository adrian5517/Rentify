const Property = require('../models/propertyModel');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure the 'uploads' directory exists
const uploadDirectory = path.join(__dirname, '../uploads'); // Adjust path to be in the root directory
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory);  // Specify directory for file uploads
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);  // Use timestamp to ensure unique filenames
    }
});

const upload = multer({ storage });

// Middleware to handle file uploads (up to 7 images)
const uploadImages = upload.array('images', 7);  // 'images' corresponds to the field name in the form

// Controller to create a property
const createProperty = async (req, res) => {
    // if (!req.user) {
    //     return res.status(401).json({ message: 'User not authenticated' });
    // }

    const { name, description, address, city, province, zipCode, price, type, availableRooms, amenities, status } = req.body;
    const imagePaths = req.files ? req.files.map(file => file.path) : [];  // Get paths of uploaded images

    try {
        const newProperty = await Property.create({
            ownerId: req.user._id,  // Ensure req.user._id exists
            name,
            description,
            address,
            city,
            province,
            zipCode,
            price,
            type,
            availableRooms,
            amenities,
            status,
            images: imagePaths  // Store the image paths in the database
        });

        res.status(201).json({ message: 'Property created successfully', property: newProperty });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating property', error: error.message });
    }
};

// Controller to get all properties
const getAllProperties = async (req, res) => {
    try {
        const properties = await Property.find().populate('ownerId', 'firstName lastName');
        res.status(200).json(properties);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching properties', error: error.message });
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
        res.status(500).json({ message: 'Error fetching property', error: error.message });
    }
};

// Controller to update a property
const updateProperty = async (req, res) => {
    const { id } = req.params;

    try {
        const property = await Property.findById(id);
        if (!property) return res.status(404).json({ message: 'Property not found' });

        // Ensure the current user is the owner of the property
        if (property.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to update this property' });
        }

        // Update property fields
        Object.assign(property, req.body);

        // Handle image uploads if any
        if (req.files) {
            const imagePaths = req.files.map(file => file.path);  // Get image paths from the uploaded files
            property.images = imagePaths;  // Update the property images
        }

        await property.save();
        res.status(200).json({ message: 'Property updated successfully', property });
    } catch (error) {
        res.status(500).json({ message: 'Error updating property', error: error.message });
    }
};

// Controller to delete a property
const deleteProperty = async (req, res) => {
    const { id } = req.params;
    try {
        const property = await Property.findById(id);
        if (!property) return res.status(404).json({ message: 'Property not found' });

        // Ensure the current user is the owner of the property
        if (property.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this property' });
        }

        await Property.findByIdAndDelete(id);
        res.status(200).json({ message: 'Property deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting property', error: error.message });
    }
};

module.exports = {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    uploadImages
};
