const Property = require('../models/propertyModel');

// Create a new property
const createProperty = async (req, res) => {
  const { name, address, price, description, ownerId } = req.body; // Ensure ownerId is passed

  // Handle image upload
  const images = req.files ? req.files.map(file => file.path) : [];

  // Validate required fields
  if (!name || !address || !price || !description || !ownerId) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Create a new property
    const newProperty = new Property({
      name,
      address,
      price,
      description,
      images,
      ownerId, // Use ownerId from the request body
    });

    await newProperty.save(); // Save the new property to the database
    res.status(201).json({ message: 'Property created successfully', property: newProperty });
  } catch (error) {
    res.status(500).json({ message: 'Error creating property', error: error.message });
  }
};

// Get all properties
const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find(); // Find all properties
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching properties', error: error.message });
  }
};

// Get a specific property by ID
const getPropertyById = async (req, res) => {
  const { id } = req.params;

  try {
    const property = await Property.findById(id); // Find property by ID
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching property', error: error.message });
  }
};

// Update a property by ID
const updateProperty = async (req, res) => {
  const { id } = req.params;
  const { name, address, price, description, ownerId } = req.body; // Ensure ownerId is passed

  // Handle image upload
  const images = req.files ? req.files.map(file => file.path) : [];

  try {
    const updatedProperty = await Property.findByIdAndUpdate(id, {
      name,
      address,
      price,
      description,
      images,
      ownerId, // Update ownerId as well
    }, { new: true }); // { new: true } ensures that the updated document is returned

    if (!updatedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json({ message: 'Property updated successfully', property: updatedProperty });
  } catch (error) {
    res.status(500).json({ message: 'Error updating property', error: error.message });
  }
};

// Delete a property by ID
const deleteProperty = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProperty = await Property.findByIdAndDelete(id); // Find and delete property by ID
    if (!deletedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }
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
};
