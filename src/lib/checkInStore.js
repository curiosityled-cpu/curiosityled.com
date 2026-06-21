/**
 * checkInStore — localStorage-backed multi-day check-in history.
 * Since DailyCheckIn entity has a persistence issue at the platform level,
 * we maintain a local history store keyed by user email.
 *
 * History format: array of { check_in_date, morning_completed, evening_completed,
 *   energy_score, confidence_score, focus_score, load_score, growth_score }
 */

function getHistoryKey(userEmail) {
  return `checkin_history_${userEmail}`;
}

function getTodayET() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

/**
 * Migrate legacy morning/evening completion caches into the history store.
 * This runs once per user to seed data from prior check-ins done before
 * the multi-day store existed.
 */
function migrateLegacyData(userEmail) {
  const today = getTodayET();
  try {
    // Morning legacy: { date, email, scores: { energy, confidence, focus, load, growth } }
    const morningRaw = localStorage.getItem('morning_checkin_completed');
    const morningCache = morningRaw ? JSON.parse(morningRaw) : null;
    if (morningCache?.email === userEmail && morningCache?.date && morningCache?.scores) {
      saveCheckInToHistory(userEmail, 'morning', morningCache.scores, morningCache.date);
    }

    // Evening legacy: { date, email, scores, big3 }
    const eveningRaw = localStorage.getItem(`evening_checkin_completed_${userEmail}`);
    const eveningCache = eveningRaw ? JSON.parse(eveningRaw) : null;
    if (eveningCache?.date && eveningCache?.scores) {
      saveCheckInToHistory(userEmail, 'evening', eveningCache.scores, eveningCache.date);
    }
  } catch {}
}

export function loadCheckInHistory(userEmail) {
  if (!userEmail) return [];
  try {
    // Run migration to seed any legacy cached data on first load
    const migrationKey = `checkin_migrated_${userEmail}`;
    if (!localStorage.getItem(migrationKey)) {
      migrateLegacyData(userEmail);
      localStorage.setItem(migrationKey, '1');
    }
    const raw = localStorage.getItem(getHistoryKey(userEmail));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCheckInToHistory(userEmail, checkInType, scores, dateOverride) {
  if (!userEmail || !scores) return;
  const today = dateOverride || getTodayET();
  try {
    const history = loadCheckInHistory(userEmail);
    const existingIdx = history.findIndex(r => r.check_in_date === today);
    const update = {
      check_in_date: today,
      ...(existingIdx >= 0 ? history[existingIdx] : {}),
    };

    if (checkInType === 'morning') {
      update.morning_completed = true;
    } else if (checkInType === 'evening') {
      update.evening_completed = true;
    }

    // Always store the scores from the check-in that was just completed
    if (scores.energy != null) update.energy_score = scores.energy;
    if (scores.confidence != null) update.confidence_score = scores.confidence;
    if (scores.focus != null) update.focus_score = scores.focus;
    if (scores.load != null) update.load_score = scores.load;
    if (scores.growth != null) update.growth_score = scores.growth;

    let updated;
    if (existingIdx >= 0) {
      updated = history.map((r, i) => i === existingIdx ? update : r);
    } else {
      updated = [update, ...history];
    }

    // Keep last 120 entries max
    localStorage.setItem(getHistoryKey(userEmail), JSON.stringify(updated.slice(0, 120)));
  } catch {}
}