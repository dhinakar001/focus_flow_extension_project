/**
 * Handles OAuth workflows for Zoho Cliq integration.
 */
const crypto = require('crypto');
const { URL } = require('url');
const cliqApi = require('../services/cliqApi');
const dbService = require('../services/dbService');
const serverConfig = require('../server.config');
const logger = require('../utils/logger');

const STATE_SECRET = serverConfig.security.stateSecret;
if (!STATE_SECRET) {
  throw new Error('OAUTH_STATE_SECRET environment variable is required.');
}

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function base64UrlDecode(value) {
  const padLength = (4 - (value.length % 4)) % 4;
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLength);
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function signState(payload) {
  const serialized = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', STATE_SECRET).update(serialized).digest('hex');
  return `${serialized}.${signature}`;
}

function verifyState(state) {
  const [serialized, signature] = state.split('.');
  if (!serialized || !signature) {
    throw new Error('Malformed OAuth state received.');
  }
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(serialized).digest('hex');
  const providedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (providedBuffer.length !== expectedBuffer.length) {
    throw new Error('Invalid OAuth state detected.');
  }
  const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  if (!isValid) {
    throw new Error('Invalid OAuth state detected.');
  }
  const decoded = base64UrlDecode(serialized);
  const payload = JSON.parse(decoded);
  if (!payload.issuedAt || Date.now() - payload.issuedAt > serverConfig.security.stateTtlMs) {
    throw new Error('OAuth state has expired. Please retry linking.');
  }
  return payload;
}

function isAllowedRedirect(candidate) {
  if (!candidate) return false;
  try {
    const base = new URL(serverConfig.oauth.redirectUri);
    const target = new URL(candidate);
    return base.origin === target.origin;
  } catch (error) {
    logger.warn('[AuthController] Invalid redirect URI requested', error);
    return false;
  }
}

function buildSuccessRedirect(target) {
  if (isAllowedRedirect(target)) {
    return target;
  }
  const base = new URL(serverConfig.oauth.redirectUri);
  base.searchParams.set('status', 'linked');
  return base.toString();
}

/**
 * Initiates the Zoho OAuth flow by redirecting users to the authorization screen.
 */
async function beginOAuth(req, res, next) {
  try {
    const { cliqUserId, redirectUri: postAuthRedirect } = req.query;
    if (!cliqUserId) {
      return res.status(400).json({ error: 'cliqUserId query parameter is required.' });
    }

    const state = signState({
      cliqUserId,
      redirectUri: postAuthRedirect || null,
      nonce: crypto.randomUUID(),
      issuedAt: Date.now()
    });
    const authorizationUrl = cliqApi.generateAuthorizationUrl({ state });
    return res.redirect(authorizationUrl);
  } catch (error) {
    logger.error('[AuthController] Failed to initiate OAuth', error);
    return next(error);
  }
}

/**
 * Handles the Zoho OAuth callback and persists tokens securely.
 */
async function handleOAuthCallback(req, res, next) {
  const { code, state, error, error_description: errorDescription } = req.query;
  if (error) {
    return res.status(400).json({ error, description: errorDescription });
  }
  try {
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state.' });
    }

    const { cliqUserId, redirectUri } = verifyState(state);
    const tokenPayload = await cliqApi.exchangeCodeForToken(code);
    const userProfile = await cliqApi.fetchCliqUserProfile(tokenPayload.access_token);

    await dbService.upsertOAuthCredentials({
      cliqUserId,
      zohoUserId: userProfile?.id,
      email: userProfile?.email_id || userProfile?.email || null,
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token,
      expiresIn: tokenPayload.expires_in,
      scope: tokenPayload.scope,
      tokenType: tokenPayload.token_type
    });

    await dbService.recordAuditEvent('oauth_linked', {
      cliqUserId,
      zohoUserId: userProfile?.id
    });

    const target = buildSuccessRedirect(redirectUri);
    return res.redirect(target);
  } catch (err) {
    logger.error('[AuthController] OAuth callback failure', err);
    return next(err);
  }
}

/**
 * Refreshes a user's access token using the stored refresh token.
 */
async function refreshToken(req, res, next) {
  try {
    const { cliqUserId } = req.body;
    if (!cliqUserId) {
      return res.status(400).json({ error: 'cliqUserId is required in the request body.' });
    }

    const credentials = await dbService.getOAuthCredentialsByCliqUserId(cliqUserId);
    if (!credentials?.refreshToken) {
      return res.status(404).json({ error: 'No refresh token stored for the specified user.' });
    }

    const tokenPayload = await cliqApi.refreshAccessToken(credentials.refreshToken);
    const updated = await dbService.updateAccessToken(cliqUserId, {
      accessToken: tokenPayload.access_token,
      expiresIn: tokenPayload.expires_in,
      scope: tokenPayload.scope || credentials.scope,
      tokenType: tokenPayload.token_type || credentials.tokenType
    });

    await dbService.recordAuditEvent('oauth_token_refreshed', { cliqUserId });

    return res.json({
      cliqUserId: updated.cliqUserId,
      expiresAt: updated.expiresAt,
      tokenType: updated.tokenType,
      scope: updated.scope
    });
  } catch (error) {
    logger.error('[AuthController] Token refresh failure', error);
    return next(error);
  }
}

module.exports = {
  beginOAuth,
  handleOAuthCallback,
  refreshToken
};

