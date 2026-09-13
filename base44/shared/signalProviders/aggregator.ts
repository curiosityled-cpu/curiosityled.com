/**
 * Cross-Tool Signal Aggregator
 *
 * Combines in-app patterns (from the BPO pattern engine, passed from frontend)
 * with external signals from connected connectors and simulated demo patterns
 * from unconnected tool categories. Normalizes everything into a common Signal
 * shape, applies RLS scoping to external signals, ranks to get Top 3, and
 * selects the single best next move across all three patterns.
 */
import { type Signal, type CrossToolResult, type MoveCandidate } from './types.ts';
import { filterSignalsByRLS } from './rls.ts';
import { outlookProvider } from './outlook.ts';
import { googleCalendarProvider } from './googleCalendar.ts';
import { hubspotProvider } from './hubspot.ts';
import { simulatedProviders } from './simulated.ts';

const realProviders = [outlookProvider, googleCalendarProvider, hubspotProvider];

/**
 * Normalize an in-app pattern (from the BPO pattern engine) into a Signal.
 */
function normalizeInAppPattern(pattern: any): Signal {
  const severity = pattern.score || 0;
  const move = buildMoveFromPattern(pattern);
  return {
    id: `in-app-${pattern.id}`,
    source: 'in-app',
    sourceLabel: 'In-app',
    isSimulated: false,
    bucket: pattern.bucket || 'Execution',
    name: pattern.name,
    tagline: pattern.tagline || '',
    evidence: (pattern.evidence || []).map((e: string) => `${e} (in-app)`),
    severity,
    status: pattern.status || (severity >= 75 ? 'Persistent' : severity >= 50 ? 'Active' : 'Emerging'),
    generatedAt: new Date().toISOString(),
    suggestedMove: move,
  };
}

/**
 * Generate a MoveCandidate from an in-app pattern.
 */
function buildMoveFromPattern(pattern: any): MoveCandidate {
  const ctaType = pattern.ctaType || 'practice';
  const flow = ctaType === 'today' ? 'practice' : ctaType === 'practice' ? 'practice' : 'goals';
  return {
    move: pattern.cta || `Take action on: ${pattern.name}`,
    reason: pattern.whatsAtStake || pattern.tagline || 'This pattern deserves attention.',
    cta: 'Take action',
    flow: flow as 'practice' | 'goals' | 'development',
    atreus: true,
    atreusMsg: `I'm seeing the "${pattern.name}" pattern in my data. Can you help me work through a next step?`,
    impact: Math.max(pattern.score || 0, 40), // In-app patterns have a floor impact
  };
}

/**
 * Main aggregation function.
 * @param base44 - SDK client from createClientFromRequest
 * @param user - Authenticated user from base44.auth.me()
 * @param inAppPatterns - Pre-computed in-app patterns from the frontend (BPO engine output)
 */
export async function aggregateCrossToolSignals(
  base44: any,
  user: any,
  inAppPatterns: any[],
): Promise<CrossToolResult> {
  const connectedSources: string[] = [];
  const simulatedSources: string[] = [];
  const allSignals: Signal[] = [];

  // ── 1. Normalize in-app patterns ──
  // Always include in-app patterns — they're a first-class signal source
  for (const p of inAppPatterns.slice(0, 5)) {
    allSignals.push(normalizeInAppPattern(p));
  }

  // ── 2. Fetch external signals from real providers ──
  for (const provider of realProviders) {
    try {
      const available = await provider.isAvailable(base44);
      if (available) {
        const signals = await provider.fetchSignals(base44, user);
        // Apply RLS scoping to external signals
        const scoped = filterSignalsByRLS(signals, user);
        allSignals.push(...scoped);
        if (signals.length > 0) {
          connectedSources.push(provider.sourceLabel);
        }
      }
    } catch {
      // Provider failed — skip silently, don't break aggregation
    }
  }

  // ── 3. Add simulated demo patterns for unconnected tools ──
  for (const provider of simulatedProviders) {
    try {
      const signals = await provider.fetchSignals(base44, user);
      // Only include ONE simulated signal per provider (the highest severity)
      // to avoid flooding the list with demos
      if (signals.length > 0) {
        const top = signals.sort((a, b) => b.severity - a.severity)[0];
        allSignals.push(top);
        simulatedSources.push(provider.sourceLabel);
      }
    } catch {
      // Simulated provider failed — skip
    }
  }

  // ── 4. Rank all signals by severity ──
  // Real signals rank above simulated ones at equal severity
  const ranked = allSignals.sort((a, b) => {
    if (a.isSimulated !== b.isSimulated) return a.isSimulated ? 1 : -1;
    return b.severity - a.severity;
  });

  // ── 5. Take Top 3 ──
  const topPatterns = ranked.slice(0, 3);

  // ── 6. Select best next move across all three patterns ──
  // Pick the move with the highest impact score from the top 3
  let bestMoveSignal: Signal | null = null;
  let bestMove: MoveCandidate | null = null;

  for (const signal of topPatterns) {
    if (signal.suggestedMove && (!bestMove || signal.suggestedMove.impact > bestMove.impact)) {
      bestMove = signal.suggestedMove;
      bestMoveSignal = signal;
    }
  }

  // Fallback if no patterns have suggested moves
  if (!bestMove) {
    bestMove = {
      move: 'Prepare one good question for your next 1:1.',
      reason: 'Intentional questions before team conversations are one of the most consistent differentiators of effective managers.',
      cta: 'Prep with Atreus',
      flow: 'practice',
      atreus: true,
      atreusMsg: "I want to prepare for an upcoming 1:1. Can you help me think through a good coaching question?",
      impact: 30,
    };
  }

  // Build source attribution string
  const sourceLabels = topPatterns
    .filter(s => s.id !== bestMoveSignal?.id)
    .map(s => s.sourceLabel);
  const attributionParts = [bestMoveSignal?.sourceLabel, ...sourceLabels].filter(Boolean);
  const sourceAttribution = attributionParts.length > 0
    ? `from ${attributionParts.join(' + ')}`
    : '';

  return {
    topPatterns,
    bestMove: {
      move: bestMove.move,
      reason: bestMove.reason,
      cta: bestMove.cta,
      flow: bestMove.flow,
      atreus: bestMove.atreus,
      atreusMsg: bestMove.atreusMsg,
      link: bestMove.link,
      sourcePatternIds: topPatterns.map(s => s.id),
      sourceAttribution,
    },
    connectedSources,
    simulatedSources,
  };
}