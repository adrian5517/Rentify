const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const upload = require('../middleware/uploadMiddleware');

// Routes
router.get('/', propertyController.getAllProperties);
router.get('/:id', propertyController.getPropertyById);
router.post('/', upload.array('images', 5), propertyController.createProperty); // max 5 images
router.put('/:id', propertyController.updateProperty);
router.delete('/:id', propertyController.deleteProperty);

module.exports = router;
