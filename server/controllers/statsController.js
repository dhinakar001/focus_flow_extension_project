/**
 * Statistics Controller
 * 
 * Handles requests for productivity statistics.
 * 
 * @module controllers/statsController
 * @deprecated This controller is being phased out in favor of analyticsController
 */

const statsService = require('../services/summaryService');
const logger = require('../utils/logger').child('StatsController');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Gets aggregate productivity statistics
 * 
 * GET /stats
 * 
 * @deprecated Use /analytics endpoints instead
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function getStats(req, res, next) {
  try {
    logger.warn('Stats endpoint is deprecated - use /analytics instead', { userId: req.user?.userId });
    
  const stats = await statsService.generatePlaceholderStats();
    
    return res.json({ 
      success: true,
      data: stats,
      deprecated: true,
      message: 'This endpoint is deprecated. Please use /analytics endpoints instead.'
    });
  } catch (error) {
    logger.error('Failed to get stats', error);
    return next(error);
  }
}

module.exports = { 
  getStats: asyncHandler(getStats)
};
