const Property = require('../models/propertyModel');

// Get all properties
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get a single property
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Not Found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a single property
exports.createProperty = async (req, res) => {
  try {
    const newProperty = new Property(req.body);
    const savedProperty = await newProperty.save();
    res.status(201).json(savedProperty);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create multiple properties (Bulk POST)
exports.createBulkProperties = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Expected an array of properties' });
    }

    const savedProperties = await Property.insertMany(req.body);
    res.status(201).json({
      message: `${savedProperties.length} properties created successfully.`,
      data: savedProperties,
    });
  } catch (error) {
    console.error('Bulk insert error:', error);
    res.status(500).json({ message: 'Server Error during bulk insert' });
  }
};

// Update a property
exports.updateProperty = async (req, res) => {
  try {
    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProperty) return res.status(404).json({ message: 'Property not found' });
    res.json(updatedProperty);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete a property
exports.deleteProperty = async (req, res) => {
  try {
    const deletedProperty = await Property.findByIdAndDelete(req.params.id);
    if (!deletedProperty) return res.status(404).json({ message: 'Property not found' });
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
