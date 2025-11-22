/**
 * Bot Controller
 * 
 * Handles incoming bot events from Zoho Cliq including slash commands,
 * message actions, and bot replies.
 * 
 * @module controllers/botController
 */

const cliqApi = require('../services/cliqApi');
const dbService = require('../services/dbService');
const modeService = require('../services/modeService');
const logger = require('../utils/logger').child('BotController');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Normalizes payload from various formats (string, object, nested)
 * @private
 * @param {string|Object} payload - Raw payload
 * @returns {Object} Normalized payload object
 */
function normalizePayload(payload) {
  if (!payload) return {};
  
  // Handle string payload
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch (error) {
      logger.warn('Unable to parse JSON payload string', { error: error.message });
      return {};
    }
  }
  
  // Handle nested payload
  if (payload.payload && typeof payload.payload === 'string') {
    return normalizePayload(payload.payload);
  }
  
  return payload;
}

/**
 * Parses command text into action and arguments
 * @private
 * @param {string} text - Command text
 * @returns {Object} Parsed command with action and args
 */
function parseCommandText(text = '') {
  const trimmed = text.trim();
  if (!trimmed) {
    return { action: 'status', args: [] };
  }
  
  const parts = trimmed.split(/\s+/);
  const action = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  return { action, args };
}

/**
 * Resolves a mode name to a mode object
 * @private
 * @param {string} modeName - Mode name to resolve
 * @returns {Promise<Object>} Mode object
 * @throws {Error} If mode not found
 */
async function resolveMode(modeName) {
  if (!modeName) {
    throw new Error('Please specify the mode name');
  }
  
  const modes = await modeService.fetchModes();
  const normalized = modeName.toLowerCase();
  
  const match = modes.find(
    (mode) =>
      mode.id?.toString().toLowerCase() === normalized ||
      mode.name?.toLowerCase() === normalized ||
      mode.slug?.toLowerCase() === normalized
  );
  
  if (!match) {
    const availableModes = modes.map(m => m.name || m.slug).join(', ');
    throw new Error(
      `Unknown mode "${modeName}". Use /focusflow mode list to view available modes. Available: ${availableModes}`
    );
  }
  
  return match;
}

/**
 * Logs a conversation event for analytics
 * @private
 * @param {string} eventName - Event name
 * @param {Object} payload - Event payload
 * @param {Object} response - Response data
 */
