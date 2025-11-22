/**
 * Streaks Service - Focus streak tracking and management
 */
const dbService = require('./dbService');
const logger = require('../utils/logger');

/**
 * Update daily streak
 */
async function updateDailyStreak(userId, activityDate = null) {
  const date = activityDate || new Date().toISOString().split('T')[0];
  const streak = await dbService.getFocusStreak(userId, 'daily');

  if (!streak) {
    // Create new streak
    return await dbService.createFocusStreak(userId, 'daily', {
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: date,
      streakStartDate: date
    });
  }

  const lastActivity = new Date(streak.last_activity_date);
  const currentDate = new Date(date);
  const daysDiff = Math.floor((currentDate - lastActivity) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Same day, no update needed
    return streak;
  } else if (daysDiff === 1) {
    // Consecutive day, increment streak
    const newStreak = streak.current_streak + 1;
    const longestStreak = Math.max(newStreak, streak.longest_streak || 0);

    return await dbService.updateFocusStreak(userId, 'daily', {
      currentStreak: newStreak,
      longestStreak,
      lastActivityDate: date
    });
  } else {
    // Streak broken, reset to 1
    return await dbService.updateFocusStreak(userId, 'daily', {
      currentStreak: 1,
      lastActivityDate: date,
      streakStartDate: date
    });
  }
}

/**
 * Update weekly streak
 */
async function updateWeeklyStreak(userId, weekStartDate = null) {
  const date = weekStartDate || getMondayOfWeek(new Date()).toISOString().split('T')[0];
  const streak = await dbService.getFocusStreak(userId, 'weekly');

  if (!streak) {
    return await dbService.createFocusStreak(userId, 'weekly', {
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: date,
      streakStartDate: date
    });
  }

  const lastActivity = new Date(streak.last_activity_date);
  const currentWeek = new Date(date);
  const weeksDiff = getWeekDifference(lastActivity, currentWeek);

  if (weeksDiff === 0) {
    return streak;
  } else if (weeksDiff === 1) {
    const newStreak = streak.current_streak + 1;
    const longestStreak = Math.max(newStreak, streak.longest_streak || 0);

    return await dbService.updateFocusStreak(userId, 'weekly', {
      currentStreak: newStreak,
      longestStreak,
      lastActivityDate: date
    });
  } else {
    return await dbService.updateFocusStreak(userId, 'weekly', {
      currentStreak: 1,
      lastActivityDate: date,
      streakStartDate: date
    });
  }
}

/**
 * Update monthly streak
 */
async function updateMonthlyStreak(userId, year = null, month = null) {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;
  const monthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  const streak = await dbService.getFocusStreak(userId, 'monthly');

  if (!streak) {
    return await dbService.createFocusStreak(userId, 'monthly', {
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: monthKey,
      streakStartDate: monthKey
    });
  }

  const lastActivity = streak.last_activity_date || '';
  const [lastYear, lastMonth] = lastActivity.split('-').map(Number);
  const monthsDiff = (targetYear - lastYear) * 12 + (targetMonth - lastMonth);

  if (monthsDiff === 0) {
    return streak;
  } else if (monthsDiff === 1) {
    const newStreak = streak.current_streak + 1;
    const longestStreak = Math.max(newStreak, streak.longest_streak || 0);

    return await dbService.updateFocusStreak(userId, 'monthly', {
      currentStreak: newStreak,
      longestStreak,
      lastActivityDate: monthKey
    });
  } else {
    return await dbService.updateFocusStreak(userId, 'monthly', {
      currentStreak: 1,
      lastActivityDate: monthKey,
      streakStartDate: monthKey
    });
  }
}

/**
 * Check if user has activity today and update streaks
 */
async function checkAndUpdateStreaks(userId) {
  try {
    // Check if user has any focus activity today
    const today = new Date().toISOString().split('T')[0];
    const sessions = await dbService.getFocusSessionsByDate(userId, today);

    if (sessions && sessions.length > 0) {
      // User has activity, update streaks
      const [daily, weekly, monthly] = await Promise.all([
        updateDailyStreak(userId),
        updateWeeklyStreak(userId),
        updateMonthlyStreak(userId)
      ]);

      // Check for streak achievements
      await checkStreakAchievements(userId, daily, weekly, monthly);

      return { daily, weekly, monthly };
    }

    return null;
  } catch (error) {
    logger.error('[StreaksService] Error updating streaks', error);
    throw error;
  }
}

/**
 * Get user streaks
 */
async function getUserStreaks(userId) {
  const streaks = await dbService.getUserStreaks(userId);
  
  return {
    daily: streaks.find(s => s.streak_type === 'daily') || { current_streak: 0, longest_streak: 0 },
    weekly: streaks.find(s => s.streak_type === 'weekly') || { current_streak: 0, longest_streak: 0 },
    monthly: streaks.find(s => s.streak_type === 'monthly') || { current_streak: 0, longest_streak: 0 }
  };
}

/**
 * Check for streak achievements
 */
async function checkStreakAchievements(userId, dailyStreak, weeklyStreak, monthlyStreak) {
  const achievements = [];

  // Check daily streak achievements
  if (dailyStreak && dailyStreak.current_streak >= 3 && dailyStreak.current_streak < 7) {
    achievements.push({ code: 'streak_3', unlocked: !(await dbService.hasAchievement(userId, 'streak_3')) });
  }
  if (dailyStreak && dailyStreak.current_streak >= 7 && dailyStreak.current_streak < 30) {
    achievements.push({ code: 'streak_7', unlocked: !(await dbService.hasAchievement(userId, 'streak_7')) });
  }
  if (dailyStreak && dailyStreak.current_streak >= 30) {
    achievements.push({ code: 'streak_30', unlocked: !(await dbService.hasAchievement(userId, 'streak_30')) });
  }

  // Unlock achievements
  for (const achievement of achievements) {
    if (achievement.unlocked) {
      await dbService.unlockAchievement(userId, achievement.code);
    }
  }
}

/**
 * Helper: Get Monday of the week
 */
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Helper: Calculate week difference
 */
function getWeekDifference(date1, date2) {
  const monday1 = getMondayOfWeek(date1);
  const monday2 = getMondayOfWeek(date2);
  const diffTime = monday2 - monday1;
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
}

module.exports = {
  updateDailyStreak,
  updateWeeklyStreak,
  updateMonthlyStreak,
  checkAndUpdateStreaks,
  getUserStreaks,
  checkStreakAchievements
};

