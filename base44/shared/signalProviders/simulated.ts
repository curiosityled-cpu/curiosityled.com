/**
 * Simulated Signal Providers
 *
 * These providers generate clearly-labeled demo patterns for tool categories
 * that are NOT yet connected (Microsoft Viva/Teams, LMS, HRIS, watchdog apps).
 * They drive the cross-tool narrative — showing users what patterns they
 * WOULD unlock by connecting these systems — without faking real data.
 *
 * Each simulated provider:
 * - Always returns demo signals (isSimulated = true)
 * - isAvailable() always returns false (not a real connection)
 * - Signals are labeled "preview" so users know they're illustrative
 *
 * The full Microsoft ecosystem design (Outlook, Teams, Viva Insights, Viva
 * Learning, Copilot activity) is the target architecture. Outlook is real in v1;
 * the rest are simulated here with the provider interface ready to fill in.
 */
import { scoreToStatus, type Signal, type SignalProvider } from './types.ts';

function makeSimulated(
  id: string,
  source: string,
  sourceLabel: string,
  bucket: string,
  name: string,
  tagline: string,
  evidence: string[],
  severity: number,
  move: string,
  reason: string,
  atreusMsg: string,
): Signal {
  return {
    id,
    source,
    sourceLabel,
    isSimulated: true,
    bucket,
    name,
    tagline,
    evidence,
    severity,
    status: scoreToStatus(severity) || 'Emerging',
    generatedAt: new Date().toISOString(),
    suggestedMove: {
      move,
      reason,
      cta: 'Connect to unlock',
      flow: 'practice',
      atreus: true,
      atreusMsg,
      impact: severity - 10, // Simulated moves rank slightly below real ones at equal severity
    },
  };
}

// ── Microsoft Viva / Teams (simulated) ──────────────────────────────────────
// Target: Teams activity, Viva Insights (focus time, wellbeing), Viva Learning
// These require additional Graph scopes beyond Calendars.ReadWrite.
export const microsoftVivaProvider: SignalProvider = {
  source: 'microsoft-viva',
  sourceLabel: 'Microsoft Viva',
  isSimulated: true,

  async isAvailable(): Promise<boolean> {
    return false; // Simulated — not a real connection
  },

  async fetchSignals(): Promise<Signal[]> {
    return [
      makeSimulated(
        'viva_focus_fragmentation',
        'microsoft-viva',
        'Microsoft Viva',
        'Operational Risk',
        'Focus Time Fragmentation',
        'Viva Insights would show your focus blocks are being eroded by meeting creep.',
        [
          'Preview: Viva Insights would detect focus blocks interrupted by meetings',
          'Preview: Teams activity data would show after-hours collaboration patterns',
        ],
        55,
        'Protect one focus block this week.',
        'Viva Insights would show where your focus time is being fragmented — the first step is reclaiming one block.',
        'If I connect Microsoft Viva, I want to understand my focus time fragmentation. Can you help me protect a focus block?',
      ),
      makeSimulated(
        'viva_learning_stall',
        'microsoft-viva',
        'Microsoft Viva',
        'Execution',
        'Learning Activity Stall',
        'Viva Learning would reveal that assigned learning modules are going unopened.',
        [
          'Preview: Viva Learning would track assigned module completion rates',
          'Preview: Correlation with Teams activity would show learning deprioritized under load',
        ],
        40,
        'Check in on one assigned learning module.',
        'Viva Learning would surface which modules are stalling so you can address the root cause.',
        'If I connect Microsoft Viva Learning, I want to see which assigned learning is stalling. Can you help me follow up?',
      ),
    ];
  },
};

// ── LMS (simulated) ──────────────────────────────────────────────────────────
// Target: Learning Management System (e.g. LinkedIn Learning, Cornerstone, Docebo)
// Would track course completion, skill gaps, learning journey progress.
export const lmsProvider: SignalProvider = {
  source: 'lms',
  sourceLabel: 'LMS',
  isSimulated: true,

  async isAvailable(): Promise<boolean> {
    return false;
  },

  async fetchSignals(): Promise<Signal[]> {
    return [
      makeSimulated(
        'lms_completion_gap',
        'lms',
        'LMS',
        'Execution',
        'Team Learning Completion Gap',
        'Your LMS would show that team-wide course completion has dropped below 60%.',
        [
          'Preview: LMS would track team course completion rates',
          'Preview: Skill gap analysis would flag competencies falling behind',
        ],
        50,
        'Review which team members are falling behind on learning.',
        'Your LMS would show exactly who is stalling and on which modules — the first step is a targeted check-in.',
        'If I connect my LMS, I want to see team learning completion gaps. Can you help me plan a check-in?',
      ),
    ];
  },
};

// ── HRIS (simulated) ─────────────────────────────────────────────────────────
// Target: HR Information System (e.g. Workday, BambooHR, ADP)
// Would track attrition signals, tenure, performance review cycles, engagement.
export const hrisProvider: SignalProvider = {
  source: 'hris',
  sourceLabel: 'HRIS',
  isSimulated: true,

  async isAvailable(): Promise<boolean> {
    return false;
  },

  async fetchSignals(): Promise<Signal[]> {
    return [
      makeSimulated(
        'hris_attrition_signal',
        'hris',
        'HRIS',
        'People Risk',
        'Attrition Risk Signal',
        'Your HRIS would flag a direct report showing classic disengagement indicators.',
        [
          'Preview: HRIS would surface PTO patterns, tenure, and review scores',
          'Preview: Correlation with check-in data would identify disengagement before resignation',
        ],
        60,
        'Schedule a retention conversation with the flagged team member.',
        'Your HRIS would identify who is at risk before they resign — early conversations are the most effective retention tool.',
        'If I connect my HRIS, I want to see attrition risk signals. Can you help me plan a retention conversation?',
      ),
    ];
  },
};

// ── Watchdog / Monitoring (simulated) ────────────────────────────────────────
// Target: Operational monitoring tools (e.g. Datadog, PagerDuty, Sentry)
// Would track system incidents, escalation patterns, on-call load.
export const watchdogProvider: SignalProvider = {
  source: 'watchdog',
  sourceLabel: 'Watchdog',
  isSimulated: true,

  async isAvailable(): Promise<boolean> {
    return false;
  },

  async fetchSignals(): Promise<Signal[]> {
    return [
      makeSimulated(
        'watchdog_escalation_pattern',
        'watchdog',
        'Watchdog',
        'Operational Risk',
        'Escalation Pattern Detected',
        'Your monitoring tools would show that escalations are clustering on specific days.',
        [
          'Preview: Watchdog tools would track incident frequency and escalation patterns',
          'Preview: Correlation with your calendar would show escalations spike after high-meeting-load days',
        ],
        45,
        'Review the escalation pattern and identify a preventive action.',
        'Your watchdog tools would show when and why escalations cluster — prevention starts with seeing the pattern.',
        'If I connect my monitoring tools, I want to see escalation patterns. Can you help me identify a preventive action?',
      ),
    ];
  },
};

export const simulatedProviders: SignalProvider[] = [
  microsoftVivaProvider,
  lmsProvider,
  hrisProvider,
  watchdogProvider,
];