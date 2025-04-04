const mongoose = require('mongoose');

// Define the booking schema
const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    name: {
      type: String,
      required: true, // Booking name or user's name or reference name
    },
    description: {
      type: String, // Optional details about the booking
    },
    address: {
      type: String, // Property address
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Optional: Add indexes for performance
bookingSchema.index({ userId: 1 });
bookingSchema.index({ propertyId: 1 });

// Export the Booking model
module.exports = mongoose.model('Booking', bookingSchema);
