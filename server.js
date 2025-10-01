require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const messageRoute = require('./routes/messageRoutes');
const Message = require('./models/messageModel');

// Cloudinary setup
const cloudinary = require('./cloudinary');
const upload = require('./middleware/uploadMiddleware'); // uses memoryStorage

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server,{
  cors: { origin: '*'}
})

// Store online users
const onlineUsers = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Import Routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');

const { protect } = require('./middleware/authMiddleware');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use("/api/messages", messageRoute);


// Example protected route
app.get('/profile', protect, (req, res) => {
  res.json(req.user); // User info from token
});

// Cloudinary upload endpoint
app.post('/upload', upload.array('propertyImage' , 5), async (req, res) => {
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
mongoose
  .connect(DB_URI, {})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });


// Socket.io setup
io.on('connection', (socket)=>{
  console.log("User connected:", socket.id)

  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
  })
  socket.on("private-message", async ({senderId, receiverId, text, images})=>{
    try {
      const newMessage = await Message.create({
        sender: senderId,
        receiver: receiverId,
        message: text,
        imageUrls: images || [],
      })

      const receiverSocketId = onlineUsers.get(receiverId);
      if(receiverSocketId){
        io.to(receiverSocketId).emit("private-message", newMessage)
      }
      
    } catch (error) {
      console.error("Error handling private-message:", error);
    }
  })

  socket.on("disconnect",()=>{
    console.log("User disconnected:", socket.id)
    for( let [userId , socketId] of onlineUsers){
      if(socketId === socket.id){
        onlineUsers.delete(userId);
        break;
      }
    }
  })
})