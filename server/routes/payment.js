/**
 * Payment webhook routes
 */
const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

// Stripe webhook (requires raw body)
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = paymentService.stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    await paymentService.handleStripeWebhook(event);

    res.json({ received: true });
  } catch (error) {
    logger.error('[PaymentRoute] Stripe webhook error', error);
    res.status(400).json({ error: error.message });
  }
});

// Razorpay webhook
router.post('/webhooks/razorpay', express.json(), async (req, res) => {
  try {
    // Verify webhook signature
    const crypto = require('crypto');
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    await paymentService.handleRazorpayWebhook(req.body);
    
    res.json({ received: true });
  } catch (error) {
    logger.error('[PaymentRoute] Razorpay webhook error', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

