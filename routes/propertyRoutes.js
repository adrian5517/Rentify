const express = require('express');
const router = express.Router();
// NOTE: adjust these relative paths when you paste into your server repo
const upload = require('../middleware/uploadMiddleware');
const controller = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', controller.getAllProperties);
router.get('/search', controller.searchProperties); // keep before /:id

// Protected user properties route
router.get('/user/:userId', protect, controller.getPropertiesByUser);

router.get('/:id', controller.getPropertyById);

// Protected routes (require authentication)
router.post('/', protect, upload.array('images', 5), controller.createProperty);
router.put('/:id', protect, controller.updateProperty);
router.delete('/:id', protect, controller.deleteProperty);

module.exports = router;
