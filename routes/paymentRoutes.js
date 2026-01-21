const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, controller.createPaymentRecord);
router.post('/create-intent', protect, controller.createPaymentIntent);
router.post('/fake-pay', protect, controller.createFakePayment);
router.get('/user/:userId', protect, controller.listPaymentsByUser);
router.get('/:id', protect, controller.getPayment);
// webhook (no auth) - use raw body for stripe signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), controller.stripeWebhook);

module.exports = router;
