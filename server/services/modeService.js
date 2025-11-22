/**
 * Focus Mode Service
 * 
 * Core business logic for managing user focus modes, sessions, and transitions.
 * Handles mode state management, session lifecycle, and notifications.
 * 
 * @module services/modeService
 */

const dbService = require('./dbService');
const cliqApi = require('./cliqApi');
const logger = require('../utils/logger').child('ModeService');

/**
 * Allowed focus mode types
 * @constant
 * @type {Set<string>}
 */
const ALLOWED_MODES = new Set(['focus', 'break', 'meeting', 'sleep', 'idle']);

/**
 * Validates that userId is provided
 * @private
 * @param {string} userId - User ID to validate
 * @throws {Error} If userId is missing
 */
function validateUserId(userId) {
  if (!userId) {
    throw new Error('userId is required for mode operations');
  }
}

/**
 * Normalizes and validates a mode name
 * @private
 * @param {string} mode - Mode name to normalize
 * @returns {string} Normalized mode name
 * @throws {Error} If mode is invalid
 */
function normalizeMode(mode) {
  const normalized = (mode || '').toLowerCase().trim();
  
  if (!normalized) {
    throw new Error('Mode name cannot be empty');
  }
  
  if (!ALLOWED_MODES.has(normalized)) {
    const allowedModes = Array.from(ALLOWED_MODES).join(', ');
    throw new Error(`Unsupported mode "${mode}". Allowed values: ${allowedModes}`);
  }
  
  return normalized;
}

/**
 * Normalizes a string into a URL-friendly slug
 * @private
 * @param {string} value - String to normalize
 * @returns {string} Normalized slug
 */
function normalizeSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Fetches all available focus modes
 * 
 * @returns {Promise<Array<Object>>} Array of focus mode objects
 * @throws {Error} If database query fails
 * 
 * @example
 * const modes = await fetchModes();
 * // Returns: [{ id, name, slug, description, durationMinutes }, ...]
 */
async function fetchModes() {
  try {
    logger.debug('Fetching all focus modes');
    const modes = await dbService.listFocusModes();
    
    const formatted = modes.map((mode) => ({
      id: mode.id,
      name: mode.name,
      slug: mode.slug,
      description: mode.description,
      durationMinutes: mode.duration_minutes
    }));
    
    logger.info(`Fetched ${formatted.length} focus modes`);
    return formatted;
  } catch (error) {
    logger.error('Failed to fetch focus modes', error);
    throw error;
  }
}

/**
 * Creates a new focus mode definition
 * 
 * @param {Object} payload - Mode creation data
 * @param {string} payload.name - Mode name (required)
 * @param {number} payload.durationMinutes - Duration in minutes (required)
 * @param {string} [payload.description] - Optional description
 * @param {string} [payload.slug] - Optional slug (auto-generated if not provided)
 * @returns {Promise<Object>} Created mode object
 * @throws {Error} If validation fails or database operation fails
 * 
 * @example
 * const mode = await createMode({
 *   name: 'Deep Work',
 *   durationMinutes: 90,
 *   description: 'Intensive focus session'
 * });
 */
async function createMode(payload) {
  if (!payload) {
    throw new Error('Mode payload is required');
  }

  const name = payload.name?.trim();
  const durationMinutes = Number.parseInt(payload.durationMinutes, 10);
  const description = payload.description?.trim() || null;
  
  // Validation
  if (!name) {
    throw new Error('Mode name is required');
  }
  
  if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
    throw new Error('durationMinutes must be a positive integer');
  }
  
  // Generate slug if not provided
  const slug = payload.slug ? normalizeSlug(payload.slug) : normalizeSlug(name);

  try {
    logger.info('Creating new focus mode', { name, slug, durationMinutes });
    const created = await dbService.createFocusMode({
      name,
      slug,
      description,
      durationMinutes
    });

    const result = {
      id: created.id,
      name: created.name,
      slug: created.slug,
      description: created.description,
      durationMinutes: created.duration_minutes
    };
    
    logger.info('Successfully created focus mode', { modeId: result.id });
    return result;
  } catch (error) {
    logger.error('Failed to create focus mode', error, { name, durationMinutes });
    throw error;
  }
}

/**
 * Starts a focus session for a user
 * 
 * @param {string} userId - User ID starting the session
 * @param {number} [requestedDurationMinutes] - Optional custom duration (uses default if not provided)
 * @returns {Promise<Object>} Session information with state
 * @throws {Error} If userId is missing or session creation fails
 * 
 * @example
 * const result = await startFocusMode('user-123', 50);
 * // Returns: { state, session, alreadyActive: false }
 */
