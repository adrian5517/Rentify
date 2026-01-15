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


// Protected routes (require authentication)
router.post('/', protect, upload.array('images', 5), controller.createProperty);
router.put('/:id', protect, controller.updateProperty);
router.delete('/:id', protect, controller.deleteProperty);

// Verification PoC routes
// Verification PoC routes
router.post('/:id/verification/docs', protect, upload.array('docs', 5), controller.uploadVerificationDocuments);
router.post('/:id/verification/submit', protect, controller.submitVerification);

// Admin routes for verification management
router.get('/admin/pending', protect, controller.adminListPending);
router.get('/admin/verified', protect, controller.adminListByStatus);
router.get('/admin/rejected', protect, controller.adminListByStatus);
router.post('/admin/:id/verify', protect, controller.adminVerify);
router.post('/admin/:id/reject', protect, controller.adminReject);

// Dynamic property by id (placed after admin/static routes to avoid shadowing)
router.get('/:id', controller.getPropertyById);

module.exports = router;
