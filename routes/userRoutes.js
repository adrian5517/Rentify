const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateUser, deleteUser } = require('../controllers');
const auth = require('../middleware/authMiddleware');  // Protect routes that need authentication



// Protected routes (Requires Authentication)
router.get('/', auth, getUsers);  // Get all users
router.get('/:id', auth, getUserById);  // Get user by ID
router.put('/:id', auth, updateUser);  // Update user details
router.delete('/:id', auth, deleteUser);  // Delete user

module.exports = router;
