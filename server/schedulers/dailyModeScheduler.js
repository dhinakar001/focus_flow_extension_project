/**
 * Daily Mode Scheduler Job
 * 
 * Background job that resets user modes daily and sends daily recaps.
 * Runs once per day at a configured time.
 * 
 * @module schedulers/dailyModeScheduler
 */

const cron = require('node-cron');
const schedulerService = require('../services/schedulerService');
const modeService = require('../services/modeService');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger').child('DailyModeScheduler');

const JOB_NAME = 'DailyModeScheduler';
const SCHEDULE_TIME = process.env.DAILY_SCHEDULE_TIME || '00:00'; // Default: midnight UTC
let scheduledTask = null;

/**
 * Main job execution function
 * Resets modes and sends daily recaps
 * 
 * @returns {Promise<void>}
 */
async function run() {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  logger.info('Daily mode scheduler job started', { date: today });
  
  try {
    // Get all user modes
    const userModes = await schedulerService.getAllUserModes();
    logger.info(`Processing ${userModes.length} users for daily reset`);
    
    // Reset all modes to idle
    const resetUserIds = await schedulerService.resetAllModesToIdle();
    logger.info(`Reset ${resetUserIds.length} user modes to idle`);
    
    // Calculate and send daily analytics for each user
    const recapResults = await Promise.allSettled(
      resetUserIds.map(async (userId) => {
        try {
          // Calculate daily analytics
          const analytics = await analyticsService.calculateDailyAnalytics(userId, today);
          
          // Get daily stats for recap
          const stats = await schedulerService.getDailyUserStats(today, today);
          const userStats = stats.find(s => s.userId === userId);
          
          if (userStats) {
            // Send daily recap
            await modeService.sendDailyRecap(userId, {
              sessionCount: userStats.sessionCount || 0,
              durationMinutes: userStats.durationMinutes || 0,
              interruptions: userStats.interruptions || 0,
              blockedMessages: userStats.blockedMessages || 0,
              dayStart: new Date(today)
            });
    }

          return { success: true, userId };
        } catch (error) {
          logger.error('Failed to process daily recap for user', error, { userId });
          return { success: false, userId, error: error.message };
        }
      })
    );
    
    const successful = recapResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = recapResults.length - successful;
    const duration = Date.now() - startTime;
    
    logger.info('Daily mode scheduler job completed', {
      usersProcessed: resetUserIds.length,
      recapsSuccessful: successful,
      recapsFailed: failed,
      duration: `${duration}ms`
    });
  } catch (error) {
    logger.error('Daily mode scheduler job failed', error);
    throw error;
  }
}

/**
 * Starts the scheduled job
 * Runs daily at the configured time
 * 
 * @returns {Object} Cron task object
 */
function start() {
  if (scheduledTask) {
    logger.warn('Daily mode scheduler is already running');
    return scheduledTask;
  }
  
  // Parse schedule time (format: HH:MM)
  const [hours, minutes] = SCHEDULE_TIME.split(':').map(Number);
  const cronExpression = `${minutes} ${hours} * * *`; // Daily at specified time
  
  scheduledTask = cron.schedule(cronExpression, run, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  logger.info(`Daily mode scheduler scheduled to run daily at ${SCHEDULE_TIME} UTC`);
  return scheduledTask;
}

/**
 * Stops the scheduled job
 */
function stop() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Daily mode scheduler stopped');
  }
}

/**
 * Manually triggers the job (for testing)
 * 
 * @returns {Promise<void>}
 */
async function trigger() {
  logger.info('Daily mode scheduler triggered manually');
  await run();
}

module.exports = {
  start,
  stop,
  run,
  trigger
};
