/**
 * Scoring Service - Gamification and user scoring system
 */
const dbService = require('./dbService');
const logger = require('../utils/logger');

/**
 * Calculate XP for an action
 */
function calculateXP(actionType, metadata = {}) {
  const xpValues = {
    focus_session_completed: 10,
    focus_session_perfect: 25, // No interruptions
    task_completed: 5,
    task_completed_high_priority: 15,
    streak_day: 5,
    streak_week: 20,
    streak_month: 100,
    achievement_unlocked: 50,
    daily_goal_reached: 30
  };

  let xp = xpValues[actionType] || 0;

  // Bonus multipliers
  if (metadata.duration && metadata.duration > 60) {
    xp = Math.round(xp * 1.2); // 20% bonus for longer sessions
  }

  if (metadata.streakDays && metadata.streakDays > 7) {
    xp = Math.round(xp * 1.5); // 50% bonus for longer streaks
  }

  return xp;
}

/**
 * Add XP to user score
 */
async function addXP(userId, actionType, metadata = {}) {
  const xp = calculateXP(actionType, metadata);
  
  if (xp === 0) {
    return null;
  }

  // Get current score
  let userScore = await dbService.getUserScore(userId);
  
  if (!userScore) {
    // Create initial score
    userScore = await dbService.createUserScore(userId);
  }

  // Add XP
  const newXP = (userScore.experience_points || 0) + xp;
  const newLevel = calculateLevel(newXP);

  // Update score
  await dbService.updateUserScore(userId, {
    experiencePoints: newXP,
    level: newLevel
  });

  // Log score change
  await dbService.logScoreHistory({
    userId,
    scoreType: 'overall',
    scoreValue: newXP,
    reason: `${actionType}: +${xp} XP`,
    metadata: { actionType, xp, level: newLevel }
  });

  // Check for level up
  const leveledUp = newLevel > (userScore.level || 1);
  
  if (leveledUp) {
    await dbService.logScoreHistory({
      userId,
      scoreType: 'level',
      scoreValue: newLevel,
      reason: 'Level up!',
      metadata: { previousLevel: userScore.level || 1, newLevel }
    });
  }

  return {
    xp,
    totalXP: newXP,
    level: newLevel,
    leveledUp,
    xpToNextLevel: getXPToNextLevel(newLevel + 1) - newXP
  };
}

/**
 * Update user scores based on analytics
 */
async function updateScoresFromAnalytics(userId, analytics) {
  const {
    productivityScore = 0,
    focusScore = 0,
    efficiencyScore = 0,
    engagementScore = 0
  } = analytics;

  // Get current scores
  let userScore = await dbService.getUserScore(userId);
  if (!userScore) {
    userScore = await dbService.createUserScore(userId);
  }

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    (productivityScore * 0.4) +
    (focusScore * 0.3) +
    (efficiencyScore * 0.2) +
    (engagementScore * 0.1)
  );

  // Update scores
  await dbService.updateUserScore(userId, {
    overallScore,
    focusScore: Math.round(focusScore),
    productivityScore: Math.round(productivityScore),
    consistencyScore: Math.round(engagementScore)
  });

  // Log score changes
  await Promise.all([
    dbService.logScoreHistory({
      userId,
      scoreType: 'overall',
      scoreValue: overallScore,
      reason: 'Daily analytics update',
      metadata: { date: analytics.date || new Date().toISOString().split('T')[0] }
    }),
    dbService.logScoreHistory({
      userId,
      scoreType: 'focus',
      scoreValue: Math.round(focusScore),
      reason: 'Focus score update',
      metadata: analytics
    }),
    dbService.logScoreHistory({
      userId,
      scoreType: 'productivity',
      scoreValue: Math.round(productivityScore),
      reason: 'Productivity score update',
      metadata: analytics
    })
  ]);

  // Update user rank
  await updateUserRank(userId);

  return {
    overallScore,
    focusScore: Math.round(focusScore),
    productivityScore: Math.round(productivityScore),
    consistencyScore: Math.round(engagementScore)
  };
}

/**
 * Calculate level from XP
 */
function calculateLevel(xp) {
  // Exponential leveling: level = sqrt(xp / 100)
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
}

/**
 * Get XP required for a level
 */
function getXPToNextLevel(level) {
  return level * level * 100;
}

/**
 * Update user rank
 */
async function updateUserRank(userId) {
  // Get user's overall score
  const userScore = await dbService.getUserScore(userId);
  if (!userScore) return;

  // Get rank (users with higher scores)
  const rank = await dbService.getUserRank(userId);
  
  if (rank !== null && rank !== userScore.rank) {
    await dbService.updateUserScore(userId, { rank });
  }

  return rank;
}

/**
 * Get leaderboard
 */
async function getLeaderboard(limit = 10, offset = 0) {
  const leaderboard = await dbService.getLeaderboard(limit, offset);
  
  return leaderboard.map((entry, index) => ({
    rank: offset + index + 1,
    userId: entry.user_id,
    username: entry.username,
    overallScore: entry.overall_score || 0,
    level: entry.level || 1,
    experiencePoints: entry.experience_points || 0
  }));
}

/**
 * Get user score details
 */
async function getUserScoreDetails(userId) {
  const score = await dbService.getUserScore(userId);
  if (!score) {
    // Create initial score
    return await dbService.createUserScore(userId);
  }

  // Get recent score history
  const recentHistory = await dbService.getScoreHistory(userId, 30);

  // Calculate XP to next level
  const xpToNextLevel = getXPToNextLevel((score.level || 1) + 1) - (score.experience_points || 0);

  return {
    ...score,
    xpToNextLevel,
    recentHistory: recentHistory.slice(0, 10) // Last 10 changes
  };
}

/**
 * Award bonus points
 */
async function awardBonus(userId, reason, points) {
  const userScore = await dbService.getUserScore(userId);
  if (!userScore) {
    await dbService.createUserScore(userId);
  }

  const currentXP = userScore?.experience_points || 0;
  const newXP = currentXP + points;
  const newLevel = calculateLevel(newXP);

  await dbService.updateUserScore(userId, {
    experiencePoints: newXP,
    level: newLevel
  });

  await dbService.logScoreHistory({
    userId,
    scoreType: 'overall',
    scoreValue: newXP,
    reason: `Bonus: ${reason}`,
    metadata: { bonusPoints: points, reason }
  });

  return {
    points,
    totalXP: newXP,
    level: newLevel
  };
}

module.exports = {
  addXP,
  updateScoresFromAnalytics,
  calculateLevel,
  getXPToNextLevel,
  updateUserRank,
  getLeaderboard,
  getUserScoreDetails,
  awardBonus
};

