/**
 * Focus Timer Job
 * 
 * Background job that periodically checks for expired focus sessions
 * and finalizes them automatically.
 * 
 * @module schedulers/focusTimerJob
 */

const cron = require('node-cron');
const schedulerService = require('../services/schedulerService');
const modeService = require('../services/modeService');
const logger = require('../utils/logger').child('FocusTimerJob');

const JOB_NAME = 'FocusTimerJob';
let scheduledTask = null;

/**
 * Main job execution function
 * Scans for expired focus sessions and finalizes them
 * 
 * @returns {Promise<void>}
 */
async function run() {
  const startTime = Date.now();
  logger.info('Focus timer job started');
  
  try {
    // Get all expired focus sessions
    const expiredSessions = await schedulerService.getExpiredFocusSessions();
    
    if (expiredSessions.length === 0) {
      logger.debug('No expired focus sessions found');
      return;
    }
    
    logger.info(`Found ${expiredSessions.length} expired focus sessions`);
    
    // Finalize each expired session
    const results = await Promise.allSettled(
      expiredSessions.map(async (session) => {
        try {
      await modeService.finalizeFocusSession(session.userId, session.sessionId, {
            reason: 'session_expired',
            notify: true
          });
          logger.debug('Finalized expired session', {
            userId: session.userId,
            sessionId: session.sessionId
          });
          return { success: true, sessionId: session.sessionId };
        } catch (error) {
          logger.error('Failed to finalize expired session', error, {
            userId: session.userId,
            sessionId: session.sessionId
          });
          return { success: false, sessionId: session.sessionId, error: error.message };
        }
      })
    );
    
    // Log summary
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    const duration = Date.now() - startTime;
    
    logger.info('Focus timer job completed', {
      total: expiredSessions.length,
      successful,
      failed,
      duration: `${duration}ms`
    });
  } catch (error) {
    logger.error('Focus timer job failed', error);
    throw error; // Re-throw to allow retry logic
  }
}

/**
 * Starts the scheduled job
 * Runs every minute to check for expired sessions
 * 
 * @returns {Object} Cron task object
 */
function start() {
  if (scheduledTask) {
    logger.warn('Focus timer job is already running');
    return scheduledTask;
  }
  
  // Schedule to run every minute: '* * * * *'
  scheduledTask = cron.schedule('* * * * *', run, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  logger.info('Focus timer job scheduled to run every minute');
  return scheduledTask;
}

/**
 * Stops the scheduled job
 */
function stop() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Focus timer job stopped');
}
}

/**
 * Manually triggers the job (for testing)
 * 
 * @returns {Promise<void>}
 */
async function trigger() {
  logger.info('Focus timer job triggered manually');
  await run();
}

module.exports = {
  start,
  stop,
  run,
  trigger
};
