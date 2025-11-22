/**
 * Missed Messages Routes
 * 
 * API endpoints for retrieving missed messages during focus sessions
 * 
 * @module routes/missedMessages
 */

const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');
const { authenticate } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger').child('MissedMessagesRoute');

// All routes require authentication
router.use(authenticate);

/**
 * GET /missed
 * Get list of missed messages for the authenticated user
 * 
 * Query Parameters:
 * - limit: Number of messages to return (default: 50)
 */
router.get('/', asyncHandler(async (req, res) => {
  const limit = Number.parseInt(req.query.limit || '50', 10);
  const userId = req.user?.userId || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  logger.debug('Fetching missed messages', { userId, limit });
  const messages = await dbService.listMissedMessages(limit);

  return res.json({
    success: true,
    data: messages,
    count: messages.length
  });
}));

module.exports = router;
