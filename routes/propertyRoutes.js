const Property = require('../models/propertyModel');

// Create a new property
exports.createProperty = async (req, res) => {
    try {
        const { name, description, address, city, province, zipCode, coordinates, price, type, availableRooms, amenities, images } = req.body;
        const ownerId = req.user.id; // Assuming user is authenticated and their ID is available from JWT

        // Validate required fields
        if (!name || !description || !address || !price || !type) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const property = new Property({
            ownerId,
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
            images,
        });

        await property.save();
        res.status(201).json({ message: 'Property created successfully', property });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all properties
exports.getAllProperties = async (req, res) => {
    try {
        const properties = await Property.find();
        res.status(200).json({ properties });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single property by ID
exports.getPropertyById = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        res.status(200).json({ property });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a property by ID
exports.updateProperty = async (req, res) => {
    try {
        const { name, description, address, city, province, zipCode, coordinates, price, type, availableRooms, amenities, images } = req.body;

        const property = await Property.findByIdAndUpdate(
            req.params.id,
            { 
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
                images
            },
            { new: true }
        );

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        res.status(200).json({ message: 'Property updated successfully', property });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a property by ID
exports.deleteProperty = async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        res.status(200).json({ message: 'Property deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
