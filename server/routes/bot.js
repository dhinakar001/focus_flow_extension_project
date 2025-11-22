/**
 * Routes for handling incoming bot events from Zoho Cliq.
 */
const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

router.use(express.json({ limit: '1mb' }));
router.use(express.urlencoded({ extended: true }));

router.post('/ping', botController.handlePing);
router.post('/slash', botController.handleSlashCommand);
router.post('/actions', botController.handleMessageAction);
router.post('/events', botController.handleBotReply);

module.exports = router;
