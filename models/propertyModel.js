const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  images: [{ type: String }],
  location: {
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  price: { type: Number },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'room', 'dorm', 'boarding house', 'other'],
    default: 'other'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amenities: [{ type: String }], // ✅ changed from String to Array of Strings
  status: {
    type: String,
    enum: ['available', 'For rent', 'For sale', 'fully booked'],
    default: 'available'
  },
  rating:{
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  phoneNumber:{ type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Property', propertySchema);
