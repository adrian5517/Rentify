const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true  // Set name as required
  },
  description: { 
    type: String,
    required: true // Set description as required
  },
  images: [{ 
    type: String, 
    required: true  // Ensure at least one image is provided
  }],
  location: {
    address: { 
      type: String, 
      required: true  // Make address required
    },
    latitude: { 
      type: Number, 
      required: true  // Ensure latitude is provided
    },
    longitude: { 
      type: Number, 
      required: true  // Ensure longitude is provided
    }
  },
  price: { 
    type: Number, 
    required: true  // Make price a required field
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'room', 'other'],
    default: 'other'
  },
  postedBy: { 
    type: String,
    required: true  // Ensure postedBy is provided (optional or required depending on your app)
  },
  amenities: [{ 
    type: String, 
    required: true  // At least one amenity should be included
  }],
  status: {
    type: String,
    enum: ['available', 'rented', 'sold', 'fully booked'],
    default: 'available'
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true  // Ensure createdBy is always set (referencing the user who created the listing)
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Property', propertySchema);
