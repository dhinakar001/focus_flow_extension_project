/**
 * AI Service - Integrates with Python AI service
 */
const axios = require('axios');
const logger = require('../utils/logger');
const serverConfig = require('../server.config');

const AI_SERVICE_URL = serverConfig.integrations.pythonServiceUrl || 'http://localhost:8000';

/**
 * Wraps AI service API calls with error handling
 */
async function callAIService(endpoint, method = 'POST', data = null) {
  try {
    const url = `${AI_SERVICE_URL}${endpoint}`;
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    };

    if (data && method !== 'GET') {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('[AIService] API call failed', {
      endpoint,
      method,
      error: error.message,
      response: error.response?.data,
    });
    throw new Error(`AI service error: ${error.message}`);
  }
}

/**
 * AI Focus Coach - Summarize tasks
 */
async function summarizeTasks(tasks) {
  const payload = {
    tasks: tasks.map((task) => ({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      estimated_minutes: task.estimated_minutes || null,
      category: task.category || null,
      tags: task.tags || [],
    })),
  };

  return callAIService('/api/ai/focus-coach/summarize', 'POST', payload);
}

/**
 * AI Focus Coach - Generate focus plan
 */
async function generateFocusPlan(tasks, userPreferences = null, availableHours = null) {
  const payload = {
    tasks: tasks.map((task) => ({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      estimated_minutes: task.estimated_minutes || null,
      category: task.category || null,
      tags: task.tags || [],
      due_date: task.due_date || null,
      id: task.id || null,
    })),
    user_preferences: userPreferences,
    available_hours: availableHours,
  };

  return callAIService('/api/ai/focus-coach/generate-plan', 'POST', payload);
}

/**
 * Distraction Detector - Analyze activity patterns
 */
async function analyzeDistractions(activities, timeWindowHours = 24) {
  const payload = {
    activities: activities.map((activity) => ({
      activity_type: activity.activity_type,
      activity_category: activity.activity_category,
      timestamp: activity.timestamp || new Date().toISOString(),
      duration_seconds: activity.duration_seconds || 0,
      distraction_score: activity.distraction_score || null,
      context: activity.context || {},
    })),
    time_window_hours: timeWindowHours,
  };

  return callAIService('/api/ai/distraction-detector/analyze', 'POST', payload);
}

/**
 * Time Predictor - Predict task duration
 */
async function predictTaskDuration(task, historicalData = null, userProfile = null) {
  const payload = {
    task: {
      id: task.id || null,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      estimated_minutes: task.estimated_minutes || null,
      type: task.type || 'general',
      category: task.category || null,
      tags: task.tags || [],
      due_date: task.due_date || null,
    },
    historical_data: historicalData,
    user_profile: userProfile,
  };

  return callAIService('/api/ai/time-predictor/predict', 'POST', payload);
}

/**
 * Time Predictor - Batch predict durations
 */
async function batchPredictDurations(tasks, historicalData = null, userProfile = null) {
  const payload = {
    tasks: tasks.map((task) => ({
      id: task.id || null,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      estimated_minutes: task.estimated_minutes || null,
      type: task.type || 'general',
      category: task.category || null,
      tags: task.tags || [],
      due_date: task.due_date || null,
    })),
    historical_data: historicalData,
    user_profile: userProfile,
  };

  return callAIService('/api/ai/time-predictor/batch-predict', 'POST', payload);
}

/**
 * Smart Suggestions - Generate productivity suggestions
 */
async function generateSmartSuggestions(userId, options = {}) {
  const payload = {
    user_id: userId,
    productivity_data: options.productivityData || null,
    focus_sessions: options.focusSessions || null,
    tasks: options.tasks || null,
    activity_patterns: options.activityPatterns || null,
  };

  return callAIService('/api/ai/smart-suggestions/generate', 'POST', payload);
}

/**
 * Health check for AI service
 */
async function checkAIHealth() {
  try {
    return callAIService('/api/ai/health', 'GET');
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
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

