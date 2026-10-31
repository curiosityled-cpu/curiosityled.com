import {
  Settings2,
  Users,
  FileText,
  ClipboardCheck,
  Scale,
  MessageSquare,
  Send,
  ClipboardList,
  History,
  UserRound,
} from "lucide-react";

/**
 * The review cycle as a guided process — the same shape the Succession
 * workspace uses. Each stage declares which roles can act on it and which
 * view opens when the stage is selected.
 *
 * Stage ids match STAGE_META in src/lib/reviewStages.js, so the completion
 * state computed there (done / current / upcoming) drives the rail directly.
 */
export const REVIEW_STAGES = [
  {
    key: "setup",
    label: "Set up",
    icon: Settings2,
    short: "Period, policy, rating scale",
    description:
      "Set the review period, the rating scale, who gives peer feedback, and how outcomes are released. These rules lock when the cycle launches.",
    roles: ["admin"],
  },
  {
    key: "roster",
    label: "Roster & launch",
    icon: Users,
    short: "Who is reviewed and by whom",
    description:
      "Assign every employee their self review, a manager reviewer, and any peers — then launch. The roster locks at launch; later edits are reassignments and stay in the history.",
    roles: ["admin"],
  },
  {
    key: "self",
    label: "Self reviews",
    icon: FileText,
    short: "Employees assess themselves",
    description:
      "Employees record their own evidence and reflections before their manager writes a review.",
    roles: ["admin", "manager", "employee"],
  },
  {
    key: "manager",
    label: "Manager reviews",
    icon: ClipboardCheck,
    short: "Managers assess their reports",
    description:
      "Managers assess each report against the rating scale, with the self review and any peer feedback alongside.",
    roles: ["admin", "manager"],
  },
  {
    key: "calibration",
    label: "Calibration",
    icon: Scale,
    short: "Ratings compared and adjusted",
    description:
      "Ratings are compared across the team, adjusted where the evidence supports it, and finalized with a recorded reason.",
    roles: ["admin"],
  },
  {
    key: "conversation",
    label: "Conversations",
    icon: MessageSquare,
    short: "Review conversation recorded",
    description:
      "Managers hold the review conversation and record that it took place before the outcome can be released.",
    roles: ["admin", "manager"],
  },
  {
    key: "release",
    label: "Release",
    icon: Send,
    short: "Outcome shared and acknowledged",
    description:
      "Release the final outcome to the employee, then capture their acknowledgment and any written response.",
    roles: ["admin"],
  },
];

export const REVIEW_STAGE_MAP = Object.fromEntries(
  REVIEW_STAGES.map((s) => [s.key, s])
);

export const REVIEW_STAGE_ORDER = REVIEW_STAGES.map((s) => s.key);

/**
 * The view each role opens when they select a stage. A role with no entry
 * for a stage cannot act on it — the workspace shows a read-only notice
 * rather than a screen full of controls that would fail server-side.
 */
const STAGE_VIEWS = {
  setup: { admin: "settings" },
  roster: { admin: "roster" },
  self: { admin: "self-progress", manager: "self-progress", employee: "my-review" },
  manager: { admin: "manager-progress", manager: "manager-progress" },
  calibration: { admin: "calibration" },
  conversation: { admin: "conversation-progress", manager: "conversation-progress" },
  release: { admin: "release-progress" },
};

export function canActOnStage(stageKey, role) {
  return (REVIEW_STAGE_MAP[stageKey]?.roles || []).includes(role);
}

export function viewForStage(stageKey, role) {
  return STAGE_VIEWS[stageKey]?.[role] || null;
}

/** Every view in the workspace, for the "All views" drawer and lookups. */
export const REVIEW_VIEWS = [
  {
    key: "my-review",
    label: "My review",
    icon: ClipboardList,
    stage: null,
    roles: ["admin", "manager", "employee"],
    description:
      "Every self review, manager review, and peer request assigned to you, plus your released outcome.",
  },
  {
    key: "my-team",
    label: "My team",
    icon: UserRound,
    stage: null,
    roles: ["admin", "manager"],
    description: "The people who report to you and where their reviews stand.",
  },
  {
    key: "cycle-progress",
    label: "Everyone in the cycle",
    icon: Users,
    stage: null,
    roles: ["admin"],
    description: "Every participant in this cycle, with the actions open to them.",
  },
  {
    key: "history",
    label: "History",
    icon: History,
    stage: null,
    roles: ["admin"],
    description: "Every consequential action taken in this cycle, in order.",
  },
  { key: "settings", label: "Cycle rules", icon: Settings2, stage: "setup", roles: ["admin"] },
  { key: "roster", label: "Roster", icon: Users, stage: "roster", roles: ["admin"] },
  {
    key: "self-progress",
    label: "Self reviews",
    icon: FileText,
    stage: "self",
    roles: ["admin", "manager"],
  },
  {
    key: "manager-progress",
    label: "Manager reviews",
    icon: ClipboardCheck,
    stage: "manager",
    roles: ["admin", "manager"],
  },
  { key: "calibration", label: "Calibration", icon: Scale, stage: "calibration", roles: ["admin"] },
  {
    key: "conversation-progress",
    label: "Conversations",
    icon: MessageSquare,
    stage: "conversation",
    roles: ["admin", "manager"],
  },
  {
    key: "release-progress",
    label: "Release",
    icon: Send,
    stage: "release",
    roles: ["admin"],
  },
];

export function viewDef(viewKey) {
  return REVIEW_VIEWS.find((v) => v.key === viewKey) || null;
}

/** The stage a view belongs to, or null for a standalone view. */
export function stageForView(viewKey) {
  return viewDef(viewKey)?.stage ?? null;
}

/** Views this role can open, for the all-views drawer. */
export function viewsForRole(role, { hasTeam = false } = {}) {
  return REVIEW_VIEWS.filter(
    (v) => v.roles.includes(role) && (v.key !== "my-team" || hasTeam)
  );
}