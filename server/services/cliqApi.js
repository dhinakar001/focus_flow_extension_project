/**
 * Zoho Cliq API Service
 * 
 * Handles all interactions with Zoho Cliq API including OAuth flows,
 * message sending, and bot responses.
 * 
 * @module services/cliqApi
 * @requires axios
 * @requires url
 */

const axios = require('axios');
const { URL, URLSearchParams } = require('url');
const serverConfig = require('../server.config');
const logger = require('../utils/logger').child('CliqAPI');

// Axios instance with default configuration
const apiClient = axios.create({
  baseURL: serverConfig.cliq.apiBaseUrl,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Validates that OAuth configuration is complete
 * @private
 * @throws {Error} If OAuth configuration is incomplete
 */
function validateOAuthConfig() {
  const { clientId, clientSecret, redirectUri } = serverConfig.oauth;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'OAuth configuration is incomplete. Verify ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REDIRECT_URI environment variables.'
    );
  }
}

/**
 * Wraps Axios errors with context information
 * @private
 * @param {string} message - Error message
 * @param {Error} error - Original error
 * @returns {Error} Enhanced error object
 */
function wrapAxiosError(message, error) {
  const enhancedError = new Error(message);
  enhancedError.name = 'CliqApiError';
  enhancedError.statusCode = error.response?.status || 500;
  enhancedError.details = error.response?.data || error.message;
  enhancedError.originalError = error;
  return enhancedError;
}

/**
 * Generates the Zoho authorization URL for OAuth consent flow
 * 
 * @param {Object} options - Authorization options
 * @param {string} options.state - CSRF prevention token (required)
 * @param {string[]} [options.scopes] - Optional scope override
 * @returns {string} Complete authorization URL
 * @throws {Error} If state parameter is missing or OAuth config is invalid
 * 
 * @example
 * const authUrl = generateAuthorizationUrl({ state: 'csrf-token-123' });
 */
function generateAuthorizationUrl({ state, scopes } = {}) {
  validateOAuthConfig();
  
  if (!state) {
    throw new Error('State parameter is required for OAuth authorization URL generation');
  }

  try {
    const url = new URL(serverConfig.oauth.authorizeUrl);
    url.searchParams.set('scope', (scopes || serverConfig.oauth.scopes).join(','));
    url.searchParams.set('client_id', serverConfig.oauth.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', serverConfig.oauth.redirectUri);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    
    logger.debug('Generated authorization URL', { hasState: !!state, scopeCount: (scopes || serverConfig.oauth.scopes).length });
    return url.toString();
  } catch (error) {
    logger.error('Failed to generate authorization URL', error);
    throw new Error(`Invalid OAuth configuration: ${error.message}`);
  }
}

/**
 * Builds request body for token exchange endpoints
 * @private
 * @param {Object} params - Parameters to include in request body
 * @returns {string} URL-encoded request body
 */
function buildTokenRequestBody(params) {
  validateOAuthConfig();
  
  return new URLSearchParams({
    client_id: serverConfig.oauth.clientId,
    client_secret: serverConfig.oauth.clientSecret,
    redirect_uri: serverConfig.oauth.redirectUri,
    ...params
  }).toString();
}

/**
 * Exchanges an authorization code for access and refresh tokens
 * 
 * @param {string} code - Authorization code returned by Zoho
 * @returns {Promise<Object>} Zoho OAuth token payload
 * @throws {CliqApiError} If token exchange fails
 * 
 * @example
 * const tokens = await exchangeCodeForToken('auth-code-123');
 * // Returns: { access_token, refresh_token, expires_in, ... }
 */
async function exchangeCodeForToken(code) {
  validateOAuthConfig();
  
  if (!code) {
    throw new Error('Authorization code is required');
  }

  try {
    logger.debug('Exchanging authorization code for tokens');
    const response = await axios.post(
      serverConfig.oauth.tokenUrl,
      buildTokenRequestBody({ grant_type: 'authorization_code', code }),
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      }
    );
    
    logger.info('Successfully exchanged authorization code for tokens');
    return response.data;
  } catch (error) {
    logger.error('Failed to exchange authorization code', error, { hasCode: !!code });
    throw wrapAxiosError('Failed to exchange authorization code with Zoho', error);
  }
}

