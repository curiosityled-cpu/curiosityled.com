import React, { useEffect, useState } from "react";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Users } from "lucide-react";

const COVERAGE = {
  covered: {
    label: "Covered",
    icon: CheckCircle2,
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  thin: {
    label: "Thin",
    icon: AlertTriangle,
    chip: "bg-amber-50 text-amber-700 border-amber-200",
  },
  gap: {
    label: "Gap",
    icon: ShieldAlert,
    chip: "bg-red-50 text-red-700 border-red-200",
  },
};

/**
 * BenchStrengthView — how much succession bench exists behind each critical
 * role, counted from ratified readiness conclusions only. This is the first
 * question an executive asks, and the one a consulting firm bills to answer.
 */
export default function BenchStrengthView() {
  const { invoke } = useSuccessionApi();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await invoke("successionGetBenchStrength", {
          operation_id: `bench-strength-${Date.now()}`,
        });
        if (!cancelled) setData(res || { rows: [], totals: {} });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoke]);

  if (failed) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-gray-500">
            Bench strength could not be loaded. Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  const totals = data.totals || {};
  const rows = data.rows || [];

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No critical roles designated yet</p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Bench strength is measured per critical role. Designate the critical roles in the Focus
            stage and this view fills in automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Summary label="Critical roles" value={totals.roles ?? 0} />
        <Summary label="Covered" value={totals.covered ?? 0} tone="text-emerald-700" />
        <Summary label="Thin" value={totals.thin ?? 0} tone="text-amber-700" />
        <Summary label="No cover" value={totals.gap ?? 0} tone="text-red-700" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-900">Bench by critical role</CardTitle>
          <p className="text-xs text-gray-500">
            Counts are ratified readiness conclusions only. Proposals that nobody has countersigned do
            not count as bench.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-gray-100">
            {rows.map((row) => {
              const coverage = COVERAGE[row.coverage] || COVERAGE.gap;
              const Icon = coverage.icon;
              return (
                <div
                  key={row.role_id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{row.role_title}</p>
                    <p className="text-xs text-gray-500">
                      {row.pool_size} {row.pool_size === 1 ? "candidate" : "candidates"} identified
                      {row.criticality_level ? ` · ${row.criticality_level}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span title="Ready now">
                      <span className="font-semibold text-gray-900">{row.ready_now}</span> now
                    </span>
                    <span title="Ready with conditions">
                      <span className="font-semibold text-gray-900">{row.ready_with_conditions}</span>{" "}
                      conditional
                    </span>
                    <span title="Emerging">
                      <span className="font-semibold text-gray-900">{row.emerging}</span> emerging
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${coverage.chip}`}
                  >
                    <Icon className="w-3 h-3" />
                    {coverage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value, tone = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}