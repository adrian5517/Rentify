const User = require('../models/usersModel');

const jwt = require('jsonwebtoken');


//Get users



const registerUser = async (req, res) => {
    const { username, email, password, phoneNumber, role } = req.body;

    try {
        // Server-side password policy:
        // - Minimum length: 8
        // - At least one uppercase letter
        // - At least one number
        // - At least one symbol (non-alphanumeric)
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: 'Password does not meet complexity requirements. It must be at least 8 characters long and include at least one uppercase letter, one number, and one symbol.'
            });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ message: 'Username already exists' });

        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

        const newUser = new User({
            username,
            email,
            password,
            phoneNumber,
            role,
            profilePicture
        });

        await newUser.save();

        const token = newUser.generateAuthToken();

        // Don't send password in response
        const userResponse = {
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
            profilePicture: newUser.profilePicture,
            address: newUser.address,
            role: newUser.role,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt
        };

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: userResponse,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('Login attempt with email:', email);
        
        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('User not found with email:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('Comparing passwords...');
        const isPasswordMatch = await user.comparePassword(password);
        console.log('Password match:', isPasswordMatch);

        if (!isPasswordMatch) {
            console.log('Password does not match for email:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = user.generateAuthToken();
        
        // Don't send password in response
        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            profilePicture: user.profilePicture,
            address: user.address,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.status(200).json({ 
            message: 'Login Successful', 
            token, 
            user: userResponse 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error Logging in', error: error.message });
    }
};

const authMiddleware = async (req, res, next) => {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) return res.status(401).json({ message: 'User not found' });
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized', error: error.message });
    }
};

const logoutUser = async (req, res) => {
    try {
        res.clearCookie('token');
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error: error.message });
    }
};

const streamifier = require('streamifier');
const cloudinary = require('../cloudinary');

function uploadBufferToCloudinary(buffer, folder = 'rentify/profiles') {
    return new Promise((resolve, reject) => {
        try {
            const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
            streamifier.createReadStream(buffer).pipe(stream);
        } catch (err) {
            reject(err);
        }
    });
}

const uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.params.userId;
        let { imageUrl } = req.body;

        // If files were uploaded (single-step flow), upload the first file to Cloudinary
        if (req.files && req.files.length > 0) {
            const file = req.files[0];
            try {
                const result = await uploadBufferToCloudinary(file.buffer, 'rentify/profiles');
                imageUrl = result.secure_url || result.url;
            } catch (err) {
                console.error('Cloudinary upload failed:', err);
                return res.status(500).json({ success: false, message: 'Image upload failed', error: String(err.message || err) });
            }
        }

        if (!imageUrl) {
            return res.status(400).json({ 
                success: false,
                message: 'Image URL is required' 
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { profilePicture: imageUrl },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.status(200).json({ success: true, message: 'Profile picture updated successfully', user });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile picture', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.params.userId;
        // Support both naming conventions
        const { 
            fullName, name,
            username, 
            email, 
            address, location,
            phoneNumber, phone,
            bio
        } = req.body;

        console.log('=== UPDATE PROFILE REQUEST ===');
        console.log('User ID from params:', userId);
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        if (!userId) {
            console.log('ERROR: userId is missing');
            return res.status(400).json({ 
                success: false,
                message: 'User ID is required' 
            });
        }

        // Check if userId is a valid ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('ERROR: Invalid userId format');
            return res.status(400).json({ 
                success: false,
                message: 'Invalid User ID format' 
            });
        }

        // Verify user exists first
        const existingUser = await User.findById(userId);
        console.log('Existing user found:', existingUser ? 'Yes' : 'No');
        
        if (!existingUser) {
            console.log('ERROR: User not found in database');
            return res.status(404).json({ 
                success: false,
                message: 'User not found'
            });
        }

        console.log('Current user data:', {
            username: existingUser.username,
            email: existingUser.email,
            fullName: existingUser.fullName,
            phoneNumber: existingUser.phoneNumber,
            address: existingUser.address
        });

        // Check if email already exists (if email is being changed)
        if (email && email !== existingUser.email) {
            const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
            if (existingEmail) {
                console.log('ERROR: Email already exists');
                return res.status(400).json({ 
                    success: false,
                    message: 'Email already exists' 
                });
            }
        }

        // Check if username already exists (if username is being changed)
        if (username && username !== existingUser.username) {
            const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUsername) {
                console.log('ERROR: Username already exists');
                return res.status(400).json({ 
                    success: false,
                    message: 'Username already exists' 
                });
            }
        }

        const updateData = {};
        // Map both naming conventions to database fields
        if (fullName !== undefined || name !== undefined) updateData.fullName = fullName || name;
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (address !== undefined || location !== undefined) updateData.address = address || location;
        if (phoneNumber !== undefined || phone !== undefined) updateData.phoneNumber = phoneNumber || phone;
        if (bio !== undefined) updateData.bio = bio;

        console.log('Update data to be applied:', JSON.stringify(updateData, null, 2));

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        console.log('Updated user:', user ? 'Success' : 'Failed');
        console.log('=== UPDATE COMPLETE ===');

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('=== UPDATE PROFILE ERROR ===');
        console.error('Error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating profile', 
            error: error.message 
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: 'User ID is required' 
            });
        }

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.status(200).json({ 
            success: true,
            user 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error fetching user', 
            error: error.message 
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ 
            success: true,
            count: users.length,
            users 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error fetching users', 
            error: error.message 
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    authMiddleware,
    uploadProfilePicture,
    updateProfile,
    getUserById,
    getAllUsers
};