/**
 * Refreshes an OAuth access token using a stored refresh token
 * 
 * @param {string} refreshToken - Stored refresh token
 * @returns {Promise<Object>} New token payload
 * @throws {CliqApiError} If token refresh fails
 * 
 * @example
 * const newTokens = await refreshAccessToken('refresh-token-123');
 */
async function refreshAccessToken(refreshToken) {
  validateOAuthConfig();
  
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  try {
    logger.debug('Refreshing access token');
    const response = await axios.post(
      serverConfig.oauth.tokenUrl,
      buildTokenRequestBody({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      }
    );
    
    logger.info('Successfully refreshed access token');
    return response.data;
  } catch (error) {
    logger.error('Failed to refresh access token', error);
    throw wrapAxiosError('Failed to refresh the Zoho access token', error);
  }
}

/**
 * Retrieves the Zoho Cliq user profile associated with an access token
 * 
 * @param {string} accessToken - OAuth bearer token
 * @returns {Promise<Object>} User profile object
 * @throws {CliqApiError} If profile fetch fails
 * 
 * @example
 * const profile = await fetchCliqUserProfile('access-token-123');
 */
async function fetchCliqUserProfile(accessToken) {
  if (!accessToken) {
    throw new Error('Access token is required to fetch user profile');
  }

  try {
    logger.debug('Fetching Cliq user profile');
    const response = await apiClient.get('/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    logger.info('Successfully fetched Cliq user profile', { userId: response.data?.id });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch Cliq user profile', error);
    throw wrapAxiosError('Failed to fetch Zoho Cliq user profile', error);
  }
}

/**
 * Builds a message payload for Cliq card or text responses
 * @private
 * @param {Object} options - Message options
 * @param {string} [options.message] - Text message
 * @param {Array} [options.sections] - Card sections
 * @param {Array} [options.buttons] - Card buttons
 * @returns {Object} Formatted message payload
 */
function buildMessagePayload({ message, sections = [], buttons = [] } = {}) {
  // Use card format if sections or buttons are provided
  if (sections.length > 0 || buttons.length > 0) {
    return {
      card: {
        theme: 'modern',
        title: message || 'FocusFlow',
        sections,
        buttons
      }
    };
  }
  
  // Otherwise use simple text format
  return { text: message || 'FocusFlow update' };
}

/**
 * Posts a response payload to a Cliq response URL
 * @private
 * @param {string} responseUrl - Response URL provided by Cliq
 * @param {Object} payload - Response payload
 * @returns {Promise<Object>} Response data
 * @throws {Error} If response URL is missing or request fails
 */
async function postResponsePayload(responseUrl, payload) {
  if (!responseUrl) {
    throw new Error('Response URL is required to post a response back to Zoho Cliq');
  }

  try {
    logger.debug('Posting response to Cliq', { responseUrl, hasPayload: !!payload });
    const response = await axios.post(responseUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to post response to Cliq', error, { responseUrl });
    throw wrapAxiosError('Failed to post a response back to Zoho Cliq', error);
  }
}

/**
 * Sends a response to a slash command invocation via response URL
 * 
 * @param {Object} options - Response options
 * @param {string} options.responseUrl - Temporary response URL provided by Zoho Cliq
 * @param {string} [options.message] - Text message to display
 * @param {Array<Object>} [options.sections] - Card sections for rich formatting
 * @param {Array<Object>} [options.buttons] - Card buttons for interactions
 * @returns {Promise<Object>} Response data
 * @throws {CliqApiError} If response fails
 * 
 * @example
 * await respondToSlashCommand({
 *   responseUrl: 'https://cliq.zoho.com/...',
 *   message: 'Focus mode started!',
 *   buttons: [{ label: 'Stop', name: 'stop' }]
 * });
 */
async function respondToSlashCommand({ responseUrl, message, sections, buttons }) {
  const payload = buildMessagePayload({ message, sections, buttons });
  return postResponsePayload(responseUrl, payload);
}

/**
 * Sends a response to a message action using the provided response URL
 * 
 * @param {Object} options - Response options
 * @param {string} options.responseUrl - Response URL from action
 * @param {string} [options.message] - Response message
 * @param {Array<Object>} [options.sections] - Optional card sections
 * @param {Array<Object>} [options.buttons] - Optional card buttons
 * @returns {Promise<Object>} Response data
 */
async function respondToMessageAction({ responseUrl, message, sections, buttons }) {
  const payload = buildMessagePayload({ message, sections, buttons });
  return postResponsePayload(responseUrl, payload);
}

/**
 * Makes an authenticated API call to Zoho Cliq
 * @private
 * @param {Object} options - API call options
 * @param {string} options.method - HTTP method
 * @param {string} options.path - API path
 * @param {Object} [options.data] - Request body
 * @param {string} options.accessToken - OAuth access token
 * @returns {Promise<Object>} Response data
 * @throws {Error} If access token is missing or request fails
 */
async function callAuthorizedApi({ method, path, data, accessToken }) {
  if (!accessToken) {
    throw new Error('A valid access token is required for Cliq API calls');
  }

  try {
    logger.debug('Making authorized API call', { method, path });
    const response = await apiClient({
      method: method.toLowerCase(),
      url: path,
      data,
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    logger.error('Authorized API call failed', error, { method, path });
    throw wrapAxiosError(`Cliq API request to ${path} failed`, error);
  }
}

/**
 * Sends a bot message to a given channel using OAuth token
 * 
 * @param {Object} options - Message options
 * @param {string} options.accessToken - OAuth bearer token
 * @param {string} options.channelId - Target channel ID (required)
 * @param {string} options.text - Message text
 * @param {Array} [options.attachments] - Optional attachments
 * @returns {Promise<Object>} Response data
 * @throws {Error} If channel ID is missing or request fails
 * 
 * @example
 * await sendChannelMessage({
 *   accessToken: 'token',
 *   channelId: 'channel-123',
 *   text: 'Focus mode activated!'
 * });
 */
async function sendChannelMessage({ accessToken, channelId, text, attachments }) {
  if (!channelId) {
    throw new Error('channelId is required when sending a channel message');
  }

  return callAuthorizedApi({
    method: 'POST',
    path: `/channels/${encodeURIComponent(channelId)}/message`,
    data: { text, attachments },
    accessToken
  });
}

/**
 * Sends a direct message to a user on Zoho Cliq
 * 
 * @param {Object} options - Message options
 * @param {string} options.accessToken - OAuth bearer token
 * @param {string} options.userId - Target user ID (required)
 * @param {string} options.text - Message text
 * @returns {Promise<Object>} Response data
 * @throws {Error} If user ID is missing or request fails
 * 
 * @example
 * await sendDirectMessage({
 *   accessToken: 'token',
 *   userId: 'user-123',
 *   text: 'Your focus session has ended'
 * });
 */
async function sendDirectMessage({ accessToken, userId, text }) {
  if (!userId) {
    throw new Error('userId is required when sending a direct message');
  }

  return callAuthorizedApi({
    method: 'POST',
    path: `/im/${encodeURIComponent(userId)}/message`,
    data: { text },
    accessToken
  });
}

module.exports = {
  generateAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  fetchCliqUserProfile,
  respondToSlashCommand,
  respondToMessageAction,
  sendChannelMessage,
  sendDirectMessage
};
