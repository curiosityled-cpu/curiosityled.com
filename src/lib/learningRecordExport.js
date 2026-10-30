const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

/**
 * The packet an auditor asks for: the learner's record exactly as it was written,
 * one row per event, nothing added or reordered. Shared by the admin Records panel
 * and the learner's own record so both produce the same file.
 */
export function downloadRecordCsv(learner, events = []) {
  const header = ["Occurred at", "Event", "Learner", "Actor", "Course", "Version", "Lesson", "Detail"];
  const lines = events.map((event) => [
    event.occurred_at || event.created_date,
    event.event_type,
    event.learner_email,
    event.actor_email || "",
    event.course_title || "",
    event.course_version ?? "",
    event.lesson_title || "",
    event.metadata ? JSON.stringify(event.metadata) : "",
  ]);
  const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `learning-record-${String(learner || "learner").replace(/[^a-z0-9@._-]/gi, "_")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}