async function startFocusMode(userId, requestedDurationMinutes) {
  validateUserId(userId);

  try {
    logger.info('Starting focus mode', { userId, requestedDuration: requestedDurationMinutes });
    
    return await dbService.withTransaction(async (client) => {
      // Check current mode state
      const current = await dbService.getUserMode(userId, client);
      
      // If already in focus mode, return current state
      if (current.currentMode === 'focus' && current.sessionId) {
        logger.debug('User already in focus mode', { userId, sessionId: current.sessionId });
        return {
          state: current,
          session: current.session,
          alreadyActive: true
        };
      }

      // Get default focus mode or use requested duration
      const defaultMode = await dbService.findModeByIdentifier('focus', client);
      const durationMinutes = requestedDurationMinutes || defaultMode?.duration_minutes || 50;

      // End any existing active sessions
      await dbService.endActiveFocusSessions(userId, client);
      
      // Create new focus session
      const session = await dbService.createFocusSession(
        { userId, modeLabel: 'focus', durationMinutes },
        client
      );
      
      // Update user mode state
      const state = await dbService.upsertUserMode(
        { userId, mode: 'focus', sessionId: session.id },
        client
      );
      
      // Log mode transition
      await dbService.logModeTransition(
        {
          userId,
          fromMode: current.currentMode,
          toMode: 'focus',
          reason: 'manual_start'
        },
        client
      );

      logger.info('Focus mode started successfully', {
        userId,
        sessionId: session.id,
        durationMinutes
      });

      return {
        state,
        session: {
          id: session.id,
          startedAt: session.started_at,
          mode: session.mode_label,
          expectedEnd: session.expected_end
        },
        alreadyActive: false
      };
    });
  } catch (error) {
    logger.error('Failed to start focus mode', error, { userId });
    throw error;
  }
}

/**
 * Stops the current focus session for a user
 * 
 * @param {string} userId - User ID stopping the session
 * @returns {Promise<Object>} Finalized session result
 * @throws {Error} If userId is missing or session finalization fails
 */
async function stopFocusMode(userId) {
  validateUserId(userId);
  logger.info('Stopping focus mode', { userId });
  return finalizeFocusSession(userId, undefined, { reason: 'manual_stop' });
}

/**
 * Sets user to a specific mode (not focus)
 * 
 * @param {string} userId - User ID
 * @param {string} mode - Mode to set (must be valid and not 'focus')
 * @returns {Promise<Object>} Updated mode state
 * @throws {Error} If validation fails
 */
async function setMode(userId, mode) {
  validateUserId(userId);
  const normalized = normalizeMode(mode);

  // Use dedicated start function for focus mode
  if (normalized === 'focus') {
    return startFocusMode(userId);
  }

  try {
    logger.info('Setting user mode', { userId, mode: normalized });
    
    return await dbService.withTransaction(async (client) => {
      const current = await dbService.getUserMode(userId, client);
      
      // If already in the requested mode, return unchanged
      if (current.currentMode === normalized) {
        logger.debug('User already in requested mode', { userId, mode: normalized });
        return { state: current, unchanged: true };
      }

      // End current session if exists
      if (current.sessionId) {
        await dbService.endFocusSession(current.sessionId, client);
      }

      // Update user mode
      const state = await dbService.upsertUserMode(
        { userId, mode: normalized, sessionId: null },
        client
      );
      
      // Log transition
      await dbService.logModeTransition(
        {
          userId,
          fromMode: current.currentMode,
          toMode: normalized,
          reason: 'manual_set'
        },
        client
      );

      logger.info('Mode set successfully', { userId, from: current.currentMode, to: normalized });
      return { state };
    });
  } catch (error) {
    logger.error('Failed to set mode', error, { userId, mode });
    throw error;
  }
}

/**
 * Gets the current mode state for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Current mode state
 * @throws {Error} If userId is missing
 */
async function getCurrentMode(userId) {
  validateUserId(userId);
  
  try {
    logger.debug('Getting current mode', { userId });
    const mode = await dbService.getUserMode(userId);
    return mode;
  } catch (error) {
    logger.error('Failed to get current mode', error, { userId });
    throw error;
  }
}

/**
 * Handles an incoming message during focus mode (may be blocked)
 * 
 * @param {string} userId - User ID receiving the message
 * @param {string|Object} message - Message content or object
 * @returns {Promise<Object>} Message handling result
 * @throws {Error} If userId is missing
 */
