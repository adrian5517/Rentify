const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const controller = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');
const Property = require('../models/propertyModel');

// Public routes
router.get('/', controller.getAllProperties);
router.get('/search', controller.searchProperties); // Must be before /:id

// GET /api/properties/user/:userId - protected, returns only user-owned properties
router.get('/user/:userId', protect, async (req, res) => {
	const { userId } = req.params;

	// Only allow the authenticated user to fetch their own listings (admins allowed)
	if (String(req.user._id) !== String(userId) && req.user.role !== 'admin') {
		return res.status(403).json({ message: 'Forbidden' });
	}

	try {
		// Query common owner fields
		const properties = await Property.find({
			$or: [
				{ createdBy: userId },
				{ postedBy: userId },
				{ 'owner.id': userId } // legacy shape
			]
		}).sort({ createdAt: -1 });

		// Ensure responses are not cached by intermediaries
		res.set('Cache-Control', 'private, no-store, max-age=0');
		res.set('Surrogate-Control', 'no-store');

		res.json(properties);
	} catch (err) {
		console.error('Failed to fetch user properties:', err);
		res.status(500).json({ message: 'Server error' });
	}
});

router.get('/:id', controller.getPropertyById);

// Protected routes (require authentication)
router.post('/', protect, upload.array('images', 5), controller.createProperty);
router.put('/:id', protect, controller.updateProperty);

// DELETE /api/properties/:id - protected with ownership/admin check
router.delete('/:id', protect, async (req, res) => {
	try {
		const prop = await Property.findById(req.params.id);
		if (!prop) return res.status(404).json({ message: 'Property not found' });

		// Resolve owner id from multiple fields
		const ownerId = prop.createdBy || prop.postedBy || (prop.owner && prop.owner.id);
		if (String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
			return res.status(403).json({ message: 'Not authorized to delete this property' });
		}

		await prop.remove();
		res.json({ message: 'Property deleted' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Server error' });
	}
});

module.exports = router;
