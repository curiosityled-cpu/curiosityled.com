import {
  Compass,
  Target,
  FileText,
  Search,
  ClipboardCheck,
  Scale,
  Zap,
  ArrowRightCircle,
  Activity,
  Repeat,
  Briefcase,
  Building2,
  Shield,
  Camera,
  Users,
  UserCheck,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

/**
 * The nine-stage succession methodology. Each stage maps to a set of views
 * and a set of roles that can act on it. The stage rail reads
 * SuccessionCycle.process_stage to render completed/current/locked states.
 */
export const STAGES = [
  {
    key: "frame",
    label: "Frame",
    icon: Compass,
    short: "Define the cycle scope and goals",
    description:
      "Establish the succession cycle — its timeframe, scope, and the business drivers behind it.",
    views: ["cycles"],
    roles: ["admin"],
  },
  {
    key: "focus",
    label: "Focus",
    icon: Target,
    short: "Identify and prioritize critical roles",
    description:
      "Define organizational roles and designate which are critical enough to require succession planning.",
    views: ["roles", "critical-roles"],
    roles: ["admin"],
  },
  {
    key: "blueprint",
    label: "Blueprint",
    icon: FileText,
    short: "Build role success blueprints",
    description:
      "Draft role requirements, approve blueprints, and publish effective snapshots for each critical role.",
    views: ["roles", "critical-roles", "blueprints", "snapshots"],
    roles: ["admin"],
  },
  {
    key: "discover",
    label: "Discover",
    icon: Search,
    short: "Identify potential successors",
    description:
      "Build talent pools and identify candidates for each critical role.",
    views: ["talent-pools", "candidates"],
    roles: ["admin", "successor"],
  },
  {
    key: "evidence",
    label: "Evidence",
    icon: ClipboardCheck,
    short: "Collect and review evidence",
    description:
      "Gather performance evidence, competency behaviors, and critical experiences for each candidate.",
    views: ["evidence-queue", "candidates"],
    roles: ["admin", "successor", "manager"],
  },
  {
    key: "deliberate",
    label: "Deliberate",
    icon: Scale,
    short: "Calibrate and ratify readiness",
    description:
      "Calibrate ratings, review readiness proposals, and ratify readiness conclusions.",
    views: ["calibration", "ratification", "readiness-proposals"],
    roles: ["admin", "calibrator"],
  },
  {
    key: "accelerate",
    label: "Accelerate",
    icon: Zap,
    short: "Develop candidates and close gaps",
    description:
      "Create development plans and track development actions to close readiness gaps.",
    views: ["development-plans", "development-actions"],
    roles: ["admin", "successor", "manager"],
  },
  {
    key: "transition",
    label: "Transition",
    icon: ArrowRightCircle,
    short: "Plan and execute transitions",
    description:
      "Initiate transitions, plan knowledge transfer, and manage the move into the new role.",
    views: ["transitions"],
    roles: ["admin", "successor"],
  },
  {
    key: "monitor",
    label: "Monitor",
    icon: Activity,
    short: "Monitor and review",
    description:
      "Track operational alerts, review progress, and keep the succession pipeline healthy.",
    views: ["operational-monitor", "review-queue"],
    roles: ["admin"],
  },
];

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

export const STAGE_ORDER = STAGES.map((s) => s.key);

/**
 * All views for the "All views" escape-hatch drawer, grouped by stage.
 * `stage: null` means it's a standalone view (Overview, Governance).
 */
export const ALL_VIEWS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, stage: null },
  { key: "cycles", label: "Succession Cycles", icon: Repeat, stage: "frame" },
  { key: "roles", label: "Organizational Roles", icon: Briefcase, stage: "focus" },
  { key: "positions", label: "Organizational Positions", icon: Building2, stage: "focus" },
  { key: "critical-roles", label: "Critical Roles", icon: Shield, stage: "focus" },
  { key: "blueprints", label: "Role Success Blueprints", icon: FileText, stage: "blueprint" },
  { key: "snapshots", label: "Effective Snapshots", icon: Camera, stage: "blueprint" },
  { key: "talent-pools", label: "Talent Pools", icon: Users, stage: "discover" },
  { key: "candidates", label: "Candidates", icon: UserCheck, stage: "discover" },
  { key: "evidence-queue", label: "Evidence Review", icon: ClipboardCheck, stage: "evidence" },
  { key: "readiness-proposals", label: "Readiness Proposals", icon: ClipboardCheck, stage: "deliberate" },
  { key: "calibration", label: "Calibration", icon: Users, stage: "deliberate" },
  { key: "ratification", label: "Ratification", icon: ShieldCheck, stage: "deliberate" },
  { key: "development-plans", label: "Development Plans", icon: Target, stage: "accelerate" },
  { key: "development-actions", label: "Development Actions", icon: Zap, stage: "accelerate" },
  { key: "transitions", label: "Transitions", icon: ArrowRightCircle, stage: "transition" },
  { key: "operational-monitor", label: "Operational Monitor", icon: Activity, stage: "monitor" },
  { key: "review-queue", label: "Review Queue", icon: ClipboardCheck, stage: "monitor" },
  { key: "governance", label: "Governance", icon: ShieldCheck, stage: null },
];

