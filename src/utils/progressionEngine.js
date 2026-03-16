/**
 * Progression Engine - Pure logic for PR detection and progressive overload
 * No React, no side effects - just computations
 */

/** Epley 1RM formula */
export function calculate1RM(weight, reps) {
  const w = parseFloat(weight);
  const r = parseInt(reps);
  if (!w || !r || r <= 0) return 0;
  if (r === 1) return w;
  return parseFloat((w * (1 + r / 30)).toFixed(1));
}

/**
 * Check if a set is a PR
 * Returns { isPR, type: 'first'|'weight'|'1rm', newRecord, previousRecord }
 */
export function checkForPR(exerciseName, weight, reps, existingRecords) {
  const w = parseFloat(weight);
  const r = parseInt(reps);
  if (!w || !r || r <= 0) return { isPR: false };

  const current1RM = calculate1RM(w, r);
  const existing = existingRecords[exerciseName];

  if (!existing || (!existing.bestWeight && !existing.best1RM)) {
    return {
      isPR: true,
      type: 'first',
      newRecord: { weight: w, reps: r, estimated1RM: current1RM },
      previousRecord: null
    };
  }

  const prevBestWeight = existing.bestWeight?.weight ?? 0;
  const prevBest1RM = existing.best1RM?.estimated1RM ?? 0;

  if (w > prevBestWeight) {
    return {
      isPR: true,
      type: 'weight',
      newRecord: { weight: w, reps: r, estimated1RM: current1RM },
      previousRecord: existing.bestWeight
    };
  }

  if (current1RM > prevBest1RM) {
    return {
      isPR: true,
      type: '1rm',
      newRecord: { weight: w, reps: r, estimated1RM: current1RM },
      previousRecord: existing.best1RM
    };
  }

  return { isPR: false };
}

/**
 * Update personal records after a PR
 * Returns new records object (immutable)
 */
export function updatePersonalRecords(exerciseName, weight, reps, date, existingRecords) {
  const w = parseFloat(weight);
  const r = parseInt(reps);
  if (!w || !r) return existingRecords;

  const current1RM = calculate1RM(w, r);
  const records = { ...existingRecords };
  const existing = records[exerciseName] || { bestWeight: null, best1RM: null, history: [] };

  const entry = { weight: w, reps: r, estimated1RM: current1RM, date };

  const newBestWeight = !existing.bestWeight || w > existing.bestWeight.weight
    ? { ...entry }
    : existing.bestWeight;

  const newBest1RM = !existing.best1RM || current1RM > existing.best1RM.estimated1RM
    ? { ...entry }
    : existing.best1RM;

  records[exerciseName] = {
    bestWeight: newBestWeight,
    best1RM: newBest1RM,
    history: [...(existing.history || []).slice(-49), entry]
  };

  return records;
}

/**
 * Calculate current workout streak
 * Returns { currentStreak, longestStreak, lastTrainedDate }
 */
export function calculateStreak(workoutLogs) {
  const trainedDates = Object.keys(workoutLogs)
    .filter(d => Object.keys(workoutLogs[d]).length > 0)
    .sort((a, b) => new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00'));

  if (trainedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastTrainedDate: null };
  }

  // Longest streak (ascending)
  const sortedAsc = [...trainedDates].reverse();
  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1] + 'T12:00:00');
    const curr = new Date(sortedAsc[i] + 'T12:00:00');
    const diff = Math.round((curr - prev) / 86400000);
    if (diff <= 2) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 1;
    }
  }

  // Current streak (from most recent date backwards)
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = new Date(today - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  if (trainedDates[0] === todayStr || trainedDates[0] === yesterdayStr) {
    currentStreak = 1;
    let lastDate = new Date(trainedDates[0] + 'T12:00:00');
    for (let i = 1; i < trainedDates.length; i++) {
      const d = new Date(trainedDates[i] + 'T12:00:00');
      const diff = Math.round((lastDate - d) / 86400000);
      if (diff <= 2) {
        currentStreak++;
        lastDate = d;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak, lastTrainedDate: trainedDates[0] };
}

/**
 * Calculate which exercises are ready for a weight increase
 * Returns updated progression targets
 */
export function calculateProgressionTargets(workoutLogs, currentTargets = {}, sessionsNeeded = 2) {
  // Build per-exercise session history sorted by date
  const exerciseSessions = {};
  Object.entries(workoutLogs)
    .sort(([a], [b]) => new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00'))
    .forEach(([date, exercises]) => {
      Object.entries(exercises).forEach(([exName, sets]) => {
        if (!exerciseSessions[exName]) exerciseSessions[exName] = [];
        // Find best set by weight
        let bestWeight = 0, bestReps = 0;
        Object.values(sets).forEach(set => {
          const w = parseFloat(set.weight || 0);
          if (w > bestWeight) { bestWeight = w; bestReps = parseInt(set.reps || 0); }
        });
        if (bestWeight > 0) {
          exerciseSessions[exName].push({ date, weight: bestWeight, reps: bestReps });
        }
      });
    });

  const updated = { ...currentTargets };

  Object.entries(exerciseSessions).forEach(([exName, sessions]) => {
    if (sessions.length === 0) return;
    const last = sessions[sessions.length - 1];
    const existing = updated[exName] || {};

    // Count how many recent sessions hit the current target weight or above
    let sessionsAtCurrentWeight = 0;
    const targetWeight = existing.currentTargetWeight || last.weight;
    for (let i = sessions.length - 1; i >= 0; i--) {
      if (sessions[i].weight >= targetWeight) {
        sessionsAtCurrentWeight++;
      } else {
        break;
      }
    }

    updated[exName] = {
      currentTargetWeight: last.weight,
      currentTargetReps: String(last.reps),
      lastUpdated: last.date,
      rule: existing.rule || 'linear',
      incrementKg: existing.incrementKg || 2.5,
      sessionsAtCurrentWeight,
      sessionsNeededToProgress: sessionsNeeded,
      readyToProgress: sessionsAtCurrentWeight >= sessionsNeeded
    };
  });

  return updated;
}

/**
 * Calculate total workout volume (weight × reps across all sets)
 */
export function calculateWorkoutVolume(exercisesLog) {
  let total = 0;
  Object.values(exercisesLog).forEach(sets => {
    Object.values(sets).forEach(set => {
      const w = parseFloat(set.weight || 0);
      const r = parseInt(set.reps || 0);
      total += w * r;
    });
  });
  return Math.round(total);
}

/**
 * Calculate workout duration from timestamps
 * Returns duration string like "42 min"
 */
export function calculateWorkoutDuration(exercisesLog) {
  const timestamps = [];
  Object.values(exercisesLog).forEach(sets => {
    Object.values(sets).forEach(set => {
      if (set.timestamp) timestamps.push(new Date(set.timestamp).getTime());
    });
  });

  if (timestamps.length < 2) return null;
  const duration = (Math.max(...timestamps) - Math.min(...timestamps)) / 60000;
  return `${Math.round(duration)} min`;
}
