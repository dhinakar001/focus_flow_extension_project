/**
 * Database access layer for FocusFlow relational storage.
 * 
 * Production-grade database service with connection pooling, encryption, and error handling.
 * 
 * @module services/dbService
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const serverConfig = require('../server.config');
const logger = require('../utils/logger').child('DBService');

// Enhanced connection pool with optimized settings
const pool = new Pool({
  connectionString: serverConfig.database.url,
  max: serverConfig.database.poolSize || 10,
  min: 2, // Keep minimum connections alive
  idleTimeoutMillis: serverConfig.database.idleTimeoutMillis || 30000,
  connectionTimeoutMillis: serverConfig.database.connectionTimeoutMillis || 5000,
  // SECURITY FIX: Only disable SSL validation in development
  ssl: serverConfig.database.ssl
    ? {
        rejectUnauthorized: serverConfig.env.isProduction // Only in production, require valid certs
      }
    : false,
  // Query timeout to prevent hanging queries
  statement_timeout: 30000, // 30 seconds
  // Application name for monitoring
  application_name: 'focusflow'
});

// Encryption key for sensitive data (tokens, etc.)
const ENCRYPTION_KEY = (() => {
  const raw = serverConfig.security.tokenEncryptionKey;
  if (!raw) {
    if (serverConfig.env.isProduction) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY environment variable is REQUIRED in production for secure token storage.'
      );
    }
    logger.warn('TOKEN_ENCRYPTION_KEY not set - using development key (NOT SECURE FOR PRODUCTION)');
    // Development fallback - MUST be changed in production
    return crypto.randomBytes(32);
  }
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a base64 encoded 32-byte value.');
  }
  return buffer;
})();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts a value using AES-256-GCM
 * @private
 * @param {string} value - Value to encrypt
 * @returns {string} Encrypted string (base64:base64:base64)
 * @throws {Error} If encryption fails
 */
