/**
 * Admin Controller - Admin dashboard endpoints
 */
const dbService = require('../services/dbService');
const subscriptionService = require('../services/subscriptionService');
const logger = require('../utils/logger');

/**
 * Get dashboard statistics
 */
async function getDashboardStats(req, res, next) {
  try {
    // Get total users
    const totalUsers = await dbService.getTotalUsers();
    
    // Get active subscriptions
    const activeSubscriptions = await dbService.getActiveSubscriptionsCount();
    
    // Get revenue statistics
    const revenue = await dbService.getRevenueStats();
    
    // Get recent signups
    const recentSignups = await dbService.getRecentSignups(10);
    
    // Get subscription distribution
    const subscriptionDistribution = await dbService.getSubscriptionDistribution();
    
    // Get growth metrics
    const growthMetrics = await dbService.getGrowthMetrics();

    return res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeSubscriptions,
          recentSignups
        },
        revenue: {
          monthly: revenue.monthly || 0,
          yearly: revenue.yearly || 0,
          total: revenue.total || 0
        },
        subscriptions: {
          distribution: subscriptionDistribution
        },
        growth: growthMetrics
      }
    });
  } catch (error) {
    logger.error('[AdminController] getDashboardStats failed', error);
    return next(error);
  }
}

/**
 * Get all users with pagination
 */
async function getUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status; // active, inactive

    const users = await dbService.getUsersPaginated({
      page,
      limit,
      search,
      status
    });

    return res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('[AdminController] getUsers failed', error);
    return next(error);
  }
}

/**
 * Get user details
 */
async function getUserDetails(req, res, next) {
  try {
    const { userId } = req.params;
    
    const user = await dbService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const subscription = await subscriptionService.getUserSubscription(userId);
    const usage = await subscriptionService.getUsageSummary(userId);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          isActive: user.is_active,
          isVerified: user.is_verified,
          createdAt: user.created_at,
          lastLogin: user.last_login
        },
        subscription,
        usage
      }
    });
  } catch (error) {
    logger.error('[AdminController] getUserDetails failed', error);
    return next(error);
  }
}

/**
 * Update user status
 */
async function updateUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { isActive, isVerified } = req.body;

    const updates = {};
    if (isActive !== undefined) updates.is_active = isActive;
    if (isVerified !== undefined) updates.is_verified = isVerified;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    await dbService.updateUser(userId, updates);

    return res.json({
      success: true,
      message: 'User status updated'
    });
  } catch (error) {
    logger.error('[AdminController] updateUserStatus failed', error);
    return next(error);
  }
}

/**
 * Get all subscriptions
 */
async function getSubscriptions(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const subscriptions = await dbService.getSubscriptionsPaginated({
      page,
      limit,
      status
    });

    return res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    logger.error('[AdminController] getSubscriptions failed', error);
    return next(error);
  }
}

/**
 * Get payment transactions
 */
async function getTransactions(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const transactions = await dbService.getTransactionsPaginated({
      page,
      limit,
      status
    });

    return res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    logger.error('[AdminController] getTransactions failed', error);
    return next(error);
  }
}

/**
 * Get analytics overview
 */
async function getAnalyticsOverview(req, res, next) {
  try {
    const period = req.query.period || '30d';
    
    const analytics = await dbService.getAdminAnalytics(period);

    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('[AdminController] getAnalyticsOverview failed', error);
    return next(error);
  }
}

/**
 * Update subscription plan
 */
async function updateSubscriptionPlan(req, res, next) {
  try {
    const { planId } = req.params;
    const updates = req.body;

    await dbService.updateSubscriptionPlan(planId, updates);

    return res.json({
      success: true,
      message: 'Subscription plan updated'
    });
  } catch (error) {
    logger.error('[AdminController] updateSubscriptionPlan failed', error);
    return next(error);
  }
}

module.exports = {
  getDashboardStats,
  getUsers,
  getUserDetails,
  updateUserStatus,
  getSubscriptions,
  getTransactions,
  getAnalyticsOverview,
  updateSubscriptionPlan
};

