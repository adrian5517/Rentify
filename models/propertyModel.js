const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  images: [String], // Array of image URLs
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model (assuming you have a User model)
    required: true, // You can set this to true if every property must have an owner
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
