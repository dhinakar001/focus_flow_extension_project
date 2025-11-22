/**
 * Feature Gating Middleware - Restrict features based on subscription plan
 */
const subscriptionService = require('../services/subscriptionService');
const logger = require('../utils/logger');

/**
 * Check if user has access to a specific feature
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please authenticate to access this feature'
        });
      }

      const hasAccess = await subscriptionService.hasFeatureAccess(req.user.userId, featureName);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature not available',
          message: `This feature requires a Pro subscription. Upgrade your plan to access ${featureName}.`,
          feature: featureName,
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      logger.error('[FeatureGate] Error checking feature access', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify feature access'
      });
    }
  };
}

/**
 * Check usage limits before allowing action
 */
function requireUsageLimit(usageType) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const usageCheck = await subscriptionService.checkUsageLimit(req.user.userId, usageType);

      if (!usageCheck.allowed) {
        return res.status(403).json({
          error: 'Usage limit exceeded',
          message: `You have reached your ${usageType} limit for this billing period. Upgrade your plan for higher limits.`,
          usageType,
          used: usageCheck.used,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          upgradeRequired: true
        });
      }

      // Attach usage info to request
      req.usageInfo = usageCheck;
      next();
    } catch (error) {
      logger.error('[FeatureGate] Error checking usage limit', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify usage limits'
      });
    }
  };
}

/**
 * Track usage after action (call after successful action)
 */
async function trackUsage(userId, usageType, amount = 1) {
  try {
    const subscription = await subscriptionService.getUserSubscription(userId);
    
    if (subscription && subscription.id) {
      await subscriptionService.incrementUsage(userId, subscription.id, usageType, amount);
    }
  } catch (error) {
    logger.error('[FeatureGate] Error tracking usage', error);
    // Don't throw - usage tracking shouldn't break the request
  }
}

/**
 * Middleware to attach subscription info to request
 */
async function attachSubscriptionInfo(req, res, next) {
  try {
    if (req.user && req.user.userId) {
      const subscription = await subscriptionService.getUserSubscription(req.user.userId);
      req.subscription = subscription;
      req.userPlan = subscription?.plan?.name || 'free';
    }
    next();
  } catch (error) {
    logger.error('[FeatureGate] Error attaching subscription info', error);
    next(); // Continue even if subscription fetch fails
  }
}

module.exports = {
  requireFeature,
  requireUsageLimit,
  trackUsage,
  attachSubscriptionInfo
};

