const express = require('express');
const multer = require('multer');
const {getMessages, sendMessage} = require('../controllers/messageController');
const Message = require('../models/messageModel');

const router = express.Router();

//multer Temp Storage
const upload = multer ({ dest: 'temp/' });

//Send Message
router.post('/send', upload.array('images'), sendMessage);

//get Messages
router.get("/:userId1/:otherUserId", getMessages);

//Delete Message
router.delete("/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;