/**
 * API client for AI features
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

/**
 * AI Focus Coach API
 */
export const focusCoachApi = {
  /**
   * Summarize tasks
   */
  async summarizeTasks(tasks) {
    const response = await api.post('/ai/focus-coach/summarize', { tasks });
    return response.data.data;
  },

  /**
   * Generate focus plan
   */
  async generateFocusPlan(userId, tasks, userPreferences = null, availableHours = null) {
    const response = await api.post('/ai/focus-coach/generate-plan', {
      userId,
      tasks,
      userPreferences,
      availableHours,
    });
    return response.data.data;
  },
};

/**
 * Distraction Detector API
 */
export const distractionDetectorApi = {
  /**
   * Analyze distractions
   */
  async analyzeDistractions(userId, timeWindowHours = 24) {
    const response = await api.post('/ai/distraction-detector/analyze', {
      userId,
      timeWindowHours,
    });
    return response.data.data;
  },
};

/**
 * Time Predictor API
 */
export const timePredictorApi = {
  /**
   * Predict task duration
   */
  async predictTaskDuration(userId, task) {
    const response = await api.post('/ai/time-predictor/predict', {
      userId,
      task,
    });
    return response.data.data;
  },

  /**
   * Batch predict task durations
   */
  async batchPredictDurations(userId, tasks) {
    const response = await api.post('/ai/time-predictor/batch-predict', {
      userId,
      tasks,
    });
    return response.data.data;
  },
};

/**
 * Smart Suggestions API
 */
export const smartSuggestionsApi = {
  /**
   * Generate smart suggestions
   */
  async generateSuggestions(userId) {
    const response = await api.post('/ai/smart-suggestions/generate', {
      userId,
    });
    return response.data.data;
  },
};

/**
 * Combined AI API
 */
export const aiApi = {
  focusCoach: focusCoachApi,
  distractionDetector: distractionDetectorApi,
  timePredictor: timePredictorApi,
  smartSuggestions: smartSuggestionsApi,

  /**
   * Health check
   */
  async checkHealth() {
    const response = await api.get('/ai/health');
    return response.data;
  },
};

export default aiApi;

