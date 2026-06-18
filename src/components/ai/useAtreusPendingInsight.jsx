/**
 * useAtreusPendingInsight — Subscribes to AtreusPendingInsight in real-time.
 *
 * When the orchestrator creates a pending insight for this user, this hook
 * detects it, surfaces it via callback, and marks it consumed.
 *
 * Usage:
 *   const { pendingInsight, dismiss } = useAtreusPendingInsight(user?.email, onInsightReady);
 *
 * onInsightReady(insight) is called with the insight object when one arrives.
 * The caller can auto-open Atreus with insight.message as the starter message.
 */
import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";

export function useAtreusPendingInsight(userEmail, onInsightReady) {
  const [pendingInsight, setPendingInsight] = useState(null);
  const consumingRef = useRef(false);

  // On mount: check for any unconsumed, non-expired insights
  useEffect(() => {
    if (!userEmail) return;

    const checkExisting = async () => {
      try {
        const rows = await base44.entities.AtreusPendingInsight.filter(
          { user_email: userEmail, consumed: false },
          '-created_date',
          1
        );
        if (rows.length > 0) {
          const insight = rows[0];
          // Check not expired
          if (insight.expires_at && new Date(insight.expires_at) < new Date()) return;
          setPendingInsight(insight);
          onInsightReady?.(insight);
        }
      } catch { /* silent */ }
    };

    checkExisting();
  }, [userEmail]);

  // Real-time subscription
  useEffect(() => {
    if (!userEmail) return;

    const unsubscribe = base44.entities.AtreusPendingInsight.subscribe(async (event) => {
      if (event.type !== 'create') return;
      const insight = event.data;
      if (insight?.user_email !== userEmail) return;
      if (insight?.consumed) return;
      if (insight?.expires_at && new Date(insight.expires_at) < new Date()) return;

      setPendingInsight(insight);
      onInsightReady?.(insight);
    });

    return unsubscribe;
  }, [userEmail]);

  const dismiss = async (insightId) => {
    if (consumingRef.current) return;
    consumingRef.current = true;
    setPendingInsight(null);
    try {
      await base44.entities.AtreusPendingInsight.update(insightId, {
        consumed: true,
        consumed_at: new Date().toISOString(),
      });
    } catch { /* silent */ } finally {
      consumingRef.current = false;
    }
  };

  return { pendingInsight, dismiss };
}