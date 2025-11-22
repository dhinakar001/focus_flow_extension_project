/**
 * Subscription Controller - Handle subscription-related requests
 */
const subscriptionService = require('../services/subscriptionService');
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

/**
 * Get current user subscription
 */
async function getMySubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user.userId);
    const usageSummary = await subscriptionService.getUsageSummary(req.user.userId);

    return res.json({
      success: true,
      data: {
        subscription,
        usage: usageSummary
      }
    });
  } catch (error) {
    logger.error('[SubscriptionController] getMySubscription failed', error);
    return next(error);
  }
}

/**
 * Get available subscription plans
 */
async function getPlans(req, res, next) {
  try {
    const plans = await subscriptionService.getSubscriptionPlans();
    
    // Get current user subscription if authenticated
    let currentPlan = null;
    if (req.user && req.user.userId) {
      const subscription = await subscriptionService.getUserSubscription(req.user.userId);
      currentPlan = subscription?.plan?.name || null;
    }

    return res.json({
      success: true,
      data: {
        plans: plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          displayName: plan.display_name,
          description: plan.description,
          priceMonthly: parseFloat(plan.price_monthly),
          priceYearly: parseFloat(plan.price_yearly),
          currency: plan.currency,
          features: plan.features,
          limits: plan.limits,
          isDefault: plan.is_default,
          isCurrentPlan: plan.name === currentPlan
        }))
      }
    });
  } catch (error) {
    logger.error('[SubscriptionController] getPlans failed', error);
    return next(error);
  }
}

/**
 * Create checkout session for subscription upgrade
 */
async function createCheckout(req, res, next) {
  try {
    const { planName, billingCycle = 'monthly', paymentProvider = 'stripe' } = req.body;

    if (!planName) {
      return res.status(400).json({
        error: 'Plan name is required'
      });
    }

    const session = await paymentService.createCheckoutSession(
      req.user.userId,
      planName,
      billingCycle,
      paymentProvider
    );

    if (session.free) {
      return res.json({
        success: true,
        data: {
          message: 'Subscription activated successfully',
          subscription: await subscriptionService.getUserSubscription(req.user.userId)
        }
      });
    }

    return res.json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('[SubscriptionController] createCheckout failed', error);
    return next(error);
  }
}

/**
 * Verify payment after checkout
 */
async function verifyCheckout(req, res, next) {
  try {
    const { sessionId, provider = 'stripe' } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required'
      });
    }

    const result = await paymentService.verifyPayment(sessionId, provider);

    return res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    logger.error('[SubscriptionController] verifyCheckout failed', error);
    return next(error);
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(req, res, next) {
  try {
    const { cancelAtPeriodEnd = true } = req.body;

    await subscriptionService.cancelSubscription(req.user.userId, cancelAtPeriodEnd);

    return res.json({
      success: true,
      message: cancelAtPeriodEnd 
        ? 'Subscription will be canceled at the end of the current billing period'
        : 'Subscription has been canceled'
    });
  } catch (error) {
    logger.error('[SubscriptionController] cancelSubscription failed', error);
    return next(error);
  }
}

/**
 * Resume canceled subscription
 */
async function resumeSubscription(req, res, next) {
  try {
    const subscription = await dbService.getUserActiveSubscription(req.user.userId);
    
    if (!subscription || subscription.status !== 'canceled') {
      return res.status(400).json({
        error: 'No canceled subscription found'
      });
    }

    await dbService.updateUserSubscription(subscription.id, {
      status: 'active',
      canceledAt: null
    });

    return res.json({
      success: true,
      message: 'Subscription has been resumed'
    });
  } catch (error) {
    logger.error('[SubscriptionController] resumeSubscription failed', error);
    return next(error);
  }
}

/**
 * Get subscription usage
 */
async function getUsage(req, res, next) {
  try {
    const usageSummary = await subscriptionService.getUsageSummary(req.user.userId);

    return res.json({
      success: true,
      data: usageSummary
    });
  } catch (error) {
    logger.error('[SubscriptionController] getUsage failed', error);
    return next(error);
  }
}

/**
 * Check feature access
 */
async function checkFeatureAccess(req, res, next) {
  try {
    const { featureName } = req.params;

    if (!featureName) {
      return res.status(400).json({
        error: 'Feature name is required'
      });
    }

    const hasAccess = await subscriptionService.hasFeatureAccess(req.user.userId, featureName);

    return res.json({
      success: true,
      data: {
        feature: featureName,
        hasAccess
      }
    });
  } catch (error) {
    logger.error('[SubscriptionController] checkFeatureAccess failed', error);
    return next(error);
  }
}

module.exports = {
  getMySubscription,
  getPlans,
  createCheckout,
  verifyCheckout,
  cancelSubscription,
  resumeSubscription,
  getUsage,
  checkFeatureAccess
};

