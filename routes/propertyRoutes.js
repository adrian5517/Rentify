const express = require('express');
const {
  createProperty,      // Make sure createProperty is correctly listed here
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty
} = require('../controllers/propertyController');  // Check this path to make sure it's correct

const router = express.Router();

// Define routes here
router.post('/', createProperty);
router.get('/', getAllProperties);
router.get('/:id', getPropertyById);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);

module.exports = router;
