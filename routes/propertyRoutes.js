const {createProperty,
    getAllProperties,
    getPropertyById,
    deleteProperty,
    uploadImages} = require('../controllers/propertyController')
const express = require('express')

const router = express.Router();

router.post('/' , createProperty);
router.get('/:id' , getPropertyById);
router.get('/',getAllProperties);
router.delete('/:id', deleteProperty);
router.post('/upload',uploadImages);

module.exports = router;
