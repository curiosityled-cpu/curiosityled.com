/**
 * The stages a performance review cycle moves through, and where the cycle
 * currently stands in each one. Kept in one place so the stage rail, the
 * progress board, and any future view agree on the same order and meaning.
 */

export const STAGE_META = [
  { id: "setup", label: "Set up", hint: "Period, policy, rating scale" },
  { id: "roster", label: "Roster & launch", hint: "Who is reviewed and by whom" },
  { id: "self", label: "Self reviews", hint: "Employees assess themselves" },
  { id: "manager", label: "Manager reviews", hint: "Managers assess their reports" },
  { id: "calibration", label: "Calibration", hint: "Ratings compared and adjusted" },
  { id: "conversation", label: "Conversations", hint: "Review conversation recorded" },
  { id: "release", label: "Release", hint: "Outcome shared and acknowledged" },
];

const pct = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

/**
 * Builds the stage list for one cycle.
 * Every stage carries what the rail needs to show progress and what the board
 * needs to filter the roster down to the people still sitting at that stage.
 */
export function buildCycleStages(cycle, { canConfigure = false } = {}) {
  if (!cycle) return [];

  const rows = cycle.progress_rows || [];
  const counts = cycle.counts || {};
  const cfg = cycle.config || {};
  const total = counts.participants ?? rows.length;

  const needsCalibration = cfg.release_policy === "after_calibration";
  const needsConversation = cfg.require_conversation !== false;

  const stages = STAGE_META.filter(
    (s) =>
      (s.id !== "calibration" || needsCalibration) &&
      (s.id !== "conversation" || needsConversation)
  ).map((s) => {
    switch (s.id) {
      case "setup":
        return {
          ...s,
          done: !!cfg.period_start,
          detail: cfg.has_snapshot ? "Locked at launch" : canConfigure ? "Edit rules" : "HR Admin only",
          adminOnly: true,
        };
      case "roster":
        return {
          ...s,
          done: cycle.status !== "draft",
          detail: total ? `${total} participant${total === 1 ? "" : "s"}` : "No roster yet",
        };
      case "self":
        return {
          ...s,
          done: total > 0 && (counts.self_done ?? 0) === total,
          detail: `${counts.self_done ?? 0}/${total}`,
          percent: pct(counts.self_done ?? 0, total),
        };
      case "manager":
        return {
          ...s,
          done: total > 0 && (counts.manager_done ?? 0) === total,
          detail: `${counts.manager_done ?? 0}/${total}`,
          percent: pct(counts.manager_done ?? 0, total),
        };
      case "calibration": {
        const status = cycle.calibration?.status;
        return {
          ...s,
          done: status === "completed",
          detail:
            status === "completed"
              ? "Finalized"
              : status === "in_progress"
              ? "In progress"
              : "Not started",
          startsOn: "calibration",
        };
      }
      case "conversation":
        return {
          ...s,
          done: total > 0 && (counts.conversation_done ?? 0) === total,
          detail: `${counts.conversation_done ?? 0}/${total}`,
          percent: pct(counts.conversation_done ?? 0, total),
        };
      case "release":
        return {
          ...s,
          done: total > 0 && (counts.released ?? 0) === total,
          detail: `${counts.released ?? 0}/${total}`,
          percent: pct(counts.released ?? 0, total),
        };
      default:
        return s;
    }
  });

  // The first stage that is not finished is the one the cycle is working on.
  const currentIndex = stages.findIndex((s) => !s.done);

  return stages.map((s, i) => ({
    ...s,
    state: s.done ? "done" : i === currentIndex ? "current" : "upcoming",
  }));
}

/**
 * The full process, shown before any cycle exists so people can see the path a
 * review takes. Nothing is done yet, so the first stage reads as the start.
 */
export function buildPreviewStages() {
  return STAGE_META.map((s, i) => ({
    ...s,
    detail: s.hint,
    state: i === 0 ? "current" : "upcoming",
  }));
}

/** Rows still sitting at a given stage, used to focus the progress board. */
export function rowsAtStage(rows, stage, config = {}) {
  const list = rows || [];
  switch (stage) {
    case "self":
      return list.filter((r) => !r.self_submitted);
    case "manager":
      return list.filter((r) => r.self_submitted && !r.manager_submitted);
    case "calibration":
      return list.filter(
        (r) => r.manager_submitted && !r.calibration_completed && !r.conversation_completed
      );
    case "conversation":
      return list.filter((r) => r.manager_submitted && !r.conversation_completed);
    case "release":
      return list.filter((r) => r.release_status === "pending");
    default:
      return list;
  }
}

/** The tab (and board focus) a stage click should take the user to. */
export function stageDestination(stageId) {
  if (stageId === "setup") return { tab: "progress", focus: null, settings: true };
  if (stageId === "calibration") return { tab: "calibration", focus: null };
  if (stageId === "roster") return { tab: "progress", focus: "roster" };
  return { tab: "progress", focus: stageId };
}