async function handleIncomingMessage(userId, message) {
  validateUserId(userId);
  
  const payload = typeof message === 'string' ? { text: message } : { ...(message || {}) };
  
  try {
    logger.debug('Handling incoming message', { userId, hasChannel: !!payload.channelId });
    
    const current = await dbService.getUserMode(userId);
    
    // If not in focus mode, allow message through
    if (current.currentMode !== 'focus') {
      return {
        blocked: false,
        delivered: true,
        mode: current.currentMode
      };
    }

    // User is in focus mode - block the message
    let sessionId = current.sessionId;
    
    // Create session if it doesn't exist
    if (!sessionId) {
      const session = await dbService.createFocusSession({ userId, modeLabel: 'focus' });
      await dbService.upsertUserMode({ userId, mode: 'focus', sessionId: session.id });
      sessionId = session.id;
    }

    // Record blocked message
    await dbService.recordBlockedMessage({
      userId,
      sessionId,
      channelId: payload.channelId,
      messagePreview: payload.text?.slice(0, 255),
      payload
    });
    
    // Increment interruption counter
    await dbService.incrementSessionInterruptions(sessionId);
    
    // Log transition for analytics
    await dbService.logModeTransition({
      userId,
      fromMode: 'focus',
      toMode: 'focus',
      reason: 'message_blocked'
    });

    logger.debug('Message blocked during focus mode', { userId, sessionId });
    
    return {
      blocked: true,
      delivered: false,
      reason: 'User is in focus mode',
      mode: 'focus'
    };
  } catch (error) {
    logger.error('Failed to handle incoming message', error, { userId });
    throw error;
  }
}

/**
 * Gets mode summary with recent sessions and statistics
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Mode summary with statistics
 * @throws {Error} If userId is missing
 */
async function getModeSummary(userId) {
  validateUserId(userId);
  
  try {
    logger.debug('Getting mode summary', { userId });
    const summary = await dbService.getModeSummary(userId);
    return summary;
  } catch (error) {
    logger.error('Failed to get mode summary', error, { userId });
    throw error;
  }
}

/**
 * Prepares and stores a session summary
 * @private
 * @param {string} userId - User ID
 * @param {number} sessionId - Session ID
 * @param {Object} options - Options object
 * @param {Object} [options.client] - Database client for transaction
 * @returns {Promise<Object>} Generated summary
 */
async function prepareAndStoreSummary(userId, sessionId, { client } = {}) {
  try {
    logger.debug('Preparing session summary', { userId, sessionId });
    
    const parts = await dbService.getSessionSummaryParts(sessionId, client);
    
    if (!parts || parts.session.user_id !== userId) {
      throw new Error('Unable to locate session for summary generation');
    }

    const start = new Date(parts.session.started_at);
    const end = new Date(parts.session.ended_at || Date.now());
    const actualDurationMinutes = Math.max(1, Math.round((end - start) / 60000));

    const summary = {
      session: {
        id: parts.session.id,
        userId: parts.session.user_id,
        mode: parts.session.mode_label,
        startedAt: parts.session.started_at,
        endedAt: parts.session.ended_at,
        plannedDurationMinutes: parts.session.duration_minutes,
        expectedEnd: parts.session.expected_end
      },
      metrics: {
        actualDurationMinutes,
        interruptions: parts.session.interruption_count || 0,
        blockedMessages: parts.blockedMessages.length
      },
      blockedMessages: parts.blockedMessages,
      transitions: parts.transitions
    };

    await dbService.storeSessionSummary(sessionId, summary, client);
    
    logger.info('Session summary prepared and stored', {
      userId,
      sessionId,
      actualDurationMinutes
    });
    
    return summary;
  } catch (error) {
    logger.error('Failed to prepare session summary', error, { userId, sessionId });
    throw error;
  }
}

/**
 * Sends notification when focus mode ends automatically
 * @private
 * @param {string} userId - User ID (Cliq user ID)
 * @param {Object} summary - Session summary
 * @returns {Promise<boolean>} Success status
 */
