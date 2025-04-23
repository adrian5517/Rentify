const Property = require('../models/propertyModel');
const KMeans = require('ml-kmeans');

// Get all properties with clustering
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();

    // Prepare features for clustering
    const featureSet = properties
      .map(p => {
        if (
          p.price != null &&
          p.location &&
          p.location.latitude != null &&
          p.location.longitude != null
        ) {
          return [
            parseFloat(p.price),
            parseFloat(p.location.latitude),
            parseFloat(p.location.longitude),
          ];
        }
        return null;
      })
      .filter(v => v !== null);

    // If valid features found, apply clustering
    let clusters = [];
    if (featureSet.length > 0) {
      const k = 3; // Number of clusters
      const kmeansResult = KMeans(featureSet, k);
      clusters = kmeansResult.clusters;
    }

    // Attach cluster info along with name, description, and other details to each property
    const clusteredProperties = properties.map((property, index) => ({
      ...property.toObject(),
      cluster: clusters[index] !== undefined ? clusters[index] : -1,
      name: property.name,
      description: property.description,
    }));

    res.json(clusteredProperties);
  } catch (error) {
    console.error('Clustering error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get single property
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Not Found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a new property
exports.createProperty = async (req, res) => {
  try {
    const newProperty = new Property(req.body);
    const savedProperty = await newProperty.save();
    res.status(201).json(savedProperty);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update a property
exports.updateProperty = async (req, res) => {
  try {
    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedProperty);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete a property
exports.deleteProperty = async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
