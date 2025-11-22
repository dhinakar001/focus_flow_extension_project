/**
 * Controller for AI-powered features
 */
const aiService = require('../services/aiService');
const dbService = require('../services/dbService');
const logger = require('../utils/logger');

/**
 * Summarize tasks using AI Focus Coach
 */
async function summarizeTasks(req, res, next) {
  try {
    const { tasks } = req.body || {};
    
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        error: 'Tasks array is required',
      });
    }

    const summary = await aiService.summarizeTasks(tasks);
    
    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('[AIController] summarizeTasks failed', error);
    return next(error);
  }
}

/**
 * Generate focus plan using AI Focus Coach
 */
async function generateFocusPlan(req, res, next) {
  try {
    const { userId, tasks, userPreferences, availableHours } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        error: 'Tasks array is required',
      });
    }

    // Get user preferences from profile if not provided
    let preferences = userPreferences;
    if (!preferences) {
      const profile = await dbService.getUserProductivityProfile(userId);
      if (profile) {
        preferences = {
          peak_productivity_hours: profile.peak_productivity_hours || [9, 10, 11, 14, 15, 16],
          preferred_focus_duration: profile.preferred_focus_duration || 50,
        };
      }
    }

    const plan = await aiService.generateFocusPlan(tasks, preferences, availableHours);
    
    return res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('[AIController] generateFocusPlan failed', error);
    return next(error);
  }
}

/**
 * Analyze distractions using AI Distraction Detector
 */
async function analyzeDistractions(req, res, next) {
  try {
    const { userId, timeWindowHours = 24 } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    // Fetch activity patterns from database
    const activities = await dbService.getActivityPatterns(userId, timeWindowHours);
    
    if (!activities || activities.length === 0) {
      return res.json({
        success: true,
        data: {
          error: 'No activity patterns found for the specified time window',
          total_activities: 0,
        },
      });
    }

    const analysis = await aiService.analyzeDistractions(activities, timeWindowHours);
    
    return res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('[AIController] analyzeDistractions failed', error);
    return next(error);
  }
}

/**
 * Predict task duration using AI Time Predictor
 */
async function predictTaskDuration(req, res, next) {
  try {
    const { userId, task } = req.body || {};
    
    if (!userId || !task) {
      return res.status(400).json({
        error: 'userId and task are required',
      });
    }

    // Fetch historical data and user profile
    const [historicalData, userProfile] = await Promise.all([
      dbService.getTaskHistory(userId, 50), // Last 50 tasks
      dbService.getUserProductivityProfile(userId),
    ]);

    const prediction = await aiService.predictTaskDuration(
      task,
      historicalData,
      userProfile
    );

    // Store prediction in database
    await dbService.storeTimePrediction({
      user_id: userId,
      task_id: task.id,
      predicted_minutes: prediction.predicted_minutes,
      confidence_score: prediction.confidence_score,
      model_version: prediction.model_version,
      input_features: prediction.input_features,
    });
    
    return res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    logger.error('[AIController] predictTaskDuration failed', error);
    return next(error);
  }
}

/**
 * Batch predict task durations
 */
async function batchPredictDurations(req, res, next) {
  try {
    const { userId, tasks } = req.body || {};
    
    if (!userId || !tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        error: 'userId and tasks array are required',
      });
    }

    // Fetch historical data and user profile
    const [historicalData, userProfile] = await Promise.all([
      dbService.getTaskHistory(userId, 50),
      dbService.getUserProductivityProfile(userId),
    ]);

    const predictions = await aiService.batchPredictDurations(
      tasks,
      historicalData,
      userProfile
    );

    // Store predictions in database
    await Promise.all(
      predictions.map((prediction) =>
        dbService.storeTimePrediction({
          user_id: userId,
          task_id: prediction.task_id,
          predicted_minutes: prediction.predicted_minutes,
          confidence_score: prediction.confidence_score,
          model_version: prediction.model_version,
          input_features: prediction.input_features,
        })
      )
    );
    
    return res.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    logger.error('[AIController] batchPredictDurations failed', error);
    return next(error);
  }
}

/**
 * Generate smart suggestions
 */
async function generateSmartSuggestions(req, res, next) {
  try {
    const { userId } = req.body || req.params || {};
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    // Fetch user data
    const [productivityData, focusSessions, tasks, activityPatterns] = await Promise.all([
      dbService.getUserProductivityProfile(userId),
      dbService.getRecentFocusSessions(userId, 30), // Last 30 sessions
      dbService.getUserTasks(userId, 'active'), // Active tasks
      dbService.getActivityPatterns(userId, 168), // Last 7 days
    ]);

    const suggestions = await aiService.generateSmartSuggestions(userId, {
      productivityData,
      focusSessions,
      tasks,
      activityPatterns,
    });

    // Store suggestions in database
    await Promise.all(
      suggestions.map((suggestion) =>
        dbService.storeSmartSuggestion({
          user_id: userId,
          suggestion_type: suggestion.suggestion_type,
          title: suggestion.title,
          description: suggestion.description,
          rationale: suggestion.rationale,
          priority_score: suggestion.priority_score,
          action_items: suggestion.action_items,
          expected_benefit: suggestion.expected_benefit,
          context_data: suggestion.context_data,
        })
      )
    );
    
    return res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    logger.error('[AIController] generateSmartSuggestions failed', error);
    return next(error);
  }
}

/**
 * Check AI service health
 */
async function checkAIHealth(req, res, next) {
  try {
    const health = await aiService.checkAIHealth();
    return res.json(health);
  } catch (error) {
    logger.error('[AIController] checkAIHealth failed', error);
    return res.status(503).json({
      status: 'error',
      error: error.message,
    });
  }
}

module.exports = {
  summarizeTasks,
  generateFocusPlan,
  analyzeDistractions,
  predictTaskDuration,
  batchPredictDurations,
  generateSmartSuggestions,
  checkAIHealth,
};

