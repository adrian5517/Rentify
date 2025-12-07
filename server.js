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

// ❌ REMOVE old socket.io here
// const io = new Server(server,{ cors: { origin: '*' }});

// Store online users
const onlineUsers = new Map();

// Middleware
const allowedOrigins = [
  'https://rentify-web-beta.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
// Prevent caching on API endpoints that require auth
app.use((req, res, next) => {
  // Only apply to API paths or specifically to /api/properties/user
  if (req.path.startsWith('/api/properties/user') || (req.path.startsWith('/api/') && req.headers.authorization)) {
    res.set('Cache-Control', 'private, no-store, max-age=0');
    // Some CDNs respect Surrogate-Control
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy violation'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport for social auth
const passport = require('passport');
require('./config/passport')(passport);
app.use(passport.initialize());

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
  res.json(req.user);
});

// Cloudinary upload endpoint
// Upload route (uses routes/upload.js)
const uploadRoute = require('./routes/upload');
app.use('/api/upload', uploadRoute);

// Cron job (every 15 minutes)
cron.schedule('*/15 * * * *', () => {
  console.log('🕒 Cron job executed.');
});

// Load environment variables
const DB_URI = process.env.DB_URI || '';
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!DB_URI || !PORT || !JWT_SECRET) {
  console.error('❌ Missing required env variables.');
  process.exit(1);
}

// MongoDB Connection
mongoose.connect(DB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB error:', err));

// ------------------------------------------
// ✅ FIXED & FINAL SOCKET.IO INITIALIZATION
// ------------------------------------------
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket"],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Online users storage
const onlineUsersMap = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (userId) => {
    onlineUsersMap.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("typing-start", ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsersMap.get(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("typing-start", { senderId });
  });

  socket.on("typing-stop", ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsersMap.get(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("typing-stop", { senderId });
  });

  socket.on("private-message", async ({ senderId, receiverId, text, images }) => {
    try {
      const newMessage = await Message.create({
        sender: senderId,
        receiver: receiverId,
        message: text,
        imageUrls: images || [],
      });

      const receiverSocketId = onlineUsersMap.get(receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit("private-message", newMessage);

    } catch (error) {
      console.error("Error private-message:", error);
    }
  });

  socket.on("mark-as-read", async ({ userId, otherUserId }) => {
    try {
      const result = await Message.updateMany(
        { sender: otherUserId, receiver: userId, read: false },
        { $set: { read: true } }
      );

      const senderSocketId = onlineUsersMap.get(otherUserId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messages-read", {
          readBy: userId,
          count: result.modifiedCount,
        });
      }

    } catch (error) {
      console.error("Error marking messages:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (let [userId, socketId] of onlineUsersMap) {
      if (socketId === socket.id) {
        onlineUsersMap.delete(userId);
        break;
      }
    }
  });
});