function encrypt(value) {
  if (!value) {
    return null;
  }
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
  } catch (error) {
    logger.error('Encryption failed', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypts an encrypted value
 * @private
 * @param {string} payload - Encrypted string (base64:base64:base64)
 * @returns {string|null} Decrypted value or null if invalid
 * @throws {Error} If decryption fails
 */
function decrypt(payload) {
  if (!payload) return null;

  try {
    const parts = payload.split(':');
    if (parts.length !== 3) {
      logger.warn('Invalid encrypted payload format');
      return null;
    }

    const [ivB64, dataB64, tagB64] = parts;

    // Validate base64 format
    if (!ivB64 || !dataB64 || !tagB64) {
      logger.warn('Missing parts in encrypted payload');
      return null;
    }

    const iv = Buffer.from(ivB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    logger.error('Decryption failed', error, { payloadLength: payload?.length });
    // Don't throw - return null for invalid/expired tokens
    return null;
  }
}

/**
 * Executes a function within a database transaction
 * @param {Function} handler - Function to execute within transaction
 * @returns {Promise<any>} Result of handler function
 * @throws {Error} If transaction fails
 */
async function withTransaction(handler) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Records an audit event
 * @param {string} eventName - Event name
 * @param {Object} metadata - Event metadata
 * @param {Object} client - Database client (optional, uses pool if not provided)
 * @returns {Promise<Object>} Created audit event
 */
async function recordAuditEvent(eventName, metadata = {}, client = pool) {
  try {
    const query = `
      INSERT INTO audit_events (event_name, metadata)
      VALUES ($1, $2)
      RETURNING id, event_name, metadata, created_at
    `;
    const { rows } = await client.query(query, [eventName, JSON.stringify(metadata)]);
    return rows[0];
  } catch (error) {
    logger.error('Failed to record audit event', error, { eventName });
    throw error;
  }
}

/**
 * Upserts OAuth credentials with encryption
 * @param {Object} credentials - OAuth credentials
 * @param {string} credentials.cliqUserId - Cliq user ID
 * @param {string} credentials.zohoUserId - Zoho user ID
 * @param {string} credentials.email - Email
 * @param {string} credentials.accessToken - Access token
 * @param {string} [credentials.refreshToken] - Refresh token
 * @param {number} credentials.expiresIn - Expires in seconds
 * @param {string} credentials.scope - OAuth scope
 * @param {string} credentials.tokenType - Token type
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Upserted credentials (decrypted)
 */
async function upsertOAuthCredentials(
  {
    cliqUserId,
    zohoUserId,
    email,
    accessToken,
    refreshToken,
    expiresIn,
    scope,
    tokenType
  },
  client = pool
) {
  if (!cliqUserId || !accessToken || !expiresIn) {
    throw new Error('Missing required OAuth credential fields');
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const query = `
    INSERT INTO oauth_credentials (cliq_user_id, zoho_user_id, zoho_email, access_token_enc, refresh_token_enc, token_type, scope, expires_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (cliq_user_id)
    DO UPDATE SET
      zoho_user_id = EXCLUDED.zoho_user_id,
      zoho_email = EXCLUDED.zoho_email,
      access_token_enc = EXCLUDED.access_token_enc,
      refresh_token_enc = COALESCE(EXCLUDED.refresh_token_enc, oauth_credentials.refresh_token_enc),
      token_type = EXCLUDED.token_type,
      scope = EXCLUDED.scope,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
    RETURNING *
  `;
  const params = [
    cliqUserId,
    zohoUserId || null,
    email || null,
    encrypt(accessToken),
    refreshToken ? encrypt(refreshToken) : null,
    tokenType || 'Bearer',
    scope || '',
    expiresAt
  ];

  try {
    const { rows } = await client.query(query, params);
    return hydrateCredential(rows[0]);
  } catch (error) {
    logger.error('Failed to upsert OAuth credentials', error, { cliqUserId });
    throw error;
  }
}

/**
 * Gets OAuth credentials by Cliq user ID
 * @param {string} cliqUserId - Cliq user ID
 * @returns {Promise<Object|null>} OAuth credentials or null
 */
async function getOAuthCredentialsByCliqUserId(cliqUserId) {
  if (!cliqUserId) {
    return null;
  }

  try {
    const query = 'SELECT * FROM oauth_credentials WHERE cliq_user_id = $1';
    const { rows } = await pool.query(query, [cliqUserId]);
    if (!rows.length) {
      return null;
    }
    return hydrateCredential(rows[0]);
  } catch (error) {
    logger.error('Failed to get OAuth credentials', error, { cliqUserId });
    throw error;
  }
}

/**
 * Updates access token
 * @param {string} cliqUserId - Cliq user ID
 * @param {Object} tokenData - Token data
 * @returns {Promise<Object>} Updated credentials
 */
async function updateAccessToken(cliqUserId, { accessToken, expiresIn, scope, tokenType }) {
  if (!cliqUserId || !accessToken || !expiresIn) {
    throw new Error('Missing required fields for token update');
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const query = `
    UPDATE oauth_credentials
    SET access_token_enc = $2,
        scope = $3,
        token_type = $4,
        expires_at = $5,
        updated_at = NOW()
    WHERE cliq_user_id = $1
    RETURNING *
  `;
  const params = [cliqUserId, encrypt(accessToken), scope || '', tokenType || 'Bearer', expiresAt];

  try {
    const { rows } = await pool.query(query, params);
    if (!rows.length) {
      throw new Error(`No OAuth credentials stored for cliqUserId ${cliqUserId}`);
    }
    return hydrateCredential(rows[0]);
  } catch (error) {
    logger.error('Failed to update access token', error, { cliqUserId });
    throw error;
  }
}

/**
 * Lists missed messages
 * @param {number} limit - Maximum number of messages
 * @returns {Promise<Array>} List of missed messages
 */
async function listMissedMessages(limit = 50) {
  const safeLimit = Math.min(Math.max(1, limit), 100); // Clamp between 1-100
  const query = `
    SELECT id, channel, sender, preview, delivered_at
    FROM missed_messages
    ORDER BY delivered_at DESC
    LIMIT $1
  `;
  try {
    const { rows } = await pool.query(query, [safeLimit]);
    return rows;
  } catch (error) {
    logger.error('Failed to list missed messages', error);
    throw error;
  }
}

/**
 * Lists all focus modes
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Array>} List of focus modes
 */
async function listFocusModes(client = pool) {
  const query = `
    SELECT id, name, slug, description, duration_minutes
    FROM focus_modes
    ORDER BY name ASC
  `;
  try {
    const { rows } = await client.query(query);
    return rows;
  } catch (error) {
    logger.error('Failed to list focus modes', error);
    throw error;
  }
}

/**
 * Creates a new focus mode
 * @param {Object} modeData - Mode data
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Created focus mode
 */
async function createFocusMode({ name, slug, description, durationMinutes }, client = pool) {
  if (!name || !slug || !durationMinutes) {
    throw new Error('Missing required fields for focus mode');
  }

  const query = `
    INSERT INTO focus_modes (name, slug, description, duration_minutes)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, slug, description, duration_minutes
  `;
  try {
    const { rows } = await client.query(query, [name, slug, description || null, durationMinutes]);
    return rows[0];
  } catch (error) {
    logger.error('Failed to create focus mode', error, { name, slug });
    throw error;
  }
}

/**
 * Finds a mode by identifier (id, name, or slug)
 * @param {string} identifier - Mode identifier
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object|null>} Focus mode or null
 */
async function findModeByIdentifier(identifier, client = pool) {
  if (!identifier) {
    return null;
  }

  const query = `
    SELECT id, name, slug, description, duration_minutes
    FROM focus_modes
    WHERE LOWER(name) = LOWER($1)
       OR LOWER(slug) = LOWER($1)
       OR CAST(id AS TEXT) = $1
    LIMIT 1
  `;
  try {
    const { rows } = await client.query(query, [String(identifier).toLowerCase()]);
    return rows[0] || null;
  } catch (error) {
    logger.error('Failed to find mode by identifier', error, { identifier });
    throw error;
  }
}

/**
 * Gets user mode state
 * @param {string} userId - User ID
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} User mode state
 */
async function getUserMode(userId, client = pool) {
  if (!userId) {
    return {
      userId: null,
      currentMode: 'idle',
      sessionId: null,
      updatedAt: null,
      session: null
    };
  }

  const query = `
    SELECT um.user_id,
           um.current_mode,
           um.session_id,
           um.updated_at,
           fs.started_at,
           fs.mode_label,
           fs.expected_end
    FROM user_modes um
    LEFT JOIN focus_sessions fs ON fs.id = um.session_id
    WHERE um.user_id = $1
  `;
  try {
    const { rows } = await client.query(query, [userId]);
    if (!rows.length) {
      return {
        userId,
        currentMode: 'idle',
        sessionId: null,
        updatedAt: null,
        session: null
      };
    }
    const record = rows[0];
    return {
      userId: record.user_id,
      currentMode: record.current_mode,
      sessionId: record.session_id,
      updatedAt: record.updated_at,
      session: record.session_id
        ? {
            id: record.session_id,
            startedAt: record.started_at,
            mode: record.mode_label,
            expectedEnd: record.expected_end
          }
        : null
    };
  } catch (error) {
    logger.error('Failed to get user mode', error, { userId });
    throw error;
  }
}

/**
 * Upserts user mode
 * @param {Object} modeData - Mode data
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Updated user mode
 */
async function upsertUserMode({ userId, mode, sessionId }, client = pool) {
  if (!userId || !mode) {
    throw new Error('Missing required fields for user mode');
  }

  const query = `
    INSERT INTO user_modes (user_id, current_mode, session_id, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET current_mode = EXCLUDED.current_mode,
                  session_id = EXCLUDED.session_id,
                  updated_at = NOW()
    RETURNING user_id, current_mode, session_id, updated_at
  `;
  try {
    const { rows } = await client.query(query, [userId, mode, sessionId || null]);
    return {
      userId: rows[0].user_id,
      currentMode: rows[0].current_mode,
      sessionId: rows[0].session_id,
      updatedAt: rows[0].updated_at
    };
  } catch (error) {
    logger.error('Failed to upsert user mode', error, { userId, mode });
    throw error;
  }
}

/**
 * Creates a focus session
 * @param {Object} sessionData - Session data
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Created focus session
 */
async function createFocusSession({ userId, modeLabel, durationMinutes }, client = pool) {
  if (!userId || !modeLabel) {
    throw new Error('Missing required fields for focus session');
  }

  const expectedEnd = durationMinutes ? new Date(Date.now() + durationMinutes * 60000) : null;
  const query = `
    INSERT INTO focus_sessions (user_id, mode_label, duration_minutes, expected_end)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  try {
    const { rows } = await client.query(query, [userId, modeLabel, durationMinutes || null, expectedEnd]);
    return rows[0];
  } catch (error) {
    logger.error('Failed to create focus session', error, { userId, modeLabel });
    throw error;
  }
}

/**
 * Ends all active focus sessions for a user
 * @param {string} userId - User ID
 * @param {Object} client - Database client (optional)
 * @returns {Promise<void>}
 */
async function endActiveFocusSessions(userId, client = pool) {
  if (!userId) {
    return;
  }

  const query = `
    UPDATE focus_sessions
    SET ended_at = NOW()
    WHERE user_id = $1
      AND ended_at IS NULL
  `;
  try {
    await client.query(query, [userId]);
  } catch (error) {
    logger.error('Failed to end active focus sessions', error, { userId });
    throw error;
  }
}

/**
 * Ends a focus session by ID
 * @param {number} sessionId - Session ID
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object|null>} Ended session or null
 */
async function endFocusSession(sessionId, client = pool) {
  if (!sessionId) {
    return null;
  }

  const query = `
    UPDATE focus_sessions
    SET ended_at = COALESCE(ended_at, NOW())
    WHERE id = $1
    RETURNING *
  `;
  try {
    const { rows } = await client.query(query, [sessionId]);
    return rows[0] || null;
  } catch (error) {
    logger.error('Failed to end focus session', error, { sessionId });
    throw error;
  }
}

/**
 * Gets active focus session for a user
 * @param {string} userId - User ID
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object|null>} Active session or null
 */
async function getActiveFocusSession(userId, client = pool) {
  if (!userId) {
    return null;
  }

  const query = `
    SELECT *
    FROM focus_sessions
    WHERE user_id = $1
      AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `;
  try {
    const { rows } = await client.query(query, [userId]);
    return rows[0] || null;
  } catch (error) {
    logger.error('Failed to get active focus session', error, { userId });
    throw error;
  }
}

/**
 * Increments interruption count for a session
 * @param {number} sessionId - Session ID
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Updated session
 */
async function incrementSessionInterruptions(sessionId, client = pool) {
  if (!sessionId) {
    throw new Error('Session ID required');
  }

  const query = `
    UPDATE focus_sessions
    SET interruption_count = interruption_count + 1
    WHERE id = $1
    RETURNING *
  `;
  try {
    const { rows } = await client.query(query, [sessionId]);
    if (!rows.length) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return rows[0];
  } catch (error) {
    logger.error('Failed to increment session interruptions', error, { sessionId });
    throw error;
  }
}

/**
 * Logs a mode transition
 * @param {Object} transitionData - Transition data
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Created transition record
 */
async function logModeTransition({ userId, fromMode, toMode, reason }, client = pool) {
  if (!userId || !toMode) {
    throw new Error('Missing required fields for mode transition');
  }

  const query = `
    INSERT INTO mode_transitions (user_id, previous_mode, next_mode, reason)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  try {
    const { rows } = await client.query(query, [
      userId,
      fromMode || null,
      toMode,
      reason || null
    ]);
    return rows[0];
  } catch (error) {
    logger.error('Failed to log mode transition', error, { userId });
    throw error;
  }
}

/**
 * Records a blocked message
 * @param {Object} messageData - Message data
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Created blocked message record
 */
async function recordBlockedMessage(
  { userId, sessionId, channelId, messagePreview, payload },
  client = pool
) {
  if (!userId) {
    throw new Error('User ID required for blocked message');
  }

  // Sanitize and truncate message preview
  const sanitizedPreview = messagePreview ? String(messagePreview).slice(0, 500) : null;

  const query = `
    INSERT INTO blocked_messages (user_id, session_id, channel_id, message_preview, payload)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  try {
    const { rows } = await client.query(query, [
      userId,
      sessionId || null,
      channelId || null,
      sanitizedPreview,
      JSON.stringify(payload || {})
    ]);
    return rows[0];
  } catch (error) {
    logger.error('Failed to record blocked message', error, { userId, sessionId });
    throw error;
  }
}

/**
 * Gets mode summary for a user
 * @param {string} userId - User ID
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Mode summary
 */
async function getModeSummary(userId, client = pool) {
  if (!userId) {
    throw new Error('User ID required for mode summary');
  }

  const activeQuery = `
    SELECT fs.*
    FROM focus_sessions fs
    JOIN user_modes um ON um.session_id = fs.id
    WHERE um.user_id = $1
      AND um.current_mode = 'focus'
  `;
  const sessionsQuery = `
    SELECT id, mode_label, started_at, ended_at, interruption_count
    FROM focus_sessions
    WHERE user_id = $1
    ORDER BY started_at DESC
    LIMIT 10
  `;
  const blockedQuery = `
    SELECT COUNT(*)::INT AS blocked_count
    FROM blocked_messages
    WHERE user_id = $1
      AND created_at >= NOW() - INTERVAL '7 days'
  `;

  try {
    const [activeResult, sessionsResult, blockedResult] = await Promise.all([
      client.query(activeQuery, [userId]),
      client.query(sessionsQuery, [userId]),
      client.query(blockedQuery, [userId])
    ]);

    return {
      activeSession: activeResult.rows[0] || null,
      recentSessions: sessionsResult.rows,
      blockedMessagesLast7Days: blockedResult.rows[0]?.blocked_count || 0
    };
  } catch (error) {
    logger.error('Failed to get mode summary', error, { userId });
    throw error;
  }
}

/**
 * Gets all user modes
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Array>} List of user modes
 */
async function getAllUserModes(client = pool) {
  const query = `
    SELECT user_id, current_mode, session_id
    FROM user_modes
  `;
  try {
    const { rows } = await client.query(query);
    return rows.map((row) => ({
      userId: row.user_id,
      currentMode: row.current_mode,
      sessionId: row.session_id
    }));
  } catch (error) {
    logger.error('Failed to get all user modes', error);
    throw error;
  }
}

/**
 * Resets all user modes to idle
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Array<string>>} Array of user IDs that were reset
 */
async function resetAllUserModesToIdle(client = pool) {
  const query = `
    UPDATE user_modes
    SET current_mode = 'idle',
        session_id = NULL,
        updated_at = NOW()
    RETURNING user_id
  `;
  try {
    const { rows } = await client.query(query);
    return rows.map((row) => row.user_id);
  } catch (error) {
    logger.error('Failed to reset user modes to idle', error);
    throw error;
  }
}

/**
 * Gets expired focus sessions
 * @param {Date} referenceDate - Reference date for expiration check
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Array>} Array of expired sessions
 */
async function getExpiredFocusSessions(referenceDate = new Date(), client = pool) {
  const query = `
    SELECT id AS session_id,
           user_id,
           mode_label,
           started_at,
           expected_end,
           duration_minutes
    FROM focus_sessions
    WHERE ended_at IS NULL
      AND (
        (expected_end IS NOT NULL AND expected_end <= $1)
        OR (
          duration_minutes IS NOT NULL
          AND started_at + (duration_minutes::text || ' minutes')::interval <= $1
        )
      )
  `;
  try {
    const { rows } = await client.query(query, [referenceDate]);
    return rows.map((row) => ({
      sessionId: row.session_id,
      userId: row.user_id,
      mode: row.mode_label,
      startedAt: row.started_at,
      expectedEnd: row.expected_end,
      durationMinutes: row.duration_minutes
    }));
  } catch (error) {
    logger.error('Failed to get expired focus sessions', error);
    throw error;
  }
}

/**
 * Gets session summary parts for a session
 * @param {number} sessionId - Session ID
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object|null>} Session summary parts or null
 */
async function getSessionSummaryParts(sessionId, client = pool) {
  if (!sessionId) {
    return null;
  }

  const sessionQuery = `
    SELECT *
    FROM focus_sessions
    WHERE id = $1
  `;

  try {
    const { rows } = await client.query(sessionQuery, [sessionId]);
    if (!rows.length) {
      return null;
    }
    const session = rows[0];

    const [blockedMessages, transitions] = await Promise.all([
      client.query(
        `
          SELECT id, channel_id, message_preview, payload, created_at
          FROM blocked_messages
          WHERE session_id = $1
          ORDER BY created_at ASC
        `,
        [sessionId]
      ),
      client.query(
        `
          SELECT id, previous_mode, next_mode, reason, created_at
          FROM mode_transitions
          WHERE user_id = $1
            AND created_at BETWEEN $2 AND COALESCE($3, NOW())
          ORDER BY created_at ASC
        `,
        [session.user_id, session.started_at, session.ended_at]
      )
    ]);

    return {
      session,
      blockedMessages: blockedMessages.rows,
      transitions: transitions.rows
    };
  } catch (error) {
    logger.error('Failed to get session summary parts', error, { sessionId });
    throw error;
  }
}

/**
 * Stores session summary in audit events
 * @param {number} sessionId - Session ID
 * @param {Object} summary - Session summary
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Stored audit event
 */
async function storeSessionSummary(sessionId, summary, client = pool) {
  if (!sessionId || !summary) {
    throw new Error('Session ID and summary required');
  }

  return recordAuditEvent('focus_session_summary', { sessionId, summary }, client);
}

/**
 * Gets daily user session statistics
 * @param {Date|string} dayStart - Day start
 * @param {Date|string} dayEnd - Day end (optional)
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Array>} Array of user statistics
 */
async function getDailyUserSessionStats(dayStart, dayEnd, client = pool) {
  const start = new Date(dayStart);
  start.setHours(0, 0, 0, 0);
  const end = dayEnd ? new Date(dayEnd) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  end.setHours(23, 59, 59, 999);

  const sessionsQuery = `
    SELECT user_id,
           COUNT(*)::INT AS session_count,
           COALESCE(
             SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60)::INT,
             0
           ) AS duration_minutes,
           COALESCE(SUM(interruption_count)::INT, 0) AS interruptions
    FROM focus_sessions
    WHERE ended_at BETWEEN $1 AND $2
    GROUP BY user_id
  `;

  const blockedQuery = `
    SELECT fs.user_id,
           COUNT(bm.id)::INT AS blocked_count
    FROM blocked_messages bm
    JOIN focus_sessions fs ON fs.id = bm.session_id
    WHERE fs.ended_at BETWEEN $1 AND $2
    GROUP BY fs.user_id
  `;

  try {
    const [sessionsResult, blockedResult] = await Promise.all([
      client.query(sessionsQuery, [start, end]),
      client.query(blockedQuery, [start, end])
    ]);

    const blockedMap = new Map(
      blockedResult.rows.map((row) => [row.user_id, row.blocked_count])
    );

    return sessionsResult.rows.map((row) => ({
      userId: row.user_id,
      sessionCount: row.session_count,
      durationMinutes: row.duration_minutes,
      interruptions: row.interruptions,
      blockedMessages: blockedMap.get(row.user_id) || 0,
      dayStart: start,
      dayEnd: end
    }));
  } catch (error) {
    logger.error('Failed to get daily user session stats', error);
    throw error;
  }
}

/**
 * Gets pending meeting notes from audit events
 * @param {number} windowMinutes - Time window in minutes to look back
 * @param {number} limit - Max number of notes to return
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Array>} Array of pending meeting notes
 */
async function getPendingMeetingNotes(windowMinutes = 180, limit = 100, client = pool) {
  const minutes = Math.max(1, Number.parseInt(windowMinutes, 10) || 180);
  const cappedLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 100, 500));
  const query = `
    SELECT
      id,
      metadata ->> 'cliqUserId' AS cliq_user_id,
      metadata ->> 'note' AS note,
      created_at
    FROM audit_events
    WHERE event_name = 'focus_note_logged'
      AND COALESCE((metadata ->> 'processedByMeetingSummary')::BOOLEAN, FALSE) = FALSE
      AND created_at >= NOW() - ($1::text || ' minutes')::interval
    ORDER BY created_at ASC
    LIMIT $2
  `;
  const { rows } = await client.query(query, [String(minutes), cappedLimit]);
  return rows
    .filter((row) => row.note)
    .map((row) => ({
      id: row.id,
      userId: row.cliq_user_id,
      note: row.note,
      createdAt: row.created_at
    }));
}

/**
 * Marks meeting notes as summarized in audit events
 * @param {Array<number|string>} noteIds - Array of note IDs
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Array<number>>} Array of updated IDs
 */
async function markMeetingNotesSummarized(noteIds, client = pool) {
  if (!Array.isArray(noteIds) || !noteIds.length) {
    return [];
  }
  const query = `
    UPDATE audit_events
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{processedByMeetingSummary}',
      'true'::jsonb,
      true
    )
    WHERE id = ANY($1::int[])
      AND event_name = 'focus_note_logged'
    RETURNING id
  `;
  const { rows } = await client.query(query, [
    noteIds.map((id) => Number.parseInt(id, 10))
  ]);
  return rows.map((row) => row.id);
}

/**
 * Logs a conversation event
 * @param {Object} eventData - Event data
 * @param {string} [eventData.cliqUserId] - Cliq user ID
 * @param {string} [eventData.channelId] - Channel ID
 * @param {string} eventData.actionType - Type of action
 * @param {string} [eventData.messageText] - Text of the message
 * @param {Object} [eventData.metadata] - Extra metadata
 * @param {Object} client - Database client (optional)
 * @returns {Promise<Object>} Created conversation log
 */
async function logConversationEvent(
  { cliqUserId, channelId, actionType, messageText, metadata = {} },
  client = pool
) {
  if (!actionType) {
    throw new Error('Action type required for conversation event');
  }

  // Sanitize and truncate message text
  const sanitizedText = messageText ? String(messageText).slice(0, 1000) : null;

  const query = `
    INSERT INTO conversation_logs (cliq_user_id, channel_id, action_type, message_text, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, cliq_user_id, channel_id, action_type, message_text, metadata, created_at
  `;
  try {
    const { rows } = await client.query(query, [
      cliqUserId || null,
      channelId || null,
      actionType,
      sanitizedText,
      JSON.stringify(metadata)
    ]);
    return rows[0];
  } catch (error) {
    logger.error('Failed to log conversation event', error, { actionType });
    throw error;
  }
}

/**
 * Hydrates OAuth credential row with decrypted tokens
 * @private
 * @param {Object} row - Database row
 * @returns {Object} Credential object with decrypted tokens
 */
function hydrateCredential(row) {
  if (!row) {
    return null;
  }

  return {
    cliqUserId: row.cliq_user_id,
    zohoUserId: row.zoho_user_id,
    zohoEmail: row.zoho_email,
    accessToken: decrypt(row.access_token_enc),
    refreshToken: row.refresh_token_enc ? decrypt(row.refresh_token_enc) : null,
    tokenType: row.token_type,
    scope: row.scope,
    expiresAt: row.expires_at
  };
}

// Handle pool errors
pool.on('error', (error) => {
  logger.error('Unexpected database pool error', error);
  // Don't exit in production - let connection retry
  if (serverConfig.env.isProduction) {
    // Log to monitoring service
  }
});

// Handle pool connection events
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('acquire', () => {
  logger.debug('Database client acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Database client removed from pool');
});

module.exports = {
  pool,
  withTransaction,
  recordAuditEvent,
  upsertOAuthCredentials,
  getOAuthCredentialsByCliqUserId,
  updateAccessToken,
  listMissedMessages,
  listFocusModes,
  createFocusMode,
  findModeByIdentifier,
  getUserMode,
  upsertUserMode,
  createFocusSession,
  endActiveFocusSessions,
  endFocusSession,
  getActiveFocusSession,
  incrementSessionInterruptions,
  logModeTransition,
  recordBlockedMessage,
  getModeSummary,
  getAllUserModes,
  resetAllUserModesToIdle,
  getExpiredFocusSessions,
  getSessionSummaryParts,
  storeSessionSummary,
  getDailyUserSessionStats,
  getPendingMeetingNotes,
  markMeetingNotesSummarized,
  logConversationEvent
};
