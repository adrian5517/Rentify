const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'PHP' },
  status: { type: String, enum: ['pending','succeeded','failed','refunded'], default: 'pending' },
  provider: { type: String },
  provider_id: { type: String },
  metadata: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
