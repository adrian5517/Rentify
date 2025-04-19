const express = require('express');
const router = express.Router();
const { createUser, getUsers, getUserById, updateUser, deleteUser, loginUser } = require('../controllers/userController');
// const auth = require('../middleware/authMiddleware');  // Protect routes that need authentication



// Protected routes (Requires Authentication)
router.get('/',  getUsers);  // Get all users
router.get('/:id', getUserById);  // Get user by ID
router.put('/:id', updateUser);  // Update user details
router.delete('/:id', deleteUser);  // Delete user

module.exports = router;
