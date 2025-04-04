const { createProperty, getAllProperties, getPropertyById, updateProperty, deleteProperty, uploadImages } = require('../controllers/propertyController');
const express = require('express');
const router = express.Router();

// Temporarily remove the auth middleware here
// const { protect } = require('../middleware/authMiddleware');

// Create property route without auth middleware
router.post('/', uploadImages, createProperty);

// You can add other routes below...
router.get('/', getAllProperties);
router.get('/:id', getPropertyById);
router.put('/:id', uploadImages, updateProperty);
router.delete('/:id', deleteProperty);

module.exports = router;
