/**
 * Scheduler bootstrap that wires all cron jobs for the server process.
 */
const logger = require('../utils/logger');
const focusTimerJob = require('./focusTimerJob');
const dailyModeScheduler = require('./dailyModeScheduler');
const meetingSummaryJob = require('./meetingSummaryJob');

function startAll() {
  const jobs = [
    { name: 'FocusTimerJob', start: focusTimerJob.start },
    { name: 'DailyModeScheduler', start: dailyModeScheduler.start },
    { name: 'MeetingSummaryJob', start: meetingSummaryJob.start }
  ];

  jobs.forEach((job) => {
    try {
      job.start();
      logger.info(`[Schedulers] ${job.name} initialized.`);
    } catch (error) {
      logger.error(`[Schedulers] Failed to start ${job.name}`, error);
    }
  });
}

module.exports = { startAll };

