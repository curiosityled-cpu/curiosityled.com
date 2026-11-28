/**
 * Builds the Perform page's "Needs attention" items.
 *
 * Pure functions only: the page supplies the data it already reads through the
 * existing access-controlled sources (the review workspace, the team rollup,
 * the person's own check-ins, goals and KPIs), and every item points at the
 * route that already completes that piece of work.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const TONE_ORDER = { overdue: 0, due: 1, open: 2 };

export function todayKeyET() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function keyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function mondayKeyOf(todayKey) {
  const d = new Date(`${todayKey}T12:00:00`);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return keyOf(d);
}

export function isCheckedIn(record) {
  return !!(
    record?.morning_completed ||
    record?.evening_completed ||
    record?.energy_score != null ||
    record?.load_score != null
  );
}

function dayOf(value) {
  return value ? String(value).slice(0, 10) : null;
}

function dueMeta(due, todayKey) {
  const day = dayOf(due);
  if (!day) return null;
  return day < todayKey ? `Overdue since ${day}` : `Due ${day}`;
}

function sortItems(items) {
  return [...items].sort(
    (a, b) =>
      (TONE_ORDER[a.tone] ?? 3) - (TONE_ORDER[b.tone] ?? 3) ||
      a.title.localeCompare(b.title)
  );
}

function reviewItems(cycles, { todayKey, roles }) {
  const items = [];
  for (const cycle of cycles || []) {
    for (const task of cycle.my_tasks || []) {
      if (task.submitted) continue;
      if (roles && !roles.includes(task.role)) continue;
      const title =
        task.role === "self"
          ? "Complete your self review"
          : task.role === "manager"
          ? `Write your review for ${task.employee_name}`
          : `Peer feedback for ${task.employee_name}`;
      const due = dayOf(task.due_date);
      items.push({
        id: task.task_id,
        kind: "review",
        title,
        meta: [cycle.title, dueMeta(task.due_date, todayKey), task.draft_responses ? "Draft saved" : null]
          .filter(Boolean)
          .join(" · "),
        tone: due && due < todayKey ? "overdue" : "due",
        to: "/reviews",
      });
    }
  }
  return items;
}

/**
 * How this week stands: days checked in out of the days elapsed so far, plus
 * the elapsed days before today that have no check-in.
 */
export function weekStanding(checkins, todayKey) {
  const checked = new Set((checkins || []).filter(isCheckedIn).map((r) => r.check_in_date));
  const missed = [];
  let done = 0;
  let elapsed = 0;
  let cursor = new Date(`${mondayKeyOf(todayKey)}T12:00:00`);
  const today = new Date(`${todayKey}T12:00:00`);
  while (cursor <= today) {
    const key = keyOf(cursor);
    elapsed += 1;
    if (checked.has(key)) done += 1;
    else if (key !== todayKey) missed.push(key);
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return { done, elapsed, missed, checkedToday: checked.has(todayKey) };
}

/** My work: my own review tasks, missed check-ins, and stale goal/KPI updates. */
export function buildMyWorkItems({ reviewData, checkins, goals, kpis, todayKey }) {
  const items = reviewItems(reviewData?.cycles, { todayKey, roles: null });

  for (const cycle of reviewData?.cycles || []) {
    const summary = cycle.my_summary;
    if (summary?.released && !summary.acknowledged_at) {
      items.push({
        id: `ack:${cycle.id}`,
        kind: "review",
        title: "Read and acknowledge your review outcome",
        meta: cycle.title,
        tone: "due",
        to: "/reviews",
      });
    }
  }

  const standing = weekStanding(checkins, todayKey);
  if (!standing.checkedToday) {
    items.push({
      id: "checkin:today",
      kind: "checkin",
      title: "Complete today's check-in",
      meta: "A two-minute read on how the day is going",
      tone: "due",
      to: "/today",
    });
  }

  const missed = standing.missed;
  if (missed.length > 0) {
    items.push({
      id: "checkin:missed",
      kind: "checkin",
      title: `Catch up on ${missed.length} missed check-in${missed.length === 1 ? "" : "s"}`,
      meta: "Days this week without a check-in",
      tone: "overdue",
      to: "/my-rhythm",
    });
  }

  const stale = (row) =>
    !row.updated_date || Date.now() - new Date(row.updated_date).getTime() > 7 * DAY_MS;

  for (const goal of (goals || []).filter(stale).slice(0, 3)) {
    items.push({
      id: `goal:${goal.id}`,
      kind: "goal",
      title: `Update progress on “${goal.title}”`,
      meta: "No update in the last week",
      tone: "open",
      to: "/my-performance",
    });
  }
  for (const kpi of (kpis || []).filter(stale).slice(0, 2)) {
    items.push({
      id: `kpi:${kpi.id}`,
      kind: "kpi",
      title: `Record this week's value for “${kpi.title}”`,
      meta: "No update in the last week",
      tone: "open",
      to: "/my-performance",
    });
  }

  return sortItems(items);
}

/** My team: the reviews I owe my reports, and conversations still to record. */
export function buildTeamItems({ reviewData, todayKey }) {
  const items = reviewItems(reviewData?.cycles, { todayKey, roles: ["manager"] });

  for (const cycle of reviewData?.cycles || []) {
    if (cycle.config?.require_conversation === false) continue;
    for (const row of cycle.progress_rows || []) {
      if (row.manager_submitted && !row.conversation_completed) {
        items.push({
          id: `conv:${cycle.id}:${row.participant_id}`,
          kind: "conversation",
          title: `Record your review conversation with ${row.employee_name}`,
          meta: cycle.title,
          tone: "due",
          to: "/reviews",
        });
      }
    }
  }

  return sortItems(items);
}

/** Organization: review cycles with manager reviews still outstanding (admins only). */
export function buildOrgItems({ reviewData }) {
  if (!reviewData?.viewer?.is_admin) return [];
  const items = [];
  for (const cycle of reviewData?.cycles || []) {
    if (cycle.status === "draft") continue;
    const counts = cycle.counts || {};
    const outstanding = Math.max(0, (counts.participants || 0) - (counts.manager_done || 0));
    if (outstanding > 0) {
      items.push({
        id: `cycle:${cycle.id}`,
        kind: "review",
        title: `${outstanding} manager review${outstanding === 1 ? "" : "s"} still outstanding`,
        meta: cycle.title,
        tone: "due",
        to: "/reviews",
      });
    }
  }
  return sortItems(items);
}