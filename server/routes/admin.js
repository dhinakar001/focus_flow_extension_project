/**
 * Admin routes
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/status', adminController.updateUserStatus);

// Subscriptions
router.get('/subscriptions', adminController.getSubscriptions);

// Payments
router.get('/transactions', adminController.getTransactions);

// Analytics
router.get('/analytics', adminController.getAnalyticsOverview);

// Plans
router.patch('/plans/:planId', adminController.updateSubscriptionPlan);

module.exports = router;

