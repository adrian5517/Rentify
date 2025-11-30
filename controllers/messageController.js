const Message = require('../models/messageModel');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

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

// Get conversation summaries for authenticated user
exports.getConversations = async (req, res) => {
    try {
        // Use authenticated user id from protect middleware
        const userId = new mongoose.Types.ObjectId(req.user && (req.user._id || req.user.id));

        // Pagination params
        const rawLimit = parseInt(req.query.limit, 10);
        const rawSkip = parseInt(req.query.skip, 10);
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
        const skip = Number.isInteger(rawSkip) && rawSkip >= 0 ? rawSkip : 0;

        const pipeline = [
            { $match: { $or: [ { sender: userId }, { receiver: userId } ] } },
            { $addFields: { otherUserId: { $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender'] } } },
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: '$otherUserId',
                lastMessage: { $first: '$$ROOT' },
                unreadCount: { $sum: { $cond: [ { $and: [ { $eq: ['$receiver', userId] }, { $eq: ['$read', false] } ] }, 1, 0 ] } },
                totalMessages: { $sum: 1 }
            }},
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'participant' } },
            { $unwind: { path: '$participant', preserveNullAndEmptyArrays: true } },
            { $project: {
                _id: 0,
                participant: { _id: '$participant._id', fullName: '$participant.fullName', username: '$participant.username', email: '$participant.email', profilePicture: '$participant.profilePicture' },
                lastMessage: {
                    _id: '$lastMessage._id',
                    sender: '$lastMessage.sender',
                    receiver: '$lastMessage.receiver',
                    message: '$lastMessage.message',
                    imageUrls: '$lastMessage.imageUrls',
                    read: '$lastMessage.read',
                    createdAt: '$lastMessage.createdAt'
                },
                unreadCount: 1,
                totalMessages: 1,
                lastMessageAt: '$lastMessage.createdAt'
            }},
            { $sort: { lastMessageAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ];

        const conversations = await Message.aggregate(pipeline).allowDiskUse(true);
        return res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return res.status(500).json({ error: 'Failed to fetch conversations', details: error.message });
    }
}


