/**
 * useAtreusOrchestrator — Phase 1 + 3 React hook
 *
 * Calls the atreusOrchestrator backend on page load and returns
 * the structured context payload for injection into Atreus.
 *
 * Usage:
 *   const { orchestratorData, loading } = useAtreusOrchestrator({ page: 'today', active_pattern: 'Overload' });
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useAtreusOrchestrator({ page, active_pattern = null, check_in_state = null, pending_decisions = null, decision_context = null, enabled = true }) {
  const [orchestratorData, setOrchestratorData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedForPage = useRef(null);

  // Stable key from check_in_state + decisions + decision_context — prevents re-fetch on object identity changes
  const checkInKey = check_in_state
    ? `${check_in_state.morning_done}:${check_in_state.evening_done}`
    : 'null';
  const decisionsKey = pending_decisions
    ? pending_decisions.map(d => d.id).join(',')
    : 'null';
  const decisionContextKey = decision_context
    ? `${decision_context.mode || 'none'}:${decision_context.decision_text?.substring(0, 20) || 'none'}`
    : 'null';

  useEffect(() => {
    if (!enabled) return;
    // Deduplicate: don't re-fetch if page + pattern + check-in state + decisions + decision context haven't changed
    const key = `${page}:${active_pattern}:${checkInKey}:${decisionsKey}:${decisionContextKey}`;
    if (fetchedForPage.current === key) return;

    let cancelled = false;
    setLoading(true);

    base44.functions.invoke('atreusOrchestrator', {
      trigger_type: 'page_load',
      page_context: {
        page,
        active_pattern,
        check_in_state,
        pending_decisions,
        decision_context,
      },
    })
      .then(res => {
        if (cancelled) return;
        fetchedForPage.current = key;
        setOrchestratorData(res.data || null);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('useAtreusOrchestrator: fetch failed', err?.message);
        setError(err?.message || 'unknown');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, active_pattern, enabled, checkInKey, decisionsKey, decisionContextKey]);

  return { orchestratorData, loading, error };
}