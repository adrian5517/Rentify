// Payments feature removed — routes intentionally disabled.
const express = require('express');
const router = express.Router();

// All payment endpoints return 410 Gone to indicate the feature was removed.
router.all('*', (req, res) => {
	res.status(410).json({ success: false, message: 'Payments feature removed' });
});

module.exports = router;
