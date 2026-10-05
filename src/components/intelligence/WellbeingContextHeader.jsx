import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Clock, Database, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * WellbeingContextHeader — provenance bar above the Manager Wellbeing
 * Intelligence panel. Makes response coverage, sample size, data freshness,
 * source, and the minimum-group suppression policy visible so executives
 * can judge whether a shift is meaningful.
 *
 * Props:
 *  - pulseAggregates: the response from getOrgPulseAggregates (or demo data)
 *  - suppressed: whether the data was suppressed for privacy
 *  - onRefresh: refresh handler
 *  - refreshing: loading state
 */
export default function WellbeingContextHeader({ pulseAggregates, suppressed, onRefresh, refreshing }) {
  const meta = pulseAggregates?.meta || {};
  const totalManagers = meta.total_managers || 0;
  const minGroupSize = meta.minimum_group_size || 5;
  const activeEngagers = pulseAggregates?.engagement?.active_engagers || 0;
  const responseRate = totalManagers > 0 ? Math.round((activeEngagers / totalManagers) * 100) : 0;
  const dataFreshness = meta.data_freshness || "Based on ManagerTrends last computed nightly";

  // Confidence: high if response rate >= 60%, moderate if >= 30%, low otherwise
  const confidenceLevel =
    responseRate >= 60 ? { label: "Strong coverage", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    : responseRate >= 30 ? { label: "Moderate coverage", color: "bg-amber-50 text-amber-700 border-amber-200" }
    : responseRate > 0 ? { label: "Low coverage", color: "bg-red-50 text-red-700 border-red-200" }
    : { label: "No coverage", color: "bg-gray-50 text-gray-600 border-gray-200" };

  return (
    <div className="space-y-2">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Manager Wellbeing Intelligence</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Aggregate, anonymised signals from Atreus check-ins — Category B data only. No individual attribution.
          </p>
        </div>
        {onRefresh && (
          <Button
            size="sm"
            variant="ghost"
            className="flex-shrink-0 text-xs text-gray-500 hover:bg-gray-100 h-7"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        )}
      </div>

      {/* Provenance bar */}
      {!suppressed && totalManagers > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <Badge className={`text-[10px] border ${confidenceLevel.color}`}>
            <Users className="w-2.5 h-2.5 mr-1" />
            {totalManagers} managers
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {activeEngagers} active ({responseRate}%)
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Min group: {minGroupSize}
          </Badge>
          <span className="flex items-center gap-1 text-[10px] text-gray-400 ml-auto">
            <Clock className="w-2.5 h-2.5" />
            {dataFreshness}
          </span>
        </div>
      )}

      {/* Privacy boundary */}
      <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
        <Shield className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-emerald-700 leading-relaxed">
          Groups below {minGroupSize} managers are suppressed to prevent identification. Individual check-in
          content, confidence history, identity friction, and reflections are always private.
        </p>
      </div>
    </div>
  );
}