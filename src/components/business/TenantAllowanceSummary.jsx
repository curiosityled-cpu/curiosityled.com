import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Used versus allowed, straight from the tenant's real records. The counting
 * rule is applied server-side; this component only renders its answer.
 */
export default function TenantAllowanceSummary({ clientId }) {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setUsage(null);
    setError(null);
    if (!clientId) return;

    base44.functions
      .invoke("getTenantAllowanceUsage", { clientId })
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) setUsage(res.data);
        else setError(res.data?.error || "Could not load capacity usage");
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || "Could not load capacity usage");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;

  if (error) {
    return <p className="text-xs text-gray-500">{error}</p>;
  }

  if (!usage) {
    return (
      <p className="flex items-center gap-2 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking current usage…
      </p>
    );
  }

  const line = (label, position) => (
    <div>
      <span className="text-gray-500">{label}:</span>{" "}
      <span className={position.over > 0 ? "font-semibold text-red-600" : "font-semibold text-gray-900"}>
        {position.used}
      </span>{" "}
      {position.allowance_set ? (
        <span className="text-gray-500">of {position.allowed} allowed</span>
      ) : (
        <span className="text-amber-700">— allowance not set</span>
      )}
      {position.allowance_set && position.remaining > 0 && (
        <span className="text-gray-400"> · {position.remaining} left</span>
      )}
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 space-y-1 text-sm">
      {line("Managers", usage.managers)}
      {line("Participants", usage.participants)}

      {usage.overage_reason && (
        <p className="flex items-start gap-1.5 text-xs text-red-600 pt-1">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{usage.overage_reason}</span>
        </p>
      )}

      <p className="text-xs text-gray-400 pt-1">
        {usage.counts.users} registered users · {usage.counts.roster_only} frontline-only identities ·{" "}
        {usage.package === "unknown" ? "package not confirmed" : usage.package} · enforcement{" "}
        {usage.enforcement_mode}
      </p>
    </div>
  );
}