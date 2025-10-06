const Message = require('../models/messageModel');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


exports.sendMessage = async (req, res)=>{
    try {
        const { senderId, receiverId, text } = req.body;
        const files = req.files || [];

        let imageUrls = [];

        // upload up to 5 images if files exist
        if (files && files.length > 0) {
            for (let i = 0; i < Math.min(files.length, 5); i++) {
                const uploadRes = await cloudinary.uploader.upload(files[i].path, 
                    {folder : 'ChatImages'});
                imageUrls.push(uploadRes.secure_url);
            }
        }
        
        const newMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            message: text || '',
            imageUrls : imageUrls
        })

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
}

exports.getMessages = async (req , res)=>{
    try {
        const { userId1 , otherUserId} = req.params;
        const message = await Message.find({
            $or:[
                { sender: userId1, receiver: otherUserId },
                { sender: otherUserId, receiver: userId1 }
            ],
        }).sort({ createdAt: 1 }); // Sort by creation time ascending

        res.status(200).json(message);
        
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

exports.markMessagesAsRead = async (req, res) => {
    try {
        const { userId, otherUserId } = req.body;

        // Mark all messages from otherUserId to userId as read
        const result = await Message.updateMany(
            {
                sender: otherUserId,
                receiver: userId,
                read: false
            },
            {
                $set: { read: true }
            }
        );

        res.status(200).json({ 
            message: 'Messages marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
}


