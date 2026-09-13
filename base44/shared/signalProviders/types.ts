/**
 * Cross-Tool Signal Provider Types
 * Common interfaces for the pluggable signal-provider architecture.
 * Each external system (Outlook, Google Calendar, HubSpot, Microsoft Viva,
 * LMS, HRIS, watchdog) implements the SignalProvider interface so the
 * aggregator can iterate them uniformly.
 */

export interface Signal {
  id: string;
  source: string;           // 'in-app' | 'outlook' | 'google-calendar' | 'hubspot' | 'microsoft-viva' | 'lms' | 'hris' | 'watchdog'
  sourceLabel: string;      // Human-readable: 'In-app', 'Outlook', 'Google Calendar', etc.
  isSimulated: boolean;
  bucket: string;           // 'Operational Risk' | 'People Risk' | 'Execution'
  name: string;
  tagline: string;
  evidence: string[];       // Cross-tool evidence trail with source attribution
  severity: number;         // 0-100
  status: 'Emerging' | 'Active' | 'Persistent';
  generatedAt: string;
  // Optional: the person this signal is about (for RLS scoping)
  subjectEmail?: string;
  // Suggested move for this pattern
  suggestedMove?: MoveCandidate;
}

export interface MoveCandidate {
  move: string;
  reason: string;
  cta: string;
  flow: 'practice' | 'goals' | 'development';
  atreus: boolean;
  atreusMsg?: string;
  link?: string;
  impact: number;            // 0-100, used to rank across patterns
}

export interface SignalProvider {
  source: string;
  sourceLabel: string;
  isSimulated: boolean;
  /**
   * Fetch signals from this provider.
   * Returns empty array if the connector is not connected (real providers)
   * or always returns demo patterns (simulated providers).
   */
  fetchSignals(base44: any, user: any, context?: any): Promise<Signal[]>;
  /** Whether this provider's connector is currently connected */
  isAvailable(base44: any): Promise<boolean>;
}

export interface CrossToolResult {
  topPatterns: Signal[];
  bestMove: {
    move: string;
    reason: string;
    cta: string;
    flow: string;
    atreus: boolean;
    atreusMsg?: string;
    link?: string;
    sourcePatternIds: string[];
    sourceAttribution: string;
  };
  connectedSources: string[];
  simulatedSources: string[];
}

export function scoreToStatus(score: number): 'Emerging' | 'Active' | 'Persistent' | null {
  if (score >= 75) return 'Persistent';
  if (score >= 50) return 'Active';
  if (score >= 15) return 'Emerging';
  return null;
}