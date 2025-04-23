const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  location: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  price: { type: Number, required: true },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'room', 'other'],
    default: 'other'
  },
  postedBy: { type: String, required: true },
  amenities: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Property', propertySchema);
