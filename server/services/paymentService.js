/**
 * Payment Service - Stripe and Razorpay integration
 */
const Stripe = require('stripe');
const Razorpay = require('razorpay');
const dbService = require('./dbService');
const logger = require('../utils/logger');
const subscriptionService = require('./subscriptionService');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Initialize payment providers
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;
const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) 
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

const DEFAULT_PAYMENT_PROVIDER = process.env.DEFAULT_PAYMENT_PROVIDER || 'stripe';

/**
 * Create payment intent (Stripe)
 */
async function createStripePaymentIntent(amount, currency, userId, metadata = {}) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId: userId.toString(),
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    };
  } catch (error) {
    logger.error('[PaymentService] Stripe payment intent creation failed', error);
    throw error;
  }
}

/**
 * Create Razorpay order
 */
async function createRazorpayOrder(amount, currency, userId, metadata = {}) {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      receipt: `order_${Date.now()}_${userId}`,
      notes: {
        userId: userId.toString(),
        ...metadata
      }
    };

    const order = await razorpay.orders.create(options);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    };
  } catch (error) {
    logger.error('[PaymentService] Razorpay order creation failed', error);
    throw error;
  }
}

/**
 * Create subscription checkout session
 */
async function createCheckoutSession(userId, planName, billingCycle = 'monthly', provider = DEFAULT_PAYMENT_PROVIDER) {
  const plan = await dbService.getSubscriptionPlanByName(planName);
  
  if (!plan) {
    throw new Error(`Plan ${planName} not found`);
  }

  const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  
  if (price === 0) {
    // Free plan, just upgrade directly
    await subscriptionService.upgradeSubscription(userId, planName, billingCycle);
    return {
      sessionId: null,
      url: null,
      free: true
    };
  }

  if (provider === 'stripe') {
    return await createStripeCheckoutSession(userId, plan, billingCycle, price);
  } else if (provider === 'razorpay') {
    return await createRazorpayCheckoutSession(userId, plan, billingCycle, price);
  } else {
    throw new Error(`Unsupported payment provider: ${provider}`);
  }
}

/**
 * Create Stripe checkout session
 */
