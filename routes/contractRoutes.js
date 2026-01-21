const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractController');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, controller.createContract);
router.get('/user/:userId', protect, controller.listContractsByUser);
router.get('/:id', protect, controller.getContract);
router.put('/:id', protect, controller.updateContract);
router.post('/:id/docs', protect, upload.array('docs', 5), controller.uploadContractDocument);
router.post('/:id/accept', protect, controller.acceptContract);
const pdfController = require('../controllers/pdfController')
router.get('/:id/pdf', protect, pdfController.generateContractPdf);
router.post('/:id/cancel', protect, controller.cancelContract);
router.get('/property/:propertyId', protect, controller.listContractsByProperty);
// Current user contracts
router.get('/me', protect, controller.listContractsByUser);

module.exports = router;
