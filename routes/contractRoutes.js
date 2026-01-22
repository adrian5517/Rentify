const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractController');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, controller.createContract);
router.get('/user/:userId', protect, controller.listContractsByUser);
// Current user contracts - must be declared before '/:id' to avoid 'me' being treated as an id
router.get('/me', protect, controller.listContractsByUser);

router.get('/:id', protect, controller.getContract);
router.put('/:id', protect, controller.updateContract);
router.post('/:id/docs', protect, upload.array('docs', 5), controller.uploadContractDocument);
router.post('/:id/accept', protect, controller.acceptContract);
router.post('/:id/propose-edit', protect, controller.proposeContractEdit);
router.get('/property/:propertyId', protect, controller.listContractsByProperty);
// (other routes remain)

const pdfController = require('../controllers/pdfController')
// Restore protected PDF route
router.get('/:id/pdf', protect, pdfController.generateContractPdf);

module.exports = router;
