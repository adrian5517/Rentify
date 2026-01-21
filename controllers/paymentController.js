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
      // Payments controller disabled — payments feature removed.
      // All handlers return HTTP 410 Gone when invoked.

      exports.createPaymentRecord = async (req, res) => {
        return res.status(410).json({ success: false, message: 'Payments feature removed' });
      };

      exports.getPayment = async (req, res) => {
        return res.status(410).json({ success: false, message: 'Payments feature removed' });
      };

      exports.listPaymentsByUser = async (req, res) => {
        return res.status(410).json({ success: false, message: 'Payments feature removed' });
      };

      exports.updatePaymentStatus = async (req, res) => {
        return res.status(410).json({ success: false, message: 'Payments feature removed' });
      };

      exports.createPaymentIntent = async (req, res) => {
        return res.status(410).json({ success: false, message: 'Payments feature removed' });
      };

      exports.createFakePayment = async (req, res) => {
        return res.status(410).json({ success: false, message: 'Payments feature removed' });
      };

      exports.stripeWebhook = async (req, res) => {
        return res.status(410).json({ success: false, message: 'Payments feature removed' });
      };
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
