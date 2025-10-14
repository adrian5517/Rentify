const User = require('../models/usersModel');

const jwt = require('jsonwebtoken');


//Get users



const registerUser = async (req, res) => {
    const { username, email, password, phoneNumber, role } = req.body;

    try {
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

const uploadProfilePicture = async (req, res) => {
    try {
        const { userId, imageUrl } = req.body;

        if (!userId || !imageUrl) {
            return res.status(400).json({ message: 'User ID and image URL are required' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { profilePicture: imageUrl },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'Profile picture updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile picture', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { userId, fullName, username, email, address, phoneNumber } = req.body;

        console.log('=== UPDATE PROFILE REQUEST ===');
        console.log('Received userId:', userId);
        console.log('userId type:', typeof userId);
        console.log('userId length:', userId?.length);
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        if (!userId) {
            console.log('ERROR: userId is missing');
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Check if userId is a valid ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('ERROR: Invalid userId format');
            return res.status(400).json({ message: 'Invalid User ID format' });
        }

        // Verify user exists first
        const existingUser = await User.findById(userId);
        console.log('Existing user found:', existingUser ? 'Yes' : 'No');
        
        if (!existingUser) {
            console.log('ERROR: User not found in database');
            console.log('Searching for user with ID:', userId);
            
            // Let's search for all users to help debug
            const allUsers = await User.find().select('_id username email');
            console.log('All users in database:', JSON.stringify(allUsers, null, 2));
            
            return res.status(404).json({ 
                message: 'User not found',
                searchedId: userId,
                hint: 'Please check the user ID. Use GET /api/auth/users to see all users.'
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
                return res.status(400).json({ message: 'Email already exists' });
            }
        }

        // Check if username already exists (if username is being changed)
        if (username && username !== existingUser.username) {
            const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUsername) {
                console.log('ERROR: Username already exists');
                return res.status(400).json({ message: 'Username already exists' });
            }
        }

        const updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (address !== undefined) updateData.address = address;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

        console.log('Update data to be applied:', JSON.stringify(updateData, null, 2));

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        console.log('Updated user:', user ? 'Success' : 'Failed');
        console.log('=== UPDATE COMPLETE ===');

        res.status(200).json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('=== UPDATE PROFILE ERROR ===');
        console.error('Error:', error);
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ 
            count: users.length,
            users 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
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