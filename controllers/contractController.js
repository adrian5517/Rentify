const Contract = require('../models/contractModel');
const Property = require('../models/propertyModel');

exports.createContract = async (req, res) => {
  try {
    const { propertyId, renterId, startDate, endDate, rentAmount, currency, notes } = req.body;
    if (!propertyId) return res.status(400).json({ success: false, message: 'propertyId is required' });

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const ownerId = property.postedBy || property.createdBy || req.user?.id || req.user?._id;

    const c = await Contract.create({
      property: propertyId,
      owner: ownerId,
      renter: renterId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      rentAmount,
      currency: currency || 'PHP',
      notes,
      status: 'pending',
      history: [{ action: 'created', by: req.user?._id || null, at: new Date(), notes: 'Created' }]
    });

    return res.json({ success: true, contract: c });
  } catch (err) {
    console.error('createContract', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

exports.getContract = async (req, res) => {
  try {
    const id = req.params.id;
    const c = await Contract.findById(id).populate('property owner renter');
    if (!c) return res.status(404).json({ success: false, message: 'Contract not found' });
    return res.json({ success: true, contract: c });
  } catch (err) {
    console.error('getContract', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

exports.listContractsByUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id;
    const contracts = await Contract.find({ $or: [{ owner: userId }, { renter: userId }] }).populate('property owner renter').sort({ createdAt: -1 });
    return res.json({ success: true, contracts });
  } catch (err) {
    console.error('listContractsByUser', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

exports.updateContract = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const c = await Contract.findByIdAndUpdate(id, updates, { new: true });
    if (!c) return res.status(404).json({ success: false, message: 'Contract not found' });
    return res.json({ success: true, contract: c });
  } catch (err) {
    console.error('updateContract', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

exports.uploadContractDocument = async (req, res) => {
  try {
    // Expect upload middleware to provide file info in req.files
    const id = req.params.id;
    const c = await Contract.findById(id);
    if (!c) return res.status(404).json({ success: false, message: 'Contract not found' });

    const files = req.files || [];
    const added = files.map(f => ({ filename: f.originalname, url: f.secure_url || f.path || '', public_id: f.public_id || undefined, uploaded_at: new Date() }));
    c.documents = c.documents.concat(added);
    c.history.push({ action: 'documents_uploaded', by: req.user?._id || null, at: new Date(), notes: '' });
    await c.save();
    return res.json({ success: true, added, contract: c });
  } catch (err) {
    console.error('uploadContractDocument', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

exports.acceptContract = async (req, res) => {
  try {
    const id = req.params.id;
    const c = await Contract.findById(id);
    if (!c) return res.status(404).json({ success: false, message: 'Contract not found' });
    // Determine who is accepting (owner or renter)
    const userId = req.user?._id?.toString();
    const bodySig = req.body.signature || {};
    if (userId === c.owner?.toString()) {
      c.ownerAccepted = c.ownerAccepted || {};
      c.ownerAccepted.accepted = true;
      c.ownerAccepted.at = new Date();
      c.ownerAccepted.signature = { name: bodySig.name || '', ip: req.ip || '', userAgent: req.headers['user-agent'] || '' };
      c.history.push({ action: 'owner_accepted', by: req.user?._id || null, at: new Date(), notes: '' });
    } else if (userId === c.renter?.toString()) {
      c.renterAccepted = c.renterAccepted || {};
      c.renterAccepted.accepted = true;
      c.renterAccepted.at = new Date();
      c.renterAccepted.signature = { name: bodySig.name || '', ip: req.ip || '', userAgent: req.headers['user-agent'] || '' };
      c.history.push({ action: 'renter_accepted', by: req.user?._id || null, at: new Date(), notes: '' });
    } else {
      // admin or third-party acceptance sets status to active
      c.history.push({ action: 'accepted_by_admin', by: req.user?._id || null, at: new Date(), notes: req.body.notes || '' });
    }

    // If both parties accepted, mark contract active
    if (c.ownerAccepted?.accepted && c.renterAccepted?.accepted) {
      c.status = 'active';
      c.history.push({ action: 'activated', by: req.user?._id || null, at: new Date(), notes: 'Both parties accepted' });
    }

    await c.save();
    return res.json({ success: true, contract: c });
  } catch (err) {
    console.error('acceptContract', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

exports.cancelContract = async (req, res) => {
  try {
    const id = req.params.id;
    const c = await Contract.findById(id);
    if (!c) return res.status(404).json({ success: false, message: 'Contract not found' });
    c.status = 'cancelled';
    c.history.push({ action: 'cancelled', by: req.user?._id || null, at: new Date(), notes: req.body.reason || '' });
    await c.save();
    return res.json({ success: true, contract: c });
  } catch (err) {
    console.error('cancelContract', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Add or replace a payment schedule for a contract
exports.addPaymentSchedule = async (req, res) => {
  try {
    const id = req.params.id;
    const { schedule, securityDeposit, totalAmount } = req.body;
    const c = await Contract.findById(id);
    if (!c) return res.status(404).json({ success: false, message: 'Contract not found' });

    if (!Array.isArray(schedule) || schedule.length === 0) return res.status(400).json({ success: false, message: 'schedule array is required' });

    c.paymentSchedule = schedule.map(item => ({ dueDate: item.dueDate ? new Date(item.dueDate) : null, amount: item.amount || 0, status: 'due' }));
    if (securityDeposit) c.securityDeposit = securityDeposit;
    if (totalAmount) c.totalAmount = totalAmount;
    c.history.push({ action: 'payment_schedule_added', by: req.user?._id || null, at: new Date(), notes: '' });
    await c.save();
    return res.json({ success: true, contract: c });
  } catch (err) {
    console.error('addPaymentSchedule', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Record a payment against a contract (links Payment to schedule)
exports.recordPaymentAgainstContract = async (req, res) => {
  try {
    const id = req.params.id;
    const { paymentId, scheduleIndex } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, message: 'paymentId is required' });
    const c = await Contract.findById(id);
    if (!c) return res.status(404).json({ success: false, message: 'Contract not found' });

    // Link payment to contract payments array
    c.payments = c.payments || [];
    if (!c.payments.find(p => p.toString() === paymentId)) c.payments.push(paymentId);

    // If scheduleIndex provided, link to that schedule item
    if (typeof scheduleIndex === 'number' && c.paymentSchedule && c.paymentSchedule[scheduleIndex]) {
      c.paymentSchedule[scheduleIndex].payment = paymentId;
      c.paymentSchedule[scheduleIndex].status = 'paid';
    }

    c.history.push({ action: 'payment_recorded', by: req.user?._id || null, at: new Date(), notes: `Payment ${paymentId} recorded` });
    await c.save();
    return res.json({ success: true, contract: c });
  } catch (err) {
    console.error('recordPaymentAgainstContract', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// List contracts for a specific property
exports.listContractsByProperty = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    if (!propertyId) return res.status(400).json({ success: false, message: 'propertyId is required' });
    const contracts = await Contract.find({ property: propertyId }).populate('property owner renter payments').sort({ createdAt: -1 });
    return res.json({ success: true, contracts });
  } catch (err) {
    console.error('listContractsByProperty', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
