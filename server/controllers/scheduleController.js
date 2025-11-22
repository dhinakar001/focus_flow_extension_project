/**
 * Schedule Controller
 * 
 * Handles requests for focus session scheduling.
 * 
 * @module controllers/scheduleController
 */

const schedulerService = require('../services/schedulerService');
const logger = require('../utils/logger').child('ScheduleController');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Gets schedule overview
 * 
 * GET /schedule
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function getSchedule(req, res, next) {
  try {
    logger.debug('Getting schedule overview', { userId: req.user?.userId });
    
  const schedule = await schedulerService.getStubSchedule();
    
    return res.json({ 
      success: true,
      data: schedule,
      note: 'Schedule endpoint placeholder - full scheduling coming soon'
    });
  } catch (error) {
    logger.error('Failed to get schedule', error);
    return next(error);
  }
}

module.exports = { 
  getSchedule: asyncHandler(getSchedule)
};
