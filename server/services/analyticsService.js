/**
 * Analytics Service - Production-grade productivity analytics
 */
const dbService = require('./dbService');
const logger = require('../utils/logger');

/**
 * Calculate productivity score (0-100)
 */
function calculateProductivityScore(sessionData) {
  const {
    totalFocusMinutes = 0,
    totalSessions = 0,
    completedTasks = 0,
    interruptedSessions = 0,
    blockedMessages = 0
  } = sessionData;

  // Base score from focus time (max 40 points)
  const focusScore = Math.min((totalFocusMinutes / 480) * 40, 40); // 8 hours = 480 minutes

  // Session quality score (max 20 points)
  const sessionQuality = totalSessions > 0 
    ? Math.max(20 - (interruptedSessions / totalSessions) * 20, 0)
    : 0;

  // Task completion score (max 20 points)
  const taskScore = Math.min((completedTasks / 10) * 20, 20); // 10 tasks = max

  // Focus quality score - fewer interruptions = better (max 20 points)
  const focusQuality = totalSessions > 0
    ? Math.max(20 - (blockedMessages / (totalSessions * 5)) * 20, 0)
    : 0;

  return Math.round(focusScore + sessionQuality + taskScore + focusQuality);
}

/**
 * Calculate focus score (0-100)
 */
function calculateFocusScore(sessionData) {
  const { totalFocusMinutes = 0, totalSessions = 0, interruptedSessions = 0 } = sessionData;

  if (totalSessions === 0) return 0;

  // Time-based score (max 60 points)
  const timeScore = Math.min((totalFocusMinutes / 240) * 60, 60); // 4 hours = 240 minutes

  // Consistency score (max 40 points)
  const completionRate = (totalSessions - interruptedSessions) / totalSessions;
  const consistencyScore = completionRate * 40;

  return Math.round(timeScore + consistencyScore);
}

/**
 * Calculate efficiency score (0-100)
 */
function calculateEfficiencyScore(sessionData) {
  const { totalSessions = 0, interruptedSessions = 0, completedTasks = 0, totalFocusMinutes = 0 } = sessionData;

  if (totalSessions === 0) return 0;

  // Completion rate (max 50 points)
  const completionRate = (totalSessions - interruptedSessions) / totalSessions;
  const completionScore = completionRate * 50;

  // Task throughput (max 50 points)
  const avgTasksPerHour = totalFocusMinutes > 0 
    ? (completedTasks / (totalFocusMinutes / 60))
    : 0;
  const throughputScore = Math.min((avgTasksPerHour / 2) * 50, 50); // 2 tasks/hour = max

  return Math.round(completionScore + throughputScore);
}

/**
 * Calculate engagement score (0-100)
 */
function calculateEngagementScore(sessionData) {
  const { totalSessions = 0, totalFocusMinutes = 0 } = sessionData;

  // Based on session frequency and duration
  const sessionFrequency = Math.min((totalSessions / 5) * 50, 50); // 5 sessions = max
  const sessionDuration = Math.min((totalFocusMinutes / 300) * 50, 50); // 5 hours = max

  return Math.round(sessionFrequency + sessionDuration);
}

/**
 * Calculate daily analytics
 */
async function calculateDailyAnalytics(userId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Get session data for the day
  const sessions = await dbService.getFocusSessionsByDate(userId, targetDate);
  
  // Get task data for the day
  const tasks = await dbService.getTasksByDate(userId, targetDate);

  // Calculate metrics
  const totalFocusMinutes = sessions.reduce((sum, s) => {
    if (s.ended_at && s.started_at) {
      const duration = Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000);
      return sum + duration;
    }
    return sum;
  }, 0);

  const totalSessions = sessions.length;
  const interruptedSessions = sessions.filter(s => s.interruption_count > 0).length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const blockedMessages = await dbService.getBlockedMessagesCount(userId, targetDate);

  const sessionData = {
    totalFocusMinutes,
    totalSessions,
    interruptedSessions,
    completedTasks,
    blockedMessages
  };

  // Calculate scores
  const productivityScore = calculateProductivityScore(sessionData);
  const focusScore = calculateFocusScore(sessionData);
  const efficiencyScore = calculateEfficiencyScore(sessionData);
  const engagementScore = calculateEngagementScore(sessionData);

  // Store or update daily analytics
  const analytics = {
    userId,
    date: targetDate,
    totalFocusMinutes,
    totalSessions,
    completedTasks,
    interruptedSessions,
    blockedMessages,
    productivityScore,
    focusScore,
    efficiencyScore,
    engagementScore,
    metadata: {
      avgSessionDuration: totalSessions > 0 ? Math.round(totalFocusMinutes / totalSessions) : 0,
      completionRate: totalSessions > 0 ? ((totalSessions - interruptedSessions) / totalSessions) : 0
    }
  };

  await dbService.upsertDailyAnalytics(analytics);

  return analytics;
}

/**
 * Calculate weekly analytics
 */
