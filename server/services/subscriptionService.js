/**
 * Subscription Service - SaaS subscription management
 */
const dbService = require('./dbService');
const logger = require('../utils/logger');

/**
 * Get user's current subscription
 */
async function getUserSubscription(userId) {
  const subscription = await dbService.getUserActiveSubscription(userId);
  
  if (!subscription) {
    // Return default free plan
    return await getDefaultSubscription(userId);
  }

  // Get plan details
  const plan = await dbService.getSubscriptionPlan(subscription.plan_id);
  
  return {
    ...subscription,
    plan
  };
}

/**
 * Get default free subscription for user
 */
async function getDefaultSubscription(userId) {
  const freePlan = await dbService.getSubscriptionPlanByName('free');
  
  if (!freePlan) {
    throw new Error('Free plan not found');
  }

  // Create subscription if it doesn't exist
  let subscription = await dbService.getUserActiveSubscription(userId);
  
  if (!subscription) {
    subscription = await dbService.createUserSubscription({
      userId,
      planId: freePlan.id,
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Update user's current subscription
    await dbService.updateUser(userId, {
      current_subscription_id: subscription.id
    });
  }

  return {
    ...subscription,
    plan: freePlan
  };
}

/**
 * Check if user has access to a feature
 */
async function hasFeatureAccess(userId, featureName) {
  const subscription = await getUserSubscription(userId);
  const plan = subscription.plan;

  if (!plan || !plan.features) {
    return false;
  }

  // Check if feature is enabled for this plan
  return plan.features[featureName] === true;
}

/**
 * Check if user is within usage limits
 */
async function checkUsageLimit(userId, usageType) {
  const subscription = await getUserSubscription(userId);
  const plan = subscription.plan;

  if (!plan || !plan.limits) {
    return { allowed: true, remaining: -1 }; // Unlimited
  }

  const limit = plan.limits[usageType];
  
  // -1 means unlimited
  if (limit === -1 || limit === null) {
    return { allowed: true, remaining: -1 };
  }

  // Get current usage for the period
  const currentUsage = await getCurrentUsage(userId, subscription.id, usageType, subscription.current_period_start, subscription.current_period_end);
  
  const remaining = Math.max(0, limit - currentUsage);
  const allowed = currentUsage < limit;

  return {
    allowed,
    used: currentUsage,
    limit,
    remaining
  };
}

/**
 * Get current usage for a period
 */
async function getCurrentUsage(userId, subscriptionId, usageType, periodStart, periodEnd) {
  const usage = await dbService.getSubscriptionUsage(userId, subscriptionId, usageType, periodStart, periodEnd);
  return usage?.usage_count || 0;
}

/**
 * Increment usage counter
 */
async function incrementUsage(userId, subscriptionId, usageType, amount = 1) {
  const subscription = await dbService.getUserSubscription(subscriptionId);
  
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Get or create usage record for current period
  let usage = await dbService.getSubscriptionUsage(
    userId,
    subscriptionId,
    usageType,
    subscription.current_period_start,
    subscription.current_period_end
  );

  if (!usage) {
    usage = await dbService.createSubscriptionUsage({
      userId,
      subscriptionId,
      usageType,
      usageCount: amount,
      usagePeriodStart: subscription.current_period_start,
      usagePeriodEnd: subscription.current_period_end,
      limitValue: subscription.plan?.limits?.[usageType] || null
    });
  } else {
    usage = await dbService.updateSubscriptionUsage(usage.id, {
      usageCount: usage.usage_count + amount
    });
  }

  return usage;
}

/**
 * Upgrade user subscription
 */
async function upgradeSubscription(userId, planName, billingCycle = 'monthly') {
  const newPlan = await dbService.getSubscriptionPlanByName(planName);
  
  if (!newPlan) {
    throw new Error(`Plan ${planName} not found`);
  }

  const currentSubscription = await dbService.getUserActiveSubscription(userId);
  
  // Create new subscription
  const newSubscription = await dbService.createUserSubscription({
    userId,
    planId: newPlan.id,
    status: 'active',
    billingCycle,
    currentPeriodStart: new Date(),
    currentPeriodEnd: billingCycle === 'yearly' 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  // Cancel old subscription if exists
  if (currentSubscription) {
    await dbService.updateUserSubscription(currentSubscription.id, {
      status: 'canceled',
      canceledAt: new Date()
    });
  }

  // Update user's current subscription
  await dbService.updateUser(userId, {
    current_subscription_id: newSubscription.id
  });

  // Log activity
  await dbService.logActivity({
    userId,
    activityType: 'subscription_upgraded',
    activityCategory: 'subscription',
    description: `Upgraded to ${newPlan.display_name} plan`,
    metadata: { planName, billingCycle, oldPlanId: currentSubscription?.plan_id }
  });

  return {
    ...newSubscription,
    plan: newPlan
  };
}

/**
 * Cancel user subscription
 */
async function cancelSubscription(userId, cancelAtPeriodEnd = true) {
  const subscription = await dbService.getUserActiveSubscription(userId);
  
  if (!subscription) {
    throw new Error('No active subscription found');
  }

  if (cancelAtPeriodEnd) {
    // Schedule cancellation at end of period
    await dbService.updateUserSubscription(subscription.id, {
      canceledAt: subscription.current_period_end
    });
  } else {
    // Cancel immediately, downgrade to free
    await dbService.updateUserSubscription(subscription.id, {
      status: 'canceled',
      canceledAt: new Date()
    });

    // Create free subscription
    await getDefaultSubscription(userId);
  }

  // Log activity
  await dbService.logActivity({
    userId,
    activityType: 'subscription_canceled',
    activityCategory: 'subscription',
    description: 'Subscription canceled',
    metadata: { cancelAtPeriodEnd }
  });

  return { success: true };
}

/**
 * Get subscription plans
 */
async function getSubscriptionPlans() {
  const plans = await dbService.getSubscriptionPlans();
  return plans.filter(plan => plan.is_active);
}

/**
 * Get user subscription usage summary
 */
async function getUsageSummary(userId) {
  const subscription = await getUserSubscription(userId);
  const plan = subscription.plan;

  if (!plan || !plan.limits) {
    return {};
  }

  const usageSummary = {};

  for (const [usageType, limit] of Object.entries(plan.limits)) {
    if (limit === -1) {
      usageSummary[usageType] = {
        used: 0,
        limit: -1,
        remaining: -1,
        percentage: 0
      };
    } else {
      const currentUsage = await getCurrentUsage(
        userId,
        subscription.id,
        usageType,
        subscription.current_period_start,
        subscription.current_period_end
      );
      
      usageSummary[usageType] = {
        used: currentUsage,
        limit,
        remaining: Math.max(0, limit - currentUsage),
        percentage: limit > 0 ? Math.round((currentUsage / limit) * 100) : 0
      };
    }
  }

  return usageSummary;
}

module.exports = {
  getUserSubscription,
  getDefaultSubscription,
  hasFeatureAccess,
  checkUsageLimit,
  incrementUsage,
  upgradeSubscription,
  cancelSubscription,
  getSubscriptionPlans,
  getUsageSummary
};

