const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: { type: String,  },
  description: { type: String },
  images: [{ type: String }],
  location: {
    address: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  price: { type: Number, required: true },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'room', 'other'],
    default: 'other'
  },
  postedBy: { type: String,  },
  amenities: [{ type: String }],
  status: {
    type: String,
    enum: ['available', 'rented', 'sold', 'fully booked'],
    default: 'available'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Property', propertySchema);
