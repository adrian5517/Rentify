const express = require('express');
const router = express.Router();
const Notification = require('../models/notificationModel');
const { protect } = require('../middleware/authMiddleware');

// Get notifications for current user
router.get('/', protect, async (req, res) => {
  try {
    const notes = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: notes.length, notifications: notes });
  } catch (err) {
    console.error('Get notifications error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark a notification read
router.post('/:id/read', protect, async (req, res) => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ success: false, message: 'Not found' });
    if (String(n.user) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    n.read = true; await n.save();
    res.json({ success: true, notification: n });
  } catch (err) {
    console.error('Mark notification read error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
