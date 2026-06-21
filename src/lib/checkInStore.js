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

export function loadCheckInHistory(userEmail) {
  if (!userEmail) return [];
  try {
    const raw = localStorage.getItem(getHistoryKey(userEmail));
    const history = raw ? JSON.parse(raw) : [];

    // Back-fill from legacy morning/evening completion caches if today isn't in history yet
    const today = getTodayET();
    const hasToday = history.some(r => r.check_in_date === today);
    if (!hasToday) {
      const todayRecord = { check_in_date: today };
      let hasData = false;

      try {
        const morningRaw = localStorage.getItem('morning_checkin_completed');
        if (morningRaw) {
          const { date, email, scores } = JSON.parse(morningRaw);
          if (date === today && email === userEmail && scores) {
            todayRecord.morning_completed = true;
            if (scores.energy != null) todayRecord.energy_score = scores.energy;
            if (scores.confidence != null) todayRecord.confidence_score = scores.confidence;
            if (scores.focus != null) todayRecord.focus_score = scores.focus;
            if (scores.load != null) todayRecord.load_score = scores.load;
            if (scores.growth != null) todayRecord.growth_score = scores.growth;
            hasData = true;
          }
        }
      } catch {}

      try {
        const eveningRaw = localStorage.getItem(`evening_checkin_completed_${userEmail}`);
        if (eveningRaw) {
          const { date, scores } = JSON.parse(eveningRaw);
          if (date === today && scores) {
            todayRecord.evening_completed = true;
            if (scores.energy != null) todayRecord.energy_score = scores.energy;
            if (scores.confidence != null) todayRecord.confidence_score = scores.confidence;
            if (scores.focus != null) todayRecord.focus_score = scores.focus;
            if (scores.load != null) todayRecord.load_score = scores.load;
            if (scores.growth != null) todayRecord.growth_score = scores.growth;
            hasData = true;
          }
        }
      } catch {}

      if (hasData) {
        const updated = [todayRecord, ...history];
        try { localStorage.setItem(getHistoryKey(userEmail), JSON.stringify(updated.slice(0, 120))); } catch {}
        return updated;
      }
    }

    return history;
  } catch { return []; }
}

export function saveCheckInToHistory(userEmail, checkInType, scores) {
  if (!userEmail || !scores) return;
  const today = getTodayET();
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