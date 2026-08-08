/**
 * Streak & Leaderboard Tracking Engine
 * Manages consecutive learning days, XP points, daily challenge completion,
 * and user leaderboard rankings.
 */

const STORAGE_KEY_PREFIX = 'vocab_user_streak_';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Gets user streak and activity data from localStorage
 */
export function getUserStreakData(userId = 'guest') {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  const raw = localStorage.getItem(key);
  if (!raw) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalStudyDays: 0,
      totalXP: 0,
      lastActiveDate: null,
      lastDailyCompletedDate: null,
      historyDates: [],
    };
  }
  try {
    const data = JSON.parse(raw);
    
    // Check if streak was broken (last active date was before yesterday)
    const today = getTodayString();
    const yesterday = getYesterdayString();
    
    if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yesterday) {
      // Streak broken! Reset currentStreak to 0
      data.currentStreak = 0;
    }
    
    return data;
  } catch (err) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalStudyDays: 0,
      totalXP: 0,
      lastActiveDate: null,
      lastDailyCompletedDate: null,
      historyDates: [],
    };
  }
}

/**
 * Records a completed learning session (Practice set or Daily Challenge)
 * Updates current streak, longest streak, total study days, and XP points.
 */
export function recordLearningActivity(userId = 'guest', pointsEarned = 50, isDailyChallenge = false) {
  const data = getUserStreakData(userId);
  const today = getTodayString();
  const yesterday = getYesterdayString();

  let newStreak = data.currentStreak || 0;
  const historySet = new Set(data.historyDates || []);

  if (!data.lastActiveDate) {
    // First time studying
    newStreak = 1;
  } else if (data.lastActiveDate === today) {
    // Already studied today — streak stays same
    newStreak = data.currentStreak > 0 ? data.currentStreak : 1;
  } else if (data.lastActiveDate === yesterday) {
    // Studied yesterday — streak increases!
    newStreak += 1;
  } else {
    // Missed days — start fresh 1-day streak
    newStreak = 1;
  }

  historySet.add(today);

  const updatedData = {
    currentStreak: newStreak,
    longestStreak: Math.max(data.longestStreak || 0, newStreak),
    totalStudyDays: historySet.size,
    totalXP: (data.totalXP || 0) + pointsEarned,
    lastActiveDate: today,
    lastDailyCompletedDate: isDailyChallenge ? today : data.lastDailyCompletedDate,
    historyDates: Array.from(historySet),
  };

  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  localStorage.setItem(key, JSON.stringify(updatedData));
  return updatedData;
}

/**
 * Checks if user completed the daily challenge today
 */
export function isDailyChallengeCompletedToday(userId = 'guest') {
  const data = getUserStreakData(userId);
  const today = getTodayString();
  return data.lastDailyCompletedDate === today;
}

/**
 * Calculates user rank title based on streak and total XP
 */
export function getUserRank(streakDays = 0, totalXP = 0) {
  if (streakDays >= 30 || totalXP >= 1500) {
    return { title: '👑 Grandmaster Scholar', badge: '👑', color: '#7c3aed', bg: '#f3e8ff' };
  }
  if (streakDays >= 14 || totalXP >= 800) {
    return { title: '🔥 Master Wordsmith', badge: '🔥', color: '#ea580c', bg: '#fff7ed' };
  }
  if (streakDays >= 7 || totalXP >= 350) {
    return { title: '⭐ Dedicated Learner', badge: '⭐', color: '#2563eb', bg: '#eff6ff' };
  }
  if (streakDays >= 3 || totalXP >= 100) {
    return { title: '🌱 Rising Explorer', badge: '🌱', color: '#16a34a', bg: '#f0fdf4' };
  }
  return { title: '🐣 English Beginner', badge: '🐣', color: '#64748b', bg: '#f8fafc' };
}
