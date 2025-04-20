const mongoose = require('mongoose');

const wasteNewsSchema = new mongoose.Schema({
  title: String,
  content: String,
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WasteNews', wasteNewsSchema);