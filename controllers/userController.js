const User = require('../models/usersModel');


// Create new user
const createUser = async (req, res) => {
    try {
        const { fullName, username, email, password, phoneNumber, address, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const newUser = new User({
            fullName,
            username,
            email,
            password,
            phoneNumber,
            address,
            role
        });

        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all users
const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user fields
        const { fullName, username, email, phoneNumber, address, role } = req.body;
        user.fullName = fullName || user.fullName;
        user.username = username || user.username;
        user.email = email || user.email;
        user.phoneNumber = phoneNumber || user.phoneNumber;
        user.address = address || user.address;
        user.role = role || user.role;

        await user.save();
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};



module.exports = {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
};
