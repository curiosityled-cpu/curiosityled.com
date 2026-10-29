/**
 * Default rating scale for review cycles.
 * Labels follow the 5-point scale the organisation asked for; definitions are
 * editable per cycle so each level can be tied to that role's expectations.
 */
export const DEFAULT_RATING_ANCHORS = [
  {
    value: 5,
    label: "Exceeds",
    definition:
      "Consistently goes beyond what the role requires. Outcomes are clearly above the standard, the behaviour is sustained across the period, and others benefit from it.",
  },
  {
    value: 4,
    label: "Meets",
    definition:
      "Fully meets what the role requires. Expected outcomes are delivered reliably and behaviour matches the expectations set for the role.",
  },
  {
    value: 3,
    label: "Partially meets",
    definition:
      "Meets some expectations and misses others. Performance is inconsistent or incomplete against the role's requirements, with identifiable gaps.",
  },
  {
    value: 2,
    label: "Below",
    definition:
      "Falls short of the role's requirements in more than one area. Gaps recur and need a documented plan to address them.",
  },
  {
    value: 1,
    label: "Far below",
    definition:
      "Substantially short of the role's requirements and not delivering its core expectations. Specific, immediate action is required.",
  },
];

export function normalizeAnchors(anchors) {
  const source = Array.isArray(anchors) && anchors.length ? anchors : DEFAULT_RATING_ANCHORS;
  return source
    .map((a) => ({
      value: Number(a?.value) || 0,
      label: String(a?.label || "").trim(),
      definition: String(a?.definition || "").trim(),
    }))
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Flat text form, kept so anything reading the older free-text guide still works. */
export function rubricToText(anchors) {
  return normalizeAnchors(anchors)
    .map((a) => `${a.value} — ${a.label}: ${a.definition}`)
    .join("\n");
}