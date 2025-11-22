/**
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

/** Groups notes by user */
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

/** Summarizes meetings for one user */
async function summarizeUserMeetings(userId, notes) {
  const transcript = notes
    .map((note) => `- ${note.note}`)
    .join('\n')
    .trim();

  const summary = await summaryService.generateMeetingSummary({
    userId,
    transcript,
    noteCount: notes.length,
    windowMinutes: WINDOW_MINUTES,
  });

  await schedulerService.recordMeetingSummary({
    userId,
    summary,
    noteIds: notes.map((note) => note.id),
    noteCount: notes.length,
    windowMinutes: WINDOW_MINUTES,
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
      limit: BATCH_LIMIT,
    });

    if (!pendingNotes.length) {
      logger.info(`[${JOB_NAME}] No pending meeting notes detected.`);
      return;
    }

    const grouped = groupNotesByUser(pendingNotes);

    for (const [userId, notes] of grouped.entries()) {
      if (!userId || !notes.length) continue;

      try {
        await summarizeUserMeetings(userId, notes);
        logger.info(
          `[${JOB_NAME}] Generated meeting summary for ${userId} (${notes.length} notes).`
        );
      } catch (error) {
        logger.error(
          `[${JOB_NAME}] Failed to summarize meetings for ${userId}`,
          error
        );
      }
    }

    logger.info(
      `[${JOB_NAME}] Sweep finished in ${Date.now() - startedAt}ms.`
    );
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