async function createStripeCheckoutSession(userId, plan, billingCycle, price) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    // Create or retrieve Stripe price
    let stripePriceId = plan.metadata?.stripe_price_id_monthly;
    if (billingCycle === 'yearly') {
      stripePriceId = plan.metadata?.stripe_price_id_yearly;
    }

    if (!stripePriceId) {
      // Create price in Stripe
      const stripePrice = await stripe.prices.create({
        unit_amount: Math.round(price * 100),
        currency: 'usd',
        recurring: {
          interval: billingCycle === 'yearly' ? 'year' : 'month'
        },
        product_data: {
          name: `${plan.display_name} Plan`,
          description: plan.description
        }
      });

      stripePriceId = stripePrice.id;
      
      // Update plan metadata
      await dbService.updateSubscriptionPlan(plan.id, {
        metadata: {
          ...plan.metadata,
          [`stripe_price_id_${billingCycle === 'yearly' ? 'yearly' : 'monthly'}`]: stripePriceId
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: stripePriceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/cancel`,
      customer_email: (await dbService.getUserById(userId)).email,
      metadata: {
        userId: userId.toString(),
        planId: plan.id.toString(),
        planName: plan.name,
        billingCycle
      }
    });

    return {
      sessionId: session.id,
      url: session.url,
      provider: 'stripe'
    };
  } catch (error) {
    logger.error('[PaymentService] Stripe checkout session creation failed', error);
    throw error;
  }
}

/**
 * Create Razorpay checkout session
 */
async function createRazorpayCheckoutSession(userId, plan, billingCycle, price) {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    // Create subscription in Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.metadata?.razorpay_plan_id || plan.name,
      customer_notify: 1,
      total_count: billingCycle === 'yearly' ? 1 : 12,
      notes: {
        userId: userId.toString(),
        planId: plan.id.toString(),
        planName: plan.name
      }
    });

    // For Razorpay, return subscription ID and payment link
    return {
      sessionId: subscription.id,
      url: null, // Razorpay handles checkout differently
      provider: 'razorpay',
      subscriptionId: subscription.id
    };
  } catch (error) {
    logger.error('[PaymentService] Razorpay checkout session creation failed', error);
    throw error;
  }
}

/**
 * Verify payment and activate subscription
 */
async function verifyPayment(paymentIntentId, provider = 'stripe') {
  if (provider === 'stripe') {
    return await verifyStripePayment(paymentIntentId);
  } else if (provider === 'razorpay') {
    return await verifyRazorpayPayment(paymentIntentId);
  }
  throw new Error(`Unsupported payment provider: ${provider}`);
}

/**
 * Verify Stripe payment
 */
async function verifyStripePayment(paymentIntentId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Create transaction record
      const transaction = await dbService.createPaymentTransaction({
        userId: parseInt(paymentIntent.metadata.userId),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: 'succeeded',
        paymentProvider: 'stripe',
        providerTransactionId: paymentIntent.id,
        providerPaymentIntentId: paymentIntent.id,
        paidAt: new Date(paymentIntent.created * 1000)
      });

      return {
        success: true,
        transaction
      };
    }

    return {
      success: false,
      status: paymentIntent.status
    };
  } catch (error) {
    logger.error('[PaymentService] Stripe payment verification failed', error);
    throw error;
  }
}

/**
 * Verify Razorpay payment
 */
async function verifyRazorpayPayment(orderId) {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const order = await razorpay.orders.fetch(orderId);

    if (order.status === 'paid') {
      const transaction = await dbService.createPaymentTransaction({
        userId: parseInt(order.notes.userId),
        amount: order.amount / 100,
        currency: order.currency.toUpperCase(),
        status: 'succeeded',
        paymentProvider: 'razorpay',
        providerTransactionId: order.id
      });

      return {
        success: true,
        transaction
      };
    }

    return {
      success: false,
      status: order.status
    };
  } catch (error) {
    logger.error('[PaymentService] Razorpay payment verification failed', error);
    throw error;
  }
}

/**
 * Handle Stripe webhook
 */
async function handleStripeWebhook(event) {
  try {
    // Store webhook event
    await dbService.createWebhookEvent({
      provider: 'stripe',
      eventType: event.type,
      providerEventId: event.id,
      payload: event
    });

    switch (event.type) {
      case 'checkout.session.completed':
        await handleStripeCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleStripeSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleStripeSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleStripeInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleStripeInvoiceFailed(event.data.object);
        break;
    }

    await dbService.markWebhookEventProcessed(event.id);
  } catch (error) {
    logger.error('[PaymentService] Stripe webhook handling failed', error);
    throw error;
  }
}

/**
 * Handle Stripe checkout completed
 */
async function handleStripeCheckoutCompleted(session) {
  const userId = parseInt(session.metadata.userId);
  const planName = session.metadata.planName;
  const billingCycle = session.metadata.billingCycle;

  // Upgrade user subscription
  await subscriptionService.upgradeSubscription(userId, planName, billingCycle);
}

/**
 * Handle Stripe subscription updated
 */
async function handleStripeSubscriptionUpdated(subscription) {
  const userId = parseInt(subscription.metadata.userId);
  const userSubscription = await dbService.getUserSubscriptionByStripeId(subscription.id);

  if (userSubscription) {
    await dbService.updateUserSubscription(userSubscription.id, {
      status: subscription.status === 'active' ? 'active' : subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    });
  }
}

/**
 * Handle Stripe subscription deleted
 */
async function handleStripeSubscriptionDeleted(subscription) {
  const userSubscription = await dbService.getUserSubscriptionByStripeId(subscription.id);

  if (userSubscription) {
    await subscriptionService.cancelSubscription(userSubscription.user_id, false);
  }
}

/**
 * Handle Stripe invoice paid
 */
async function handleStripeInvoicePaid(invoice) {
  // Create payment transaction
  // Create invoice record
  // Update subscription period
}

/**
 * Handle Stripe invoice failed
 */
async function handleStripeInvoiceFailed(invoice) {
  // Update subscription status to past_due
  // Notify user
}

/**
 * Handle Razorpay webhook
 */
async function handleRazorpayWebhook(event) {
  try {
    await dbService.createWebhookEvent({
      provider: 'razorpay',
      eventType: event.event,
      providerEventId: event.payload.payment?.entity?.id || event.payload.subscription?.entity?.id,
      payload: event
    });

    switch (event.event) {
      case 'payment.captured':
        await handleRazorpayPaymentCaptured(event.payload.payment.entity);
        break;
      case 'subscription.activated':
        await handleRazorpaySubscriptionActivated(event.payload.subscription.entity);
        break;
      case 'subscription.charged':
        await handleRazorpaySubscriptionCharged(event.payload.subscription.entity);
        break;
    }

    await dbService.markWebhookEventProcessed(event.payload.payment?.entity?.id || event.payload.subscription?.entity?.id);
  } catch (error) {
    logger.error('[PaymentService] Razorpay webhook handling failed', error);
    throw error;
  }
}

async function handleRazorpayPaymentCaptured(payment) {
  // Handle payment
}

async function handleRazorpaySubscriptionActivated(subscription) {
  // Activate subscription
}

async function handleRazorpaySubscriptionCharged(subscription) {
  // Handle charge
}

module.exports = {
  createCheckoutSession,
  createStripePaymentIntent,
  createRazorpayOrder,
  verifyPayment,
  handleStripeWebhook,
  handleRazorpayWebhook,
  stripe,
  razorpay
};

