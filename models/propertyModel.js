const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: {
    type: String,required: true, // Property name
    
  },
  address: {
    type: String, required: true, // Property address
    
  },
  price: {
    type: Number, required: true, // Property price per night
    
  },
  description: {
    type: String,required: true, // Property description
    
  },
  images: [String], // Array of image URLs
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model (assuming you have a User model) // You can set this to true if every property must have an owner
    required: true, // Owner ID is required
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
