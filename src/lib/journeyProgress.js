/**
 * Shared journey helpers for the learner surfaces (Journey Home + journey detail).
 * Dependency-free so both can use them without importing each other.
 */

/** A journey's ordered content, whichever shape it was authored in. */
export const journeyContent = (journey) =>
  journey?.content_structure?.length ? journey.content_structure : journey?.learning_items || [];

export const contentItemId = (entry) => entry?.learning_resource_id || entry?.resource_id;

export const progressByContentId = (contentProgress = []) =>
  Object.fromEntries((contentProgress || []).map((row) => [row.learning_resource_id, row.status]));

/** The first required-or-not item the learner has not finished yet. */
export const nextContentItem = (journey, contentProgress) => {
  const done = progressByContentId(contentProgress);
  return journeyContent(journey).find((entry) => done[contentItemId(entry)] !== "completed") || null;
};

/**
 * The enrollment patch for marking one content item done/not done, including the
 * journey's recomputed completion — the same rule the journey has always used.
 */
export const journeyProgressPatch = (journey, contentProgress, targetId, nowComplete) => {
  const content = journeyContent(journey);
  const current = progressByContentId(contentProgress);

  const content_progress = content.map((entry) => {
    const id = contentItemId(entry);
    const isTarget = id === targetId;
    const status = isTarget
      ? nowComplete
        ? "completed"
        : "not_started"
      : current[id] || "not_started";
    return {
      learning_resource_id: id,
      status,
      ...(isTarget && nowComplete ? { completed_date: new Date().toISOString() } : {}),
    };
  });

  const required = content.filter((entry) => !entry.is_optional);
  const doneRequired = required.filter(
    (entry) =>
      content_progress.find((row) => row.learning_resource_id === contentItemId(entry))?.status ===
      "completed"
  ).length;
  const completion_percentage = required.length
    ? Math.round((doneRequired / required.length) * 100)
    : 0;

  return {
    content_progress,
    completion_percentage,
    status:
      required.length && doneRequired === required.length ? "completed" : "in_progress",
  };
};

/** One ordered trail: learning resources, then signals, then off-platform experiences. */
export const journeySteps = (journey) => {
  const resourceSteps = journeyContent(journey).map((entry, index) => ({
    key: `resource:${contentItemId(entry) || index}`,
    kind: "resource",
    id: contentItemId(entry),
    title: entry.title || "Learning step",
    subtitle: entry.type || null,
    optional: !!entry.is_optional,
    sequential: entry.unlock_condition === "sequential",
  }));

  const signalSteps = (journey?.signal_items || []).map((entry, index) => ({
    key: `signal:${entry.signal_id || index}`,
    kind: "signal",
    id: entry.signal_id,
    title: entry.title || "Signal",
    subtitle: entry.signal_type || null,
    optional: false,
    sequential: false,
  }));

  const experienceSteps = (journey?.experiences || []).map((entry, index) => ({
    key: `experience:${index}`,
    kind: "experience",
    title: entry.title || "Experience",
    subtitle: entry.type || null,
    optional: false,
    sequential: false,
    entry,
  }));

  return [...resourceSteps, ...signalSteps, ...experienceSteps];
};