/**
 * AI Assist configuration per stage. Each stage has a focused prompt and a
 * shared response schema ({ summary, recommendations: [{ title, rationale }] }).
 * AI only drafts/suggests — it never writes to immutable records.
 */
export const ASSIST_CONFIG = {
  frame: {
    title: "Draft cycle scope",
    prompt: (ctx) => `You are a succession planning expert. An HR administrator is framing a succession cycle.
Cycle name: "${ctx.cycleName || "(none)"}"
Cycle key: "${ctx.cycleKey || "(none)"}"

Suggest how to frame this cycle: a concise scope summary and 2-4 recommendations on which roles to prioritize and what business drivers should shape the cycle. Return JSON.`,
  },
  focus: {
    title: "Suggest role priority",
    prompt: (ctx) => `You are a succession planning expert. The administrator is identifying which organizational roles are critical enough to require succession planning.
Cycle: "${ctx.cycleName || "(none)"}"

Suggest 2-4 recommendations on how to prioritize which roles are truly critical — considering strategic impact, vacancy risk, and difficulty to replace. Return JSON.`,
  },
  blueprint: {
    title: "Draft role requirements",
    prompt: (ctx) => `You are a succession planning expert. The administrator is building role success blueprints — the requirements that define what "ready" looks like for each critical role.
Cycle: "${ctx.cycleName || "(none)"}"

Suggest 2-4 recommendations on how to draft effective role requirements — drawing from competency libraries, critical experiences, and measurable outcomes. Include guidance on avoiding overly broad or vague requirements. Return JSON.`,
  },
  discover: {
    title: "Suggest candidate successors",
    prompt: (ctx) => `You are a succession planning expert. The administrator is identifying potential successors from talent pools.
Cycle: "${ctx.cycleName || "(none)"}"

Suggest 2-4 recommendations on how to identify and evaluate potential successors — considering talent-pool membership, assessment scores, and role proximity. Emphasize that these are suggestions to review, never auto-nominations. Return JSON.`,
  },
  evidence: {
    title: "Summarize evidence portfolio",
    prompt: (ctx) => `You are a succession planning expert. The team is collecting and reviewing evidence for candidates.
Cycle: "${ctx.cycleName || "(none)"}"

Suggest 2-4 recommendations on how to build a strong evidence portfolio — what types of evidence matter most, how to map evidence to frozen requirements, and how to spot gaps. Return JSON.`,
  },
  deliberate: {
    title: "Pre-fill calibration talking points",
    prompt: (ctx) => `You are a succession planning expert. Calibrators are reviewing ratings and preparing for calibration sessions.
Cycle: "${ctx.cycleName || "(none)"}"

Suggest 2-4 recommendations on how to run an effective calibration discussion — what to look for in rating distributions, how to handle dissent, and how to ensure fairness. Return JSON.`,
  },
  accelerate: {
    title: "Draft development gap summary",
    prompt: (ctx) => `You are a succession planning expert. The team is creating development plans to close readiness gaps.
Cycle: "${ctx.cycleName || "(none)"}"

Suggest 2-4 recommendations on how to build effective development plans — prioritizing gaps, choosing stretch assignments, and setting realistic timelines. Return JSON.`,
  },
  transition: {
    title: "Flag transition risks",
    prompt: (ctx) => `You are a succession planning expert. The team is planning and executing role transitions.
Cycle: "${ctx.cycleName || "(none)"}"

Suggest 2-4 recommendations on how to de-risk transitions — knowledge-transfer gaps, timeline pressure, stakeholder management, and ramp-up support. Return JSON.`,
  },
  monitor: {
    title: "Summarize open alerts",
    prompt: (ctx) => `You are a succession planning expert. The team is monitoring the succession pipeline for operational exceptions.
Cycle: "${ctx.cycleName || "(none)"}"

Suggest 2-4 recommendations on how to triage and respond to operational alerts — which alert types to prioritize, how to prevent drift, and when to schedule follow-up reviews. Return JSON.`,
  },
};

export const ASSIST_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "A concise 1-2 sentence overview" },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short actionable title" },
          rationale: { type: "string", description: "Why this matters, 1-2 sentences" },
        },
      },
    },
  },
};