async function notifyModeAutoEnd(userId, summary) {
  try {
    const credentials = await dbService.getOAuthCredentialsByCliqUserId(userId);
    
    if (!credentials?.accessToken) {
      logger.debug('Cannot notify user - no OAuth credentials', { userId });
      return false;
    }

    const text = summary
      ? `Your focus session (${summary.metrics.actualDurationMinutes} mins) has ended. Blocked messages: ${summary.metrics.blockedMessages}.`
      : 'Your focus session has ended.';

    await cliqApi.sendDirectMessage({
      accessToken: credentials.accessToken,
      userId,
      text
    });

    logger.info('Sent focus mode end notification', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to notify user about session end', error, { userId });
    return false; // Don't throw - notification failure shouldn't break the flow
  }
}

/**
 * Finalizes a focus session (marks as ended and generates summary)
 * 
 * @param {string} userId - User ID
 * @param {number} [sessionId] - Optional specific session ID (uses active session if not provided)
 * @param {Object} [options] - Finalization options
 * @param {string} [options.reason] - Reason for finalization
 * @param {boolean} [options.notify] - Whether to send notification (default: true)
 * @returns {Promise<Object>} Finalization result with summary
 * @throws {Error} If userId is missing or finalization fails
 */
async function finalizeFocusSession(userId, sessionId, options = {}) {
  validateUserId(userId);
  
  const reason = options.reason || 'auto_finalized';
  const shouldNotify = options.notify !== false;

  try {
    logger.info('Finalizing focus session', { userId, sessionId, reason });
    
    const result = await dbService.withTransaction(async (client) => {
      const state = await dbService.getUserMode(userId, client);
      const targetSessionId = sessionId || state.sessionId;
      
      // No active session to finalize
      if (!targetSessionId) {
        logger.debug('No active session to finalize', { userId });
        return { skipped: true };
      }

      // End the session
      const session = await dbService.endFocusSession(targetSessionId, client);
      
      if (!session) {
        logger.debug('Session not found or already ended', { userId, sessionId: targetSessionId });
        return { skipped: true };
      }

      // Log transition to break mode
      await dbService.logModeTransition(
        {
          userId,
          fromMode: state.currentMode,
          toMode: 'break',
          reason
        },
        client
      );

      // Update user mode to break
      await dbService.upsertUserMode({ userId, mode: 'break', sessionId: null }, client);

      // Generate and store summary
      const summary = await prepareAndStoreSummary(userId, targetSessionId, { client });

      // Get updated state
      const updatedState = await dbService.getUserMode(userId, client);

      return { summary, state: updatedState };
    });

    // Send notification if session was finalized
    if (result.summary && shouldNotify) {
      await notifyModeAutoEnd(userId, result.summary);
    }

    logger.info('Focus session finalized', {
      userId,
      sessionId: sessionId || 'active',
      hasSummary: !!result.summary
    });

    return result;
  } catch (error) {
    logger.error('Failed to finalize focus session', error, { userId, sessionId });
    throw error;
  }
}

/**
 * Sends a daily recap message to user with statistics
 * 
 * @param {string} userId - User ID (Cliq user ID)
 * @param {Object} stats - Daily statistics
 * @param {number} stats.sessionCount - Number of sessions
 * @param {number} stats.durationMinutes - Total focus minutes
 * @param {number} stats.interruptions - Total interruptions
 * @param {number} stats.blockedMessages - Total blocked messages
 * @param {Date} stats.dayStart - Day start timestamp
 * @returns {Promise<boolean>} Success status
 */
async function sendDailyRecap(userId, stats) {
  validateUserId(userId);
  
  try {
    logger.info('Sending daily recap', { userId });
    
    const credentials = await dbService.getOAuthCredentialsByCliqUserId(userId);
    
    if (!credentials?.accessToken) {
      logger.warn('Skipping daily recap - user not linked', { userId });
      return false;
    }

    const dateLabel = new Date(stats.dayStart || Date.now()).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });

    const lines = [
      `Daily Focus Recap (${dateLabel})`,
      `Sessions completed: ${stats.sessionCount}`,
      `Focused minutes: ${stats.durationMinutes}`,
      `Interruptions: ${stats.interruptions}`,
      `Blocked messages: ${stats.blockedMessages}`
    ];

    await cliqApi.sendDirectMessage({
      accessToken: credentials.accessToken,
      userId,
      text: lines.join('\n')
    });

    await dbService.recordAuditEvent('daily_focus_recap', { userId, stats });
    
    logger.info('Daily recap sent successfully', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to send daily recap', error, { userId });
    return false; // Don't throw - notification failure shouldn't break the flow
  }
}

module.exports = {
  fetchModes,
  createMode,
  startFocusMode,
  stopFocusMode,
  setMode,
  getCurrentMode,
  handleIncomingMessage,
  getModeSummary,
  finalizeFocusSession,
  prepareAndStoreSummary,
  notifyModeAutoEnd,
  sendDailyRecap
};
