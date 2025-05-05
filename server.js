require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');

<<<<<<< HEAD
// Cloudinary setup
const cloudinary = require('./cloudinary');
const upload = require('./middleware/uploadMiddleware'); // uses memoryStorage

// Initialize Express app
const app = express();

=======
// Initialize Express app
const app = express();

// Define uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup for single file upload (for demo route)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

>>>>>>> 7912d5003b2049933d0c1e2b15ed1218058971b2
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
<<<<<<< HEAD

=======
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


>>>>>>> 7912d5003b2049933d0c1e2b15ed1218058971b2
// Import Routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const { protect } = require('./middleware/authMiddleware');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
<<<<<<< HEAD
app.use('/api/bookings', bookingRoutes); // Added missing booking routes
=======
>>>>>>> 7912d5003b2049933d0c1e2b15ed1218058971b2

// Example protected route
app.get('/profile', protect, (req, res) => {
  res.json(req.user); // User info from token
});

<<<<<<< HEAD
// Cloudinary upload endpoint
app.post('/upload', upload.single('propertyImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Convert buffer to base64
    const base64Str = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Str, {
      folder: 'properties', // optional
    });

    res.status(200).json({
      message: 'Upload successful',
      fileUrl: result.secure_url,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
=======
// Example upload endpoint (can be removed if not needed)
app.post('/upload', upload.single('propertyImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
>>>>>>> 7912d5003b2049933d0c1e2b15ed1218058971b2
  }
});

// Cron job (every 15 minutes)
const job = cron.schedule('*/15 * * * *', () => {
  console.log('🕒 Cron job executed: Running every 15 minutes.');
});
job.start();

// Load environment variables
const DB_URI = process.env.DB_URI || '';
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!DB_URI || !PORT || !JWT_SECRET) {
  console.error('❌ Error: Missing required environment variables.');
  process.exit(1);
}

// MongoDB Connection and Server Start
<<<<<<< HEAD
mongoose
  .connect(DB_URI, {})
=======
mongoose.connect(DB_URI)
>>>>>>> 7912d5003b2049933d0c1e2b15ed1218058971b2
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });