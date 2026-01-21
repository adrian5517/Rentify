const Payment = require('../models/paymentModel');
const Contract = require('../models/contractModel');
const stripeSecret = process.env.STRIPE_SECRET || '';
let stripe = null;
if (stripeSecret) {
  try { stripe = require('stripe')(stripeSecret) } catch (e) { console.warn('Stripe not configured:', e.message) }
}

exports.createPaymentRecord = async (req, res) => {
  try {
    const { contractId, amount, currency, provider, provider_id, metadata } = req.body;
    if (!contractId || !amount) return res.status(400).json({ success: false, message: 'contractId and amount are required' });
    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const payment = await Payment.create({
      contract: contractId,
      property: contract.property,
      payer: req.user?._id,
      payee: contract.owner,
      amount,
      currency: currency || 'PHP',
      status: 'pending',
      provider,
      provider_id,
      metadata
    });

    return res.json({ success: true, payment });
  } catch (err) {
    console.error('createPaymentRecord', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

exports.getPayment = async (req, res) => {
  try {
    const id = req.params.id;
    const p = await Payment.findById(id).populate('contract property payer payee');
    if (!p) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.json({ success: true, payment: p });
  } catch (err) {
    console.error('getPayment', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

exports.listPaymentsByUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id;
    const payments = await Payment.find({ $or: [{ payer: userId }, { payee: userId }] }).populate('contract property payer payee').sort({ createdAt: -1 });
    return res.json({ success: true, payments });
  } catch (err) {
    console.error('listPaymentsByUser', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Webhook / provider callback to update payment status (simple generic handler)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { provider_id, status } = req.body;
    if (!provider_id) return res.status(400).json({ success: false, message: 'provider_id is required' });
    const p = await Payment.findOne({ provider_id });
    if (!p) return res.status(404).json({ success: false, message: 'Payment not found' });
    p.status = status || p.status;
    await p.save();
    return res.json({ success: true, payment: p });
  } catch (err) {
    console.error('updatePaymentStatus', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Create a Stripe PaymentIntent and local Payment record
exports.createPaymentIntent = async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ success: false, message: 'Stripe not configured on server' });
    const { contractId, amount, currency } = req.body;
    if (!contractId || !amount) return res.status(400).json({ success: false, message: 'contractId and amount are required' });
    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    // Create local payment record (pending)
    const payment = await Payment.create({
      contract: contractId,
      property: contract.property,
      payer: req.user?._id,
      payee: contract.owner,
      amount,
      currency: currency || 'PHP',
      status: 'pending',
      provider: 'stripe'
    });

    // Stripe expects amount in smallest currency unit (cents)
    const amountInt = Math.round(Number(amount) * 100);
    const pi = await stripe.paymentIntents.create({
      amount: amountInt,
      currency: (currency || 'php').toLowerCase(),
      metadata: { paymentId: payment._id.toString(), contractId: contractId.toString() }
    });

    // store provider id
    payment.provider_id = pi.id;
    await payment.save();

    return res.json({ success: true, clientSecret: pi.client_secret, payment });
  } catch (err) {
    console.error('createPaymentIntent', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Fake payment endpoint for testing without Stripe
exports.createFakePayment = async (req, res) => {
  try {
    const { contractId, amount, currency } = req.body;
    if (!contractId || !amount) return res.status(400).json({ success: false, message: 'contractId and amount are required' });
    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    // Create local payment record and immediately mark as succeeded for fake payments
    const payment = await Payment.create({
      contract: contractId,
      property: contract.property,
      payer: req.user?._id,
      payee: contract.owner,
      amount,
      currency: currency || 'PHP',
      status: 'succeeded',
      provider: 'fake',
      provider_id: `fake_${Date.now()}`
    });

    // Optionally, record contract/payment history (if contract model expects it)
    try {
      if (contract) {
        contract.history = contract.history || [];
        contract.history.push({ action: 'payment_received', amount, by: req.user?._id, date: new Date() });
        await contract.save();
      }
    } catch (e) {
      // non-fatal
      console.warn('Failed to append contract history for fake payment', e.message || e);
    }

    return res.json({ success: true, payment });
  } catch (err) {
    console.error('createFakePayment', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Stripe webhook handler: verifies signature and updates Payment status
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!stripe || !webhookSecret) {
    console.warn('Stripe or webhook secret not configured');
    return res.status(400).send('Stripe not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const providerId = pi.id;
        const payment = await Payment.findOne({ provider_id: providerId });
        if (payment) {
          payment.status = 'succeeded';
          await payment.save();
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const providerId = pi.id;
        const payment = await Payment.findOne({ provider_id: providerId });
        if (payment) {
          payment.status = 'failed';
          await payment.save();
        }
        break;
      }
      // Add more event types as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err) {
    console.error('Error handling webhook event', err);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
}
