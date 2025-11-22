/**
 * Scheduler Service
 * 
 * Helper utilities for background job schedulers.
 * Provides data access methods for scheduler workers.
 * 
 * @module services/schedulerService
 */

const dbService = require('./dbService');
const timeUtils = require('../utils/time');
const logger = require('../utils/logger').child('SchedulerService');

/**
 * Retrieves focus sessions that have exceeded their planned duration
 * 
 * @param {Date} [referenceDate] - Reference date for expiration check (defaults to now)
 * @returns {Promise<Array<Object>>} Array of expired session objects
 * @throws {Error} If database query fails
 * 
 * @example
 * const expired = await getExpiredFocusSessions();
 * // Returns: [{ sessionId, userId, mode, startedAt, expectedEnd, durationMinutes }, ...]
 */
async function getExpiredFocusSessions(referenceDate = new Date()) {
  try {
    logger.debug('Fetching expired focus sessions', { referenceDate });
    const expired = await dbService.getExpiredFocusSessions(referenceDate);
    logger.info(`Found ${expired.length} expired focus sessions`);
    return expired;
  } catch (error) {
    logger.error('Failed to fetch expired focus sessions', error);
    throw error;
  }
}

async function getPendingMeetingNotes({ windowMinutes = 180, limit = 100 } = {}) {
  return dbService.getPendingMeetingNotes(windowMinutes, limit);
}

async function markMeetingNotesSummarized(noteIds) {
  if (!Array.isArray(noteIds) || !noteIds.length) {
    return [];
  }
  return dbService.markMeetingNotesSummarized(noteIds);
}

async function recordMeetingSummary(metadata) {
  return dbService.recordAuditEvent('meeting_summary_generated', metadata);
}

/**
 * Gets all user modes from the database
 * 
 * @returns {Promise<Array<Object>>} Array of user mode objects
 */
async function getAllUserModes() {
  try {
    logger.debug('Fetching all user modes');
    const modes = await dbService.getAllUserModes();
    logger.debug(`Fetched ${modes.length} user modes`);
    return modes;
  } catch (error) {
    logger.error('Failed to fetch user modes', error);
    throw error;
  }
}

/**
 * Resets all user modes to idle state
 * 
 * @returns {Promise<Array<string>>} Array of user IDs that were reset
 */
async function resetAllModesToIdle() {
  try {
    logger.info('Resetting all user modes to idle');
    const userIds = await dbService.resetAllUserModesToIdle();
    logger.info(`Reset ${userIds.length} user modes to idle`);
    return userIds;
  } catch (error) {
    logger.error('Failed to reset user modes', error);
    throw error;
  }
}

/**
 * Logs a mode transition
 * 
 * @param {string} userId - User ID
 * @param {string} fromMode - Previous mode
 * @param {string} toMode - New mode
 * @param {string} reason - Reason for transition
 * @returns {Promise<Object>} Created transition record
 */
async function logTransition(userId, fromMode, toMode, reason) {
  try {
    logger.debug('Logging mode transition', { userId, fromMode, toMode, reason });
    const transition = await dbService.logModeTransition({ userId, fromMode, toMode, reason });
    return transition;
  } catch (error) {
    logger.error('Failed to log mode transition', error, { userId });
    throw error;
  }
}

/**
 * Gets daily user session statistics for a time period
 * 
 * @param {Date|string} dayStart - Start of day
 * @param {Date|string} [dayEnd] - End of day (optional, defaults to end of dayStart)
 * @returns {Promise<Array<Object>>} Array of user stats objects
 */
async function getDailyUserStats(dayStart, dayEnd) {
  try {
    logger.debug('Fetching daily user stats', { dayStart, dayEnd });
    const stats = await dbService.getDailyUserSessionStats(dayStart, dayEnd);
    logger.debug(`Fetched stats for ${stats.length} users`);
    return stats;
  } catch (error) {
    logger.error('Failed to fetch daily user stats', error);
    throw error;
  }
}

/**
 * Generates a stub schedule overview (legacy support)
 * 
 * @deprecated This is a placeholder function and should be replaced with real scheduling logic
 * @returns {Promise<Object>} Stub schedule object
 */
async function getStubSchedule() {
  logger.warn('Using stub schedule - replace with real scheduling logic');
  return {
    nextSession: timeUtils.addMinutesToNow(30),
    recurring: true
  };
}

module.exports = {
  getExpiredFocusSessions,
  getAllUserModes,
  resetAllModesToIdle,
  logTransition,
  getDailyUserStats,
  getPendingMeetingNotes,
  markMeetingNotesSummarized,
  recordMeetingSummary,
  getStubSchedule
};
