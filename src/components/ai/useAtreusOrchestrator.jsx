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

export function useAtreusOrchestrator({ page, active_pattern = null, check_in_state = null, enabled = true }) {
  const [orchestratorData, setOrchestratorData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedForPage = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    // Deduplicate: don't re-fetch if page + pattern haven't changed
    const key = `${page}:${active_pattern}`;
    if (fetchedForPage.current === key) return;

    let cancelled = false;
    setLoading(true);

    base44.functions.invoke('atreusOrchestrator', {
      trigger_type: 'page_load',
      page_context: {
        page,
        active_pattern,
        check_in_state,
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
  }, [page, active_pattern, enabled]);

  return { orchestratorData, loading, error };
}