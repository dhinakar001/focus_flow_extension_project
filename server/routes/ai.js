/**
 * Routes for AI-powered features
 */
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middlewares/authMiddleware');

// All AI routes require authentication
router.use(authMiddleware.basicAuthPlaceholder);

// Focus Coach routes
router.post('/focus-coach/summarize', aiController.summarizeTasks);
router.post('/focus-coach/generate-plan', aiController.generateFocusPlan);

// Distraction Detector routes
router.post('/distraction-detector/analyze', aiController.analyzeDistractions);

// Time Predictor routes
router.post('/time-predictor/predict', aiController.predictTaskDuration);
router.post('/time-predictor/batch-predict', aiController.batchPredictDurations);

// Smart Suggestions routes
router.post('/smart-suggestions/generate', aiController.generateSmartSuggestions);
router.get('/smart-suggestions/:userId', aiController.generateSmartSuggestions);

// Health check
router.get('/health', aiController.checkAIHealth);

module.exports = router;

