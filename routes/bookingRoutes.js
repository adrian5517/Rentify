const express = require('express');
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  deleteBooking
} = require('../controllers/bookingController');

const router = express.Router();

// Optional: Middleware to protect routes
// const { protect } = require('../middleware/authMiddleware');

// Routes
router.post('/',  createBooking);               // Create a new booking
router.get('/',  getBookings);                  // Get all bookings for the logged-in user
router.get('/:id',  getBookingById);            // Get a single booking by ID
router.put('/:id',  updateBooking);             // Update a booking
router.patch('/:id/cancel',  cancelBooking);    // Cancel a booking (better as PATCH for status update)
router.delete('/:id',  deleteBooking);          // Delete a booking

module.exports = router;
