import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

/**
 * useCycleRole — derives the current user's role in the succession process.
 *
 * Returns one of: "admin" | "successor" | "calibrator" | "manager" | "observer"
 *
 * This is a UX filter (which stages to show as actionable), NOT a security
 * boundary — the backend RLS and succession functions enforce all access.
 * Role is derived from app role + candidacy/participation data, never from
 * a user-settable field.
 */
export function useCycleRole() {
  const { user, hasPermission } = useAuth();
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const derive = async () => {
      // Admin check — admins drive the full cycle
      try {
        if (hasPermission && hasPermission("succession.cycles.manage")) {
          setRole("admin");
          setLoading(false);
          return;
        }
      } catch {
        /* hasPermission not available, continue */
      }

      // For non-admins, attempt to detect participation
      try {
        const { data } = await base44.functions.invoke("successionListCandidacies", {});
        const candidacies = data?.candidacies || [];
        if (candidacies.length > 0) {
          setRole("successor");
          setLoading(false);
          return;
        }
      } catch {
        /* function may reject for non-participants, fall through */
      }

      // No participation detected — read-only observer
      setRole("observer");
      setLoading(false);
    };

    derive();
  }, [user?.id]);

  return { role, loading };
}