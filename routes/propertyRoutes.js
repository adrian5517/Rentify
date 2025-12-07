const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const controller = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', controller.getAllProperties);
router.get('/search', controller.searchProperties); // Must be before /:id

// Protected user properties route (controller enforces auth/ownership)
router.get('/user/:userId', protect, controller.getPropertiesByUser);

router.get('/:id', controller.getPropertyById);

// Protected routes (require authentication)
router.post('/', protect, upload.array('images', 5), controller.createProperty);
router.put('/:id', protect, controller.updateProperty);
router.delete('/:id', protect, controller.deleteProperty);

module.exports = router;
