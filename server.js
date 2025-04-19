require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require("node-cron");
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { protect } = require('./middleware/authMiddleware');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes')

// Initialize Express App
const app = express();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer Storage Config (for image upload)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Save to uploads directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Use timestamp to avoid filename conflict
  }
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir)); // Serve image uploads from the uploads folder

// Cron Job (example: every 15 minutes)
const job = cron.schedule("*/15 * * * *", () => {
  console.log("🕒 Cron job executed: Running every 15 minutes.");
}, { scheduled: false });

job.start();

// Check environment variables with fallback
const DB_URI = process.env.DB_URI || '';
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!DB_URI || !PORT || !JWT_SECRET) {
  console.error("❌ Error: Missing environment variables (DB_URI, PORT, or JWT_SECRET)");
  process.exit(1);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/property', propertyRoutes); // Should support file upload if needed
app.use('/api/booking', bookingRoutes);
app.use('.api/user' , userRoutes)


// Example protected route
app.get('/profile', protect, (req, res) => {
  res.json(req.user); // user info from token
});


// Example upload route (you can remove this if handled inside propertyRoutes)
app.post('/upload', upload.single('propertyImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.status(200).json({
    message: 'Upload successful',
    fileUrl: `/uploads/${req.file.filename}`
  });
});

// Connect to MongoDB
mongoose.connect(DB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });
