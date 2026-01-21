const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  startDate: { type: Date },
  endDate: { type: Date },
  rentAmount: { type: Number },
  currency: { type: String, default: 'PHP' },
  status: { type: String, enum: ['draft','pending','active','cancelled','completed'], default: 'draft' },
  documents: [{ filename: String, url: String, public_id: String, uploaded_at: Date }],
  notes: { type: String },
  // Acceptance records from owner and renter
  ownerAccepted: { accepted: { type: Boolean, default: false }, at: Date, signature: { name: String, ip: String, userAgent: String } },
  renterAccepted: { accepted: { type: Boolean, default: false }, at: Date, signature: { name: String, ip: String, userAgent: String } },
  // Payment linkage
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  // Payment schedule for installment payments
  paymentSchedule: [{ dueDate: Date, amount: Number, status: { type: String, enum: ['due','paid','overdue'], default: 'due' }, payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' } }],
  securityDeposit: { type: Number },
  totalAmount: { type: Number },
  history: [{ action: String, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date, notes: String }],
}, { timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);
