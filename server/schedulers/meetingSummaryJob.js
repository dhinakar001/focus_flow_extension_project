/**
<<<<<<< HEAD
 * Meeting Summary Job
 * 
 * Background job that generates summaries for completed focus sessions.
 * Can be scheduled to run periodically.
 * 
 * @module schedulers/meetingSummaryJob
 */

const cron = require('node-cron');
const dbService = require('../services/dbService');
const modeService = require('../services/modeService');
const logger = require('../utils/logger').child('MeetingSummaryJob');

const JOB_NAME = 'MeetingSummaryJob';
let scheduledTask = null;

/**
 * Generates summaries for sessions that ended in the last hour
 * 
 * @returns {Promise<void>}
 */
async function run() {
  const startTime = Date.now();
  logger.info('Meeting summary job started');
  
  try {
    // Get sessions that ended in the last hour without summaries
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // This would need a database query to find sessions without summaries
    // For now, this is a placeholder implementation
    logger.debug('Scanning for sessions needing summaries', { cutoffTime: oneHourAgo.toISOString() });
    
    // TODO: Implement query to find sessions needing summaries
    // const sessionsNeedingSummaries = await dbService.getSessionsNeedingSummaries(oneHourAgo);
    
    logger.info('Meeting summary job completed', {
      duration: `${Date.now() - startTime}ms`,
      note: 'Placeholder implementation - needs database query for sessions without summaries'
    });
  } catch (error) {
    logger.error('Meeting summary job failed', error);
    throw error;
  }
}

/**
 * Starts the scheduled job
 * Runs every 15 minutes to check for sessions needing summaries
 * 
 * @returns {Object} Cron task object
 */
function start() {
  if (scheduledTask) {
    logger.warn('Meeting summary job is already running');
    return scheduledTask;
  }
  
  // Schedule to run every 15 minutes
  scheduledTask = cron.schedule('*/15 * * * *', run, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  logger.info('Meeting summary job scheduled to run every 15 minutes');
  return scheduledTask;
}

/**
 * Stops the scheduled job
 */
function stop() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Meeting summary job stopped');
  }
}

/**
 * Manually triggers the job (for testing)
 * 
 * @returns {Promise<void>}
 */
async function trigger() {
  logger.info('Meeting summary job triggered manually');
  await run();
}

module.exports = {
  start,
  stop,
  run,
  trigger
};
=======
 * Meeting summary generator that compiles recent notes and hits the Python service.
 */
const cron = require('node-cron');
const logger = require('../utils/logger');
const schedulerService = require('../services/schedulerService');
const summaryService = require('../services/summaryService');

const JOB_NAME = 'MeetingSummaryJob';
const WINDOW_MINUTES = 180;
const BATCH_LIMIT = 200;
let task;

function groupNotesByUser(notes) {
  return notes.reduce((map, note) => {
    const key = note.userId || 'unknown';
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(note);
    return map;
  }, new Map());
}

async function summarizeUserMeetings(userId, notes) {
  const transcript = notes
    .map((note) => `- ${note.note}`)
    .join('\n')
    .trim();
  const summary = await summaryService.generateMeetingSummary({
    userId,
    transcript,
    noteCount: notes.length,
    windowMinutes: WINDOW_MINUTES
  });
  await schedulerService.recordMeetingSummary({
    userId,
    summary,
    noteIds: notes.map((note) => note.id),
    noteCount: notes.length,
    windowMinutes: WINDOW_MINUTES
  });
  await schedulerService.markMeetingNotesSummarized(notes.map((note) => note.id));
  return summary;
}

async function run() {
  const startedAt = Date.now();
  logger.info(`[${JOB_NAME}] Sweep started.`);
  try {
    const pendingNotes = await schedulerService.getPendingMeetingNotes({
      windowMinutes: WINDOW_MINUTES,
      limit: BATCH_LIMIT
    });
    if (!pendingNotes.length) {
      logger.info(`[${JOB_NAME}] No pending meeting notes detected.`);
      return;
    }

    const grouped = groupNotesByUser(pendingNotes);
    for (const [userId, notes] of grouped.entries()) {
      if (!userId || !notes.length) {
        continue;
      }
      try {
        await summarizeUserMeetings(userId, notes);
        logger.info(`[${JOB_NAME}] Generated meeting summary for ${userId} (${notes.length} notes).`);
      } catch (error) {
        logger.error(`[${JOB_NAME}] Failed to summarize meetings for ${userId}`, error);
      }
    }
    logger.info(`[${JOB_NAME}] Sweep finished in ${Date.now() - startedAt}ms.`);
  } catch (error) {
    logger.error(`[${JOB_NAME}] Sweep failed`, error);
  }
}

function start() {
  if (!task) {
    task = cron.schedule('*/30 * * * *', run, { scheduled: true });
    logger.info(`[${JOB_NAME}] Scheduled to run every 30 minutes.`);
  }
  return task;
}

module.exports = { start, run };
>>>>>>> origin/main
