const User = require('../models/usersModel');

const jwt = require('jsonwebtoken');


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

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: newUser,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = user.generateAuthToken();
        res.status(200).json({ message: 'Login Successful', token, user });
    } catch (error) {
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

const getUsers = async (req, res) => {
    try {
        const { search, role, limit = 50, page = 1 } = req.query;
        
        // Build query object
        const query = {};
        
        // Search filter - search in username, email, or fullName
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Role filter
        if (role) {
            query.role = role;
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Fetch users with pagination
        const users = await User.find(query)
            .select('-password') // Exclude password field
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });
        
        // Get total count for pagination
        const totalUsers = await User.countDocuments(query);
        
        res.status(200).json({
            users,
            pagination: {
                total: totalUsers,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalUsers / parseInt(limit))
            }
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
    getUsers
};