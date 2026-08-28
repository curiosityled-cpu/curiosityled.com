import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BAND_LABELS, TREND_LABELS } from "@/lib/portfolio/managerStatus";

/**
 * Reusable per-manager watchlist — extracted from the Portfolio page so it can
 * render as a drill-down inside the Hub's Portfolio Health view.
 *
 * Props:
 *  - managers: array of manager bundles, each with a `.status` (from deriveManagerStatus)
 *  - interventions: array of HRBPIntervention records (for open-intervention counts)
 *  - filterLabel: optional title for the filtered segment (e.g. "Operations" or "Overload rising")
 *  - onBack: optional callback to return to the aggregate view
 *  - onSelectManager: optional override (defaults to navigating to /manager-detail/:id)
 */
export default function ManagerHealthWatchlist({
  managers,
  interventions = [],
  filterLabel,
  onBack,
  onSelectManager,
}) {
  const navigate = useNavigate();

  const openInterventionsByEmail = useMemo(() => {
    const map = {};
    interventions
      .filter((i) => i.status === "open")
      .forEach((i) => {
        if (!map[i.manager_email]) map[i.manager_email] = 0;
        map[i.manager_email]++;
      });
    return map;
  }, [interventions]);

  const sorted = useMemo(() => {
    const order = { high_priority: 0, watch: 1, stable: 2 };
    return [...managers].sort((a, b) => {
      const d = order[a.status.band] - order[b.status.band];
      if (d !== 0) return d;
      return b.status.score - a.status.score;
    });
  }, [managers]);

  const handleSelect = onSelectManager
    ? onSelectManager
    : (m) =>
        navigate(
          `/manager-detail/${m.user.id || encodeURIComponent(m.user.email)}`,
          { state: { manager: m.user, advisorMode: true, managerBundle: m } }
        );

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700 px-2 -ml-2 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {filterLabel ? filterLabel : "Manager Health Watchlist"}
            </h3>
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {managers.length} manager{managers.length !== 1 ? "s" : ""}
          </span>
        </div>

        {managers.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No managers in this segment.
          </p>
        ) : (
          <div className="space-y-2">
            {sorted.map((m, i) => {
              const band = BAND_LABELS[m.status.band];
              const trend = TREND_LABELS[m.status.trend];
              const openCount = openInterventionsByEmail[m.user.email] || 0;
              return (
                <button
                  key={m.user.id || i}
                  onClick={() => handleSelect(m)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-600">
                      {(m.user.full_name || m.user.email)[0]}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.user.full_name || m.user.email}
                      </p>
                      {m.user.department && (
                        <span className="text-xs text-gray-400 truncate">
                          · {m.user.department}
                        </span>
                      )}
                    </div>
                    {m.status.reasons.length > 0 ? (
                      <p className="text-xs text-gray-500 truncate">
                        {m.status.reasons.map((r) => r.label).join(" · ")}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">No active signals</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-xs font-medium ${trend.color}`}>
                      {trend.icon}
                    </span>
                  </div>

                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${band.bg} ${band.color} flex-shrink-0`}
                  >
                    {band.short}
                  </div>

                  {openCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#0202ff]/10 flex-shrink-0">
                      <span className="text-xs font-medium text-[#0202ff]">
                        {openCount} open
                      </span>
                    </div>
                  )}

                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}