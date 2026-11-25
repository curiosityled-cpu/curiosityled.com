import { jsPDF } from "jspdf";

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const safeFile = (learner) => String(learner || "learner").replace(/[^a-z0-9@._-]/gi, "_");

/** One flat list for the learner's own record: completions first, then the audit trail. */
function recordRows(completions = [], events = []) {
  const completionRows = completions.map((item) => [
    item.date,
    item.type,
    item.title,
    item.detail || "",
  ]);
  const eventRows = events.map((event) => [
    event.occurred_at || event.created_date,
    "Activity",
    event.course_title || event.lesson_title || event.event_type,
    event.event_type,
  ]);
  return [...completionRows, ...eventRows];
}

/** CSV of everything the learner has completed, plus the server-written activity trail. */
export function downloadLearningRecordCsv(learner, { completions = [], events = [] } = {}) {
  const header = ["Date", "Type", "Title", "Detail"];
  const csv = [header, ...recordRows(completions, events)]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `learning-record-${safeFile(learner)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** The same record as a printable PDF, one line per completion or activity entry. */
export function downloadLearningRecordPdf(learner, { completions = [], events = [] } = {}) {
  const rows = recordRows(completions, events);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const left = 48;
  const width = 499;
  let y = 64;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Learning record", left, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(String(learner || "Learner"), left, y);
  y += 14;
  doc.text(`Generated ${new Date().toLocaleDateString()}`, left, y);

  y += 24;
  doc.setDrawColor(210);
  doc.line(left, y, left + width, y);
  y += 18;

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DATE", left, y);
  doc.text("TYPE", left + 88, y);
  doc.text("TITLE", left + 190, y);
  y += 6;
  doc.line(left, y, left + width, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  rows.forEach(([date, type, title]) => {
    if (y > 780) {
      doc.addPage();
      y = 64;
    }
    const dateLabel = date ? new Date(date).toLocaleDateString() : "—";
    const lines = doc.splitTextToSize(String(title || "—"), width - 195);
    doc.text(dateLabel, left, y);
    doc.text(String(type || ""), left + 88, y);
    doc.text(lines, left + 190, y);
    y += Math.max(14, lines.length * 12);
  });

  if (!rows.length) {
    doc.setTextColor(120);
    doc.text("No completions recorded yet.", left, y);
  }

  doc.save(`learning-record-${safeFile(learner)}.pdf`);
}

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