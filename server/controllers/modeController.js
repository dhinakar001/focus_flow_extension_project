/**
 * Focus Mode Controller
 * 
 * Handles HTTP requests related to focus modes and sessions.
 * Validates input, calls service layer, and formats responses.
 * 
 * @module controllers/modeController
 */

const modeService = require('../services/modeService');
const logger = require('../utils/logger').child('ModeController');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Lists all available focus modes
 * 
 * GET /modes
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function listModes(req, res, next) {
  try {
    logger.debug('Listing focus modes');
    const modes = await modeService.fetchModes();
    return res.json({ 
      success: true,
      data: modes 
    });
  } catch (error) {
    logger.error('Failed to list modes', error);
    return next(error);
  }
}

/**
 * Creates a new focus mode definition
 * 
 * POST /modes
 * Body: { name, durationMinutes, description?, slug? }
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function createMode(req, res, next) {
  try {
    logger.debug('Creating focus mode', { name: req.body?.name });
    const created = await modeService.createMode(req.body || {});
    return res.status(201).json({ 
      success: true,
      data: created 
    });
  } catch (error) {
    logger.error('Failed to create mode', error, { body: req.body });
    return next(error);
  }
}

/**
 * Starts a focus session for a user
 * 
 * POST /modes/start
 * Body: { userId, durationMinutes? }
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function startMode(req, res, next) {
  try {
    const { userId, durationMinutes } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    logger.info('Starting focus mode', { userId, durationMinutes });
    const result = await modeService.startFocusMode(userId, durationMinutes);
    return res.json({ 
      success: true,
      data: result 
    });
  } catch (error) {
    logger.error('Failed to start mode', error, { userId: req.body?.userId });
    return next(error);
  }
}

/**
 * Stops the current focus session for a user
 * 
 * POST /modes/stop
 * Body: { userId }
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function stopMode(req, res, next) {
  try {
    const { userId } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    logger.info('Stopping focus mode', { userId });
    const result = await modeService.stopFocusMode(userId);
    return res.json({ 
      success: true,
      data: result 
    });
  } catch (error) {
    logger.error('Failed to stop mode', error, { userId: req.body?.userId });
    return next(error);
  }
}

/**
 * Sets user to a specific mode
 * 
 * POST /modes/set
 * Body: { userId, mode }
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function setMode(req, res, next) {
  try {
    const { userId, mode } = req.body || {};
    
    if (!userId || !mode) {
      return res.status(400).json({
        success: false,
        error: 'userId and mode are required'
      });
    }

    logger.info('Setting user mode', { userId, mode });
    const result = await modeService.setMode(userId, mode);
    return res.json({ 
      success: true,
      data: result 
    });
  } catch (error) {
    logger.error('Failed to set mode', error, { userId: req.body?.userId, mode: req.body?.mode });
    return next(error);
  }
}

/**
 * Gets the current mode for a user
 * 
 * GET /modes/current/:userId?
 * Query or Params: userId
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function getCurrentMode(req, res, next) {
  try {
    const userId = req.params.userId || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    logger.debug('Getting current mode', { userId });
    const data = await modeService.getCurrentMode(userId);
    return res.json({ 
      success: true,
      data 
    });
  } catch (error) {
    logger.error('Failed to get current mode', error, { userId: req.params.userId || req.query.userId });
    return next(error);
  }
}

/**
 * Handles an incoming message (may block if user is in focus mode)
 * 
 * POST /modes/message
 * Body: { userId, message }
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function handleMessage(req, res, next) {
  try {
    const { userId, message } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    logger.debug('Handling message', { userId, hasMessage: !!message });
    const result = await modeService.handleIncomingMessage(userId, message);
    return res.json({ 
      success: true,
      data: result 
    });
  } catch (error) {
    logger.error('Failed to handle message', error, { userId: req.body?.userId });
    return next(error);
  }
}

/**
 * Gets mode summary with statistics for a user
 * 
 * GET /modes/summary/:userId?
 * Query or Params: userId
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function getSummary(req, res, next) {
  try {
    const userId = req.params.userId || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    logger.debug('Getting mode summary', { userId });
    const summary = await modeService.getModeSummary(userId);
    return res.json({ 
      success: true,
      data: summary 
    });
  } catch (error) {
    logger.error('Failed to get summary', error, { userId: req.params.userId || req.query.userId });
    return next(error);
  }
}

// Export all handlers wrapped with async handler for automatic error catching
module.exports = {
  listModes: asyncHandler(listModes),
  createMode: asyncHandler(createMode),
  startMode: asyncHandler(startMode),
  stopMode: asyncHandler(stopMode),
  setMode: asyncHandler(setMode),
  getCurrentMode: asyncHandler(getCurrentMode),
  handleMessage: asyncHandler(handleMessage),
  getSummary: asyncHandler(getSummary)
};
