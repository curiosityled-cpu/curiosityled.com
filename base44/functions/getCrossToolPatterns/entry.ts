/**
 * getCrossToolPatterns — Cross-tool pattern aggregation backend.
 *
 * Receives in-app patterns (from the BPO pattern engine, computed on the frontend),
 * fetches external signals from connected connectors (Outlook, Google Calendar,
 * HubSpot), adds simulated demo patterns for unconnected tools (Microsoft Viva,
 * LMS, HRIS, watchdog), applies RLS scoping to external signals, ranks all
 * signals into a Top 3 list, and selects the single best next move.
 *
 * Privacy/RLS: external signals inherit the same role-based scoping as in-app
 * data. A manager only sees external signals about people/data they're already
 * permitted to see in-app. Signals that fail scope checks are dropped.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { aggregateCrossToolSignals } from '../../shared/signalProviders/aggregator.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Receive in-app patterns from the frontend (already computed by BPO engine)
    const body = await req.json().catch(() => ({}));
    const inAppPatterns = body.inAppPatterns || [];

    // Aggregate all signals (in-app + external + simulated)
    const result = await aggregateCrossToolSignals(base44, user, inAppPatterns);

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('[getCrossToolPatterns] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}