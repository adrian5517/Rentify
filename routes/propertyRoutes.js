const express = require('express');
const multer = require('multer');
const { createProperty, getAllProperties, getPropertyById, updateProperty, deleteProperty } = require('../controllers/propertyController');
const router = express.Router();

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Route to create a new property
router.post('/', upload.array('images', 5), createProperty);

// Route to get all properties
router.get('/', getAllProperties);

// Route to get a specific property by ID
router.get('/:id', getPropertyById);

// Route to update a property by ID
router.put('/:id', upload.array('images', 5), updateProperty);

// Route to delete a property by ID
router.delete('/:id', deleteProperty);

module.exports = router;
