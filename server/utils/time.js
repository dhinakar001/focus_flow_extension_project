/**
 * Time Utility Functions
 * 
 * Common time manipulation and formatting utilities for FocusFlow
 * 
 * @module utils/time
 */

/**
 * Adds minutes to the current time and returns ISO timestamp string
 * 
 * @param {number} minutes - Number of minutes to add (can be negative)
 * @returns {string} ISO timestamp string
 * 
 * @example
 * const futureTime = addMinutesToNow(30); // 30 minutes from now
 * const pastTime = addMinutesToNow(-15); // 15 minutes ago
 */
function addMinutesToNow(minutes) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
    throw new Error('Minutes must be a valid number');
  }

  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Formats a duration in minutes to a human-readable string
 * 
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string (e.g., "2h 30m", "45m")
 * 
 * @example
 * formatDuration(150); // Returns: "2h 30m"
 * formatDuration(45); // Returns: "45m"
 */
function formatDuration(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Formats a time remaining in seconds to MM:SS format
 * 
 * @param {number} seconds - Time remaining in seconds
 * @returns {string} Formatted time string (e.g., "25:30")
 * 
 * @example
 * formatTimeRemaining(1530); // Returns: "25:30"
 */
function formatTimeRemaining(seconds) {
  if (typeof seconds !== 'number' || seconds < 0) {
    return '00:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Gets the start of day (00:00:00) for a given date
 * 
 * @param {Date} [date] - Date object (uses current date if not provided)
 * @returns {Date} Date set to start of day
 */
function getStartOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Gets the end of day (23:59:59) for a given date
 * 
 * @param {Date} [date] - Date object (uses current date if not provided)
 * @returns {Date} Date set to end of day
 */
function getEndOfDay(date = new Date()) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Calculates the difference between two dates in minutes
 * 
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Difference in minutes
 */
function getDifferenceInMinutes(startDate, endDate) {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    throw new Error('Both arguments must be Date objects');
  }

  const diffMs = endDate - startDate;
  return Math.round(diffMs / (1000 * 60));
}

module.exports = {
  addMinutesToNow,
  formatDuration,
  formatTimeRemaining,
  getStartOfDay,
  getEndOfDay,
  getDifferenceInMinutes
};
