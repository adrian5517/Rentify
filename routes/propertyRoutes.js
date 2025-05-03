const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const controller = require('../controllers/propertyController');

router.get('/', controller.getAllProperties);
router.get('/:id', controller.getPropertyById);
router.post('/', upload.array('images', 5), controller.createProperty);
router.put('/:id', controller.updateProperty);
router.delete('/:id', controller.deleteProperty);

module.exports = router;
