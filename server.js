require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require("node-cron");
const cors = require('cors'); // Optional: for frontend connection
// const { protect } = require('./middleware/authMiddleware');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

// Initialize Express App
const app = express();

// Middleware
app.use(cors()); // Optional: allow frontend connection
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cron Job Example (runs every 15 mins)
const job = cron.schedule("*/15 * * * *", () => {
  console.log("Cron job executed: Running every 15 minutes.");
}, { scheduled: false });

job.start();

// Check for required environment variables
if (!process.env.DB_URI || !process.env.PORT || !process.env.JWT_SECRET) {
  console.error("❌ Error: Missing environment variables (DB_URI, PORT, or JWT_SECRET)");
  process.exit(1);
}

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/booking', bookingRoutes);

// Connect to MongoDB and Start Server
mongoose.connect(process.env.DB_URI, {
  
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
});