async function logConversationEvent(eventName, payload, response) {
  try {
    await dbService.logConversationEvent({
      cliqUserId: payload.user?.id || payload.user_id,
      channelId: payload.channel_id || payload.channel?.id,
      actionType: eventName,
      messageText: payload.text || payload.command || payload.action?.name,
      metadata: {
        command: payload.command,
        action: payload.action?.name,
        response: response.message?.substring(0, 100) // Truncate long responses
      }
    });
  } catch (error) {
    logger.error('Failed to log conversation event', error, { eventName });
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Handles bot ping events from Zoho Cliq
 * 
 * POST /bot/ping
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function handlePing(req, res, next) {
  try {
    // Handle challenge-response verification
    if (req.body?.challenge) {
      logger.debug('Bot ping challenge received');
      return res.json({ challenge: req.body.challenge });
    }
    
    logger.info('Bot ping received', { body: req.body });
    return res.json({
      message: 'FocusFlow bot is operational.',
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Bot ping handler failed', error);
    return next(error);
  }
}

/**
 * Handles slash command invocations
 * 
 * POST /bot/slash
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function handleSlashCommand(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    
    if (!payload.command) {
      return res.status(400).json({ 
        error: 'Invalid slash command payload',
        message: 'Command field is required'
      });
    }
    
    const { action, args } = parseCommandText(payload.text || '');
    logger.info('Slash command received', { command: payload.command, action, args });
    
    let response;
    
    // Route to appropriate command handler
    switch (action) {
      case 'mode':
        response = await handleModeCommand(args, payload);
        break;
      case 'log':
        response = await handleLogCommand(args, payload);
        break;
      case 'status':
        response = await buildStatusResponse(payload);
        break;
      default:
        response = buildHelpResponse();
    }
    
    // Log the command
    await logConversationEvent('slash_command', payload, response);
    
    // Send response via response URL if available
    if (payload.response_url) {
      await cliqApi.respondToSlashCommand({
        responseUrl: payload.response_url,
        message: response.message,
        sections: response.sections,
        buttons: response.buttons
      });
      return res.json({ status: 'processed' });
    }
    
    // Otherwise return directly
    return res.json(response);
  } catch (error) {
    logger.error('Slash command handler failed', error, { body: req.body });
    return next(error);
  }
}

/**
 * Handles mode-related slash commands
 * @private
 * @param {Array<string>} args - Command arguments
 * @param {Object} payload - Full payload object
 * @returns {Promise<Object>} Response object
 */
async function handleModeCommand(args, payload) {
  const [subcommand, ...rest] = args;
  const userDisplayName = payload.user?.name || payload.user_name || 'User';
  const cliqUserId = payload.user?.id || payload.user_id;
  
  if (!subcommand) {
    throw new Error('Usage: /focusflow mode <start|stop|list> [modeName]');
  }
  
  // List available modes
  if (subcommand === 'list') {
    const modes = await modeService.fetchModes();
    return {
      message: 'Available focus modes',
      sections: [
        {
          title: 'Modes',
          content: modes.map((mode) => 
            `• ${mode.name} – ${mode.durationMinutes} min${mode.description ? ` - ${mode.description}` : ''}`
          ).join('\n')
        }
      ]
    };
  }
  
  // Start a mode
  if (subcommand === 'start') {
    const modeName = rest.join(' ') || args[1];
    if (!modeName) {
      throw new Error('Please specify a mode name: /focusflow mode start <modeName>');
    }
    
    const mode = await resolveMode(modeName);
    
    // Start the focus mode if it's a focus mode
    if (mode.slug === 'focus' || mode.name?.toLowerCase() === 'focus') {
      if (cliqUserId) {
        await modeService.startFocusMode(cliqUserId, mode.durationMinutes);
      }
    }
    
    await dbService.recordAuditEvent('bot_mode_started', {
      cliqUserId,
      mode: mode.id,
      modeName: mode.name
    });
    
    return {
      message: `${userDisplayName} started ${mode.name}. Stay focused!`,
      buttons: [
        {
          label: 'Stop Session',
          name: 'mode:stop',
          value: mode.id.toString()
        }
      ]
    };
  }
  
  // Stop current session
  if (subcommand === 'stop') {
    if (cliqUserId) {
      await modeService.stopFocusMode(cliqUserId);
    }
    
    await dbService.recordAuditEvent('bot_mode_stopped', {
      cliqUserId
    });
    
    return {
      message: `${userDisplayName} ended the active focus session.`,
      buttons: [
        {
          label: 'Start Deep Work',
          name: 'mode:start',
          value: 'focus'
        }
      ]
    };
  }
  
  throw new Error(`Unsupported mode action "${subcommand}". Use: list, start, or stop`);
}

/**
 * Handles log command for note-taking
 * @private
 * @param {Array<string>} args - Command arguments
 * @param {Object} payload - Full payload object
 * @returns {Promise<Object>} Response object
 */
async function handleLogCommand(args, payload) {
  const note = args.join(' ').trim();
  const cliqUserId = payload.user?.id || payload.user_id;
  
  if (!note) {
    throw new Error('Provide a note to log: /focusflow log <message>');
  }
  
  await dbService.recordAuditEvent('focus_note_logged', {
    cliqUserId,
    note
  });
  
  return {
    message: 'Your note was logged successfully.',
    sections: [
      {
        title: 'Logged Note',
        content: note
      }
    ]
  };
}

/**
 * Builds status response showing current state
 * @private
 * @param {Object} payload - Payload object
 * @returns {Promise<Object>} Response object
 */
async function buildStatusResponse(payload) {
  const cliqUserId = payload.user?.id || payload.user_id;
  let currentMode = null;
  
  if (cliqUserId) {
    try {
      currentMode = await modeService.getCurrentMode(cliqUserId);
    } catch (error) {
      logger.warn('Failed to get current mode for status', error);
    }
  }
  
  const modes = await modeService.fetchModes();
  const nextSession = modes[0];
  
  const sections = [];
  
  if (currentMode) {
    sections.push({
      title: 'Current Mode',
      content: currentMode.currentMode === 'focus' 
        ? `Focus mode active (Session ID: ${currentMode.sessionId || 'N/A'})`
        : `Mode: ${currentMode.currentMode}`
    });
  }
  
  if (nextSession) {
    sections.push({
      title: 'Available Modes',
      content: `Default: ${nextSession.name} (${nextSession.durationMinutes} minutes)`
    });
  }
  
  sections.push({
    title: 'Commands',
    content: '/focusflow mode list\n/focusflow mode start <name>\n/focusflow mode stop'
  });
  
  return {
    message: 'FocusFlow Status',
    sections
  };
}

/**
 * Builds help response with available commands
 * @private
 * @returns {Object} Response object
 */
function buildHelpResponse() {
  return {
    message: 'FocusFlow Commands',
    sections: [
      {
        title: 'Slash Commands',
        content: [
          '/focusflow mode list - View available modes',
          '/focusflow mode start <name> - Start a focus session',
          '/focusflow mode stop - Stop current session',
          '/focusflow log <message> - Log a note',
          '/focusflow status - View current status'
        ].join('\n')
      },
      {
        title: 'Help',
        content: 'Type /focusflow mode list to see all available focus modes.'
      }
    ]
  };
}

/**
 * Handles message action button clicks
 * 
 * POST /bot/actions
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function handleMessageAction(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    const actionName = payload.action?.name || payload.action_id;
    const cliqUserId = payload.user?.id || payload.user_id;
    const userDisplayName = payload.user?.name || payload.user_name || 'A user';
    
    if (!actionName) {
      return res.status(400).json({ 
        error: 'Action payload missing action identifier',
        message: 'action.name or action_id is required'
      });
    }
    
    logger.info('Message action received', { actionName, cliqUserId });
    
    let message = `${userDisplayName} acknowledged the action.`;
    
    // Handle mode start action
    if (actionName === 'mode:start' && payload.action?.value) {
      try {
        const mode = await resolveMode(payload.action.value);
        
        if (cliqUserId) {
          await modeService.startFocusMode(cliqUserId, mode.durationMinutes);
        }
        
        await dbService.recordAuditEvent('bot_mode_started_via_action', {
          cliqUserId,
          mode: mode.id
        });
        
        message = `${userDisplayName} started ${mode.name}. Stay focused!`;
      } catch (error) {
        logger.error('Failed to start mode via action', error);
        message = `Failed to start mode: ${error.message}`;
      }
    }
    
    // Handle mode stop action
    if (actionName === 'mode:stop') {
      if (cliqUserId) {
        await modeService.stopFocusMode(cliqUserId);
      }
      
      await dbService.recordAuditEvent('bot_mode_stopped_via_action', {
        cliqUserId
      });
      
      message = `${userDisplayName} stopped the current session.`;
    }
    
    // Log the action
    await logConversationEvent('message_action', payload, { message });
    
    // Send response via response URL if available
    if (payload.response_url) {
      await cliqApi.respondToMessageAction({
        responseUrl: payload.response_url,
        message
      });
      return res.json({ status: 'processed' });
    }
    
    return res.json({ message });
  } catch (error) {
    logger.error('Message action handler failed', error, { body: req.body });
    return next(error);
  }
}

/**
 * Handles bot reply events
 * 
 * POST /bot/events
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
async function handleBotReply(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    
    if (!payload.message) {
      logger.debug('Bot reply event ignored - no message', { payload: !!payload });
      return res.status(200).json({ status: 'ignored' });
    }
    
    logger.debug('Bot reply event received', { 
      hasMessage: !!payload.message,
      hasChannel: !!payload.message?.channel_id,
      hasUser: !!payload.message?.user 
    });
    
    const replyMessage = `Thanks ${payload.message.user?.name || 'there'}! FocusFlow recorded your update.`;
    const accessToken = payload.bot?.access_token;
    const channelId = payload.message?.channel_id || payload.channel_id;
    
    // Send response via response URL if available (preferred)
    if (payload.response_url) {
      await cliqApi.respondToMessageAction({
        responseUrl: payload.response_url,
        message: replyMessage
      });
    } else if (accessToken && channelId) {
      // Fallback to sending via channel API
      await cliqApi.sendChannelMessage({
        accessToken,
        channelId,
        text: replyMessage
      });
    } else {
      logger.warn('Bot reply event - no way to respond', { 
        hasResponseUrl: !!payload.response_url,
        hasAccessToken: !!accessToken,
        hasChannelId: !!channelId
      });
    }
    
    await logConversationEvent('bot_reply', payload, { message: replyMessage });
    return res.json({ delivered: true });
  } catch (error) {
    logger.error('Bot reply handler failed', error, { body: req.body });
    return next(error);
  }
}

module.exports = {
  handlePing: asyncHandler(handlePing),
  handleSlashCommand: asyncHandler(handleSlashCommand),
  handleMessageAction: asyncHandler(handleMessageAction),
  handleBotReply: asyncHandler(handleBotReply)
};
