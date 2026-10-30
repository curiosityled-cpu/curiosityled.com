/** Parsing for WebVTT caption files, so a video's captions can also be read as a transcript. */

const toSeconds = (stamp) => {
  const parts = stamp.trim().split(":").map(Number);
  if (parts.some((value) => Number.isNaN(value))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
};

export function clockLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  const hours = Math.floor(mins / 60);
  return hours ? `${hours}:${String(mins % 60).padStart(2, "0")}:${secs}` : `${mins}:${secs}`;
}

/** Returns [{ start, text }] in file order. Malformed blocks are skipped rather than thrown. */
export function parseVtt(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .replace(/\r/g, "")
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split("\n").filter(Boolean);
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex === -1) return null;
      const start = toSeconds(lines[timeIndex].split("-->")[0]);
      const content = lines
        .slice(timeIndex + 1)
        .join(" ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
      return content ? { start, text: content } : null;
    })
    .filter(Boolean);
}