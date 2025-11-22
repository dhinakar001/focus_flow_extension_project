/**
 * Focus Mode Routes
 * 
 * API endpoints for managing focus modes and sessions
 * 
 * @module routes/modes
 */

const express = require('express');
const router = express.Router();
const modeController = require('../controllers/modeController');
const { authenticate, optionalAuth } = require('../middlewares/authMiddleware');
const { validate, validators } = require('../middlewares/inputValidation');
const { csrfProtect } = require('../middlewares/csrf');

// All routes use JSON parsing
router.use(express.json({ limit: '1mb' }));

// Public routes (for backward compatibility)
router.get('/', optionalAuth, modeController.listModes);

// Protected routes - require authentication
router.use(authenticate);

// Apply CSRF protection to state-changing requests
router.post('/', csrfProtect, validate([validators.modeName, validators.duration]), modeController.createMode);
router.post('/start', csrfProtect, validate([validators.userId]), modeController.startMode);
router.post('/stop', csrfProtect, validate([validators.userId]), modeController.stopMode);
router.post('/set', csrfProtect, validate([validators.userId]), modeController.setMode);
router.get('/current/:userId?', validate([validators.userId]), modeController.getCurrentMode);
router.post('/message', csrfProtect, validate([validators.userId]), modeController.handleMessage);
router.get('/summary/:userId?', validate([validators.userId]), modeController.getSummary);

module.exports = router;
