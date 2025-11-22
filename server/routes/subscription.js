/**
 * Subscription routes
 */
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { attachSubscriptionInfo } = require('../middlewares/featureGate');

// All routes require authentication
router.use(authenticate);
router.use(attachSubscriptionInfo);

// Get current subscription
router.get('/my-subscription', subscriptionController.getMySubscription);

// Get usage
router.get('/usage', subscriptionController.getUsage);

// Check feature access
router.get('/features/:featureName', subscriptionController.checkFeatureAccess);

// Get available plans (public, but shows current plan if authenticated)
router.get('/plans', subscriptionController.getPlans);

// Create checkout session
router.post('/checkout', subscriptionController.createCheckout);

// Verify checkout
router.post('/verify', subscriptionController.verifyCheckout);

// Cancel subscription
router.post('/cancel', subscriptionController.cancelSubscription);

// Resume subscription
router.post('/resume', subscriptionController.resumeSubscription);

module.exports = router;

