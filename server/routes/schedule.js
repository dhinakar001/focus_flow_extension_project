/**
 * Schedule Routes
 * 
 * API endpoints for scheduling focus sessions
 * 
 * @module routes/schedule
 */

const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger').child('ScheduleRoute');

// All routes require authentication
router.use(authenticate);

/**
 * GET /schedule
 * Get schedule overview
 */
router.get('/', scheduleController.getSchedule);

module.exports = router;
