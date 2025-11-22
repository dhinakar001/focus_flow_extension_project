/**
 * Statistics Routes
 * 
 * API endpoints for productivity statistics and analytics
 * 
 * @module routes/stats
 * @deprecated These endpoints are being migrated to /analytics
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticate } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger').child('StatsRoute');

// All routes require authentication
router.use(authenticate);

/**
 * GET /stats
 * Get productivity statistics
 * 
 * @deprecated Use /analytics endpoints instead
 */
router.get('/', (req, res, next) => {
  logger.warn('Stats endpoint is deprecated - use /analytics instead');
  statsController.getStats(req, res, next);
});

module.exports = router;
