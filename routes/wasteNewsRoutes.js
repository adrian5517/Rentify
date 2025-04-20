const express = require('express');
const router = express.Router();
const {
  createWasteNews,
  getWasteNews,
  getSingleWasteNews,
  updateWasteNews,
  deleteWasteNews
} = require('../controllers/wasteNewsController');

// Routes
router.post('/', createWasteNews);              // Create
router.get('/', getWasteNews);                  // Read all
router.get('/:id', getSingleWasteNews);         // Read single
router.put('/:id', updateWasteNews);            // Update
router.delete('/:id', deleteWasteNews);         // Delete

module.exports = router;