async function calculateWeeklyAnalytics(userId, weekStartDate) {
  // Get Monday of the week
  const startDate = weekStartDate || getMondayOfWeek(new Date());
  
  // Get all days in the week
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    days.push(date.toISOString().split('T')[0]);
  }

  // Get daily analytics for the week
  const dailyAnalytics = await Promise.all(
    days.map(day => dbService.getDailyAnalytics(userId, day))
  );

  // Filter out null values
  const validAnalytics = dailyAnalytics.filter(a => a !== null);

  // Aggregate weekly data
  const totalFocusMinutes = validAnalytics.reduce((sum, a) => sum + (a.total_focus_minutes || 0), 0);
  const totalSessions = validAnalytics.reduce((sum, a) => sum + (a.total_sessions || 0), 0);
  const completedTasks = validAnalytics.reduce((sum, a) => sum + (a.completed_tasks || 0), 0);
  
  const avgProductivityScore = validAnalytics.length > 0
    ? validAnalytics.reduce((sum, a) => sum + (a.productivity_score || 0), 0) / validAnalytics.length
    : 0;

  // Trend data (day-by-day breakdown)
  const trendData = dailyAnalytics.map(a => ({
    date: a?.date || null,
    productivityScore: a?.productivity_score || 0,
    focusMinutes: a?.total_focus_minutes || 0,
    sessions: a?.total_sessions || 0
  }));

  const weeklyAnalytics = {
    userId,
    weekStartDate: startDate.toISOString().split('T')[0],
    totalFocusMinutes,
    totalSessions,
    completedTasks,
    averageProductivityScore: Math.round(avgProductivityScore * 100) / 100,
    trendData
  };

  await dbService.upsertWeeklyAnalytics(weeklyAnalytics);

  return weeklyAnalytics;
}

/**
 * Calculate monthly analytics
 */
async function calculateMonthlyAnalytics(userId, year, month) {
  const targetYear = year || new Date().getFullYear();
  const targetMonth = month || new Date().getMonth() + 1;

  // Get start and end dates of the month
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0);

  // Get all weeks in the month
  const weeks = [];
  let currentDate = new Date(startDate);
  
  // Find first Monday
  while (currentDate.getDay() !== 1) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  while (currentDate <= endDate) {
    weeks.push(new Date(currentDate).toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Get weekly analytics for the month
  const weeklyAnalytics = await Promise.all(
    weeks.map(weekStart => dbService.getWeeklyAnalytics(userId, weekStart))
  );

  const validAnalytics = weeklyAnalytics.filter(a => a !== null);

  // Aggregate monthly data
  const totalFocusMinutes = validAnalytics.reduce((sum, a) => sum + (a.total_focus_minutes || 0), 0);
  const totalSessions = validAnalytics.reduce((sum, a) => sum + (a.total_sessions || 0), 0);
  const completedTasks = validAnalytics.reduce((sum, a) => sum + (a.completed_tasks || 0), 0);
  
  const avgProductivityScore = validAnalytics.length > 0
    ? validAnalytics.reduce((sum, a) => sum + (a.average_productivity_score || 0), 0) / validAnalytics.length
    : 0;

  // Trend data (week-by-week breakdown)
  const trendData = weeklyAnalytics.map(a => ({
    weekStart: a?.week_start_date || null,
    productivityScore: a?.average_productivity_score || 0,
    focusMinutes: a?.total_focus_minutes || 0,
    sessions: a?.total_sessions || 0
  }));

  const monthlyAnalytics = {
    userId,
    year: targetYear,
    month: targetMonth,
    totalFocusMinutes,
    totalSessions,
    completedTasks,
    averageProductivityScore: Math.round(avgProductivityScore * 100) / 100,
    trendData
  };

  await dbService.upsertMonthlyAnalytics(monthlyAnalytics);

  return monthlyAnalytics;
}

/**
 * Get analytics trends
 */
async function getAnalyticsTrends(userId, period = '7d') {
  const now = new Date();
  let startDate;

  switch (period) {
    case '7d':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case '30d':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case '90d':
      startDate = new Date(now.setDate(now.getDate() - 90));
      break;
    default:
      startDate = new Date(now.setDate(now.getDate() - 7));
  }

  // Get daily analytics for the period
  const analytics = await dbService.getDailyAnalyticsRange(userId, startDate.toISOString().split('T')[0]);

  return {
    period,
    dataPoints: analytics.length,
    trends: {
      productivity: analytics.map(a => ({
        date: a.date,
        value: a.productivity_score || 0
      })),
      focusMinutes: analytics.map(a => ({
        date: a.date,
        value: a.total_focus_minutes || 0
      })),
      sessions: analytics.map(a => ({
        date: a.date,
        value: a.total_sessions || 0
      })),
      tasks: analytics.map(a => ({
        date: a.date,
        value: a.completed_tasks || 0
      }))
    },
    averages: {
      productivity: analytics.length > 0
        ? Math.round(analytics.reduce((sum, a) => sum + (a.productivity_score || 0), 0) / analytics.length)
        : 0,
      focusMinutes: analytics.length > 0
        ? Math.round(analytics.reduce((sum, a) => sum + (a.total_focus_minutes || 0), 0) / analytics.length)
        : 0
    }
  };
}

/**
 * Helper: Get Monday of the week
 */
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

module.exports = {
  calculateDailyAnalytics,
  calculateWeeklyAnalytics,
  calculateMonthlyAnalytics,
  getAnalyticsTrends,
  calculateProductivityScore,
  calculateFocusScore,
  calculateEfficiencyScore,
  calculateEngagementScore
};

