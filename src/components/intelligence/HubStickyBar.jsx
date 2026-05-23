import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Database, RefreshCw } from "lucide-react";
import { format } from "date-fns";

/**
 * Sticky context bar for the Leadership Intelligence Hub.
 * Keeps filter state + data confidence + last refresh always visible.
 */
export default function HubStickyBar({ filters, onFilterChange, dataConfidence, lastRefreshed, onRefresh, refreshing }) {
  const confidenceColor =
    dataConfidence >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    dataConfidence >= 50 ? "bg-amber-100 text-amber-700 border-amber-200" :
    "bg-red-100 text-red-700 border-red-200";

  const confidenceLabel =
    dataConfidence >= 80 ? "Decision-ready" :
    dataConfidence >= 50 ? "Directional only" :
    "Partial data";

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Filters */}
        <Select value={filters.timeframe} onValueChange={(v) => onFilterChange("timeframe", v)}>
          <SelectTrigger className="h-8 text-xs w-36 bg-gray-50 border-gray-200">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.division} onValueChange={(v) => onFilterChange("division", v)}>
          <SelectTrigger className="h-8 text-xs w-36 bg-gray-50 border-gray-200">
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.level} onValueChange={(v) => onFilterChange("level", v)}>
          <SelectTrigger className="h-8 text-xs w-36 bg-gray-50 border-gray-200">
            <SelectValue placeholder="Leadership level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="manager">Managers</SelectItem>
            <SelectItem value="director">Directors</SelectItem>
            <SelectItem value="vp">VPs</SelectItem>
            <SelectItem value="c-suite">C-Suite</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.tenure} onValueChange={(v) => onFilterChange("tenure", v)}>
          <SelectTrigger className="h-8 text-xs w-32 bg-gray-50 border-gray-200">
            <SelectValue placeholder="Tenure" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenure</SelectItem>
            <SelectItem value="<1">Under 1 Year</SelectItem>
            <SelectItem value="1-2">1–2 Years</SelectItem>
            <SelectItem value="3-5">3–5 Years</SelectItem>
            <SelectItem value="6-10">6–10 Years</SelectItem>
            <SelectItem value="20+">20+ Years</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.riskProfile} onValueChange={(v) => onFilterChange("riskProfile", v)}>
          <SelectTrigger className="h-8 text-xs w-36 bg-gray-50 border-gray-200">
            <SelectValue placeholder="Risk profile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Profiles</SelectItem>
            <SelectItem value="at_risk">At-Risk Only</SelectItem>
            <SelectItem value="high_potential">High-Potential Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Confidence badge */}
        <Badge className={`text-[11px] border ${confidenceColor} gap-1`}>
          <Database className="w-3 h-3" />
          {confidenceLabel} · {dataConfidence}%
        </Badge>

        {/* Last refresh */}
        {lastRefreshed && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Clock className="w-3 h-3" />
            {format(lastRefreshed, "h:mm a")}
          </span>
        )}

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}