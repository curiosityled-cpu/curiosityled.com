import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, TrendingUp, TrendingDown, Minus, BarChart3, Download,
  Sparkles, ListChecks, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

const DATE_RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "All time" },
];

const TREND_META = {
  improving: { label: "Improving", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  stable: { label: "Stable", icon: Minus, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
  declining: { label: "Declining", icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  insufficient_data: { label: "Insufficient data", icon: AlertCircle, color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200" },
};

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TrendBadge({ direction }) {
  const meta = TREND_META[direction] || TREND_META.insufficient_data;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function DistributionRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-28 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{count} ({pct}%)</span>
    </div>
  );
}

export default function CheckInInsightsExplorer({ scope = "team", title, subtitle }) {
  const [days, setDays] = useState(90);
  const [selectedKey, setSelectedKey] = useState(null);
  const [showHistorical, setShowHistorical] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["check-in-insights", scope, days],
    queryFn: async () => {
      const res = await base44.functions.invoke("getCheckInInsights", { scope, days });
      return res?.data || res;
    },
    staleTime: 2 * 60 * 1000,
  });

  const catalog = data?.question_catalog || [];
  const insights = data?.insights_by_key || {};

  // Group catalog
  const grouped = useMemo(() => {
    const measures = catalog.filter((q) => q.type === "measure");
    const activeCustom = catalog.filter((q) => q.type === "custom" && q.is_active);
    const historical = catalog.filter((q) => q.type === "custom" && !q.is_active);
    return { measures, activeCustom, historical };
  }, [catalog]);

  // Auto-select first active question
  React.useEffect(() => {
    if (!selectedKey && catalog.length > 0) {
      const first = grouped.measures[0] || grouped.activeCustom[0];
      if (first) setSelectedKey(first.key);
    }
  }, [catalog, selectedKey, grouped]);

  const selectedEntry = catalog.find((q) => q.key === selectedKey);
  const selectedInsights = selectedKey ? insights[selectedKey] : null;

  const handleExport = () => {
    if (!selectedEntry || !selectedInsights) return;
    const rows = [["date", "value", "count"]];
    for (const t of selectedInsights.trend || []) {
      rows.push([t.date, t.value, t.count]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `check-in-insights-${selectedEntry.key}-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-100 bg-red-50 rounded-xl">
        <CardContent className="p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-700">Failed to load insights: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (data?.suppressed) {
    return (
      <Card className="border border-amber-100 bg-amber-50 rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Data suppressed for privacy</p>
              <p className="text-xs text-amber-700 mt-1">{data.reason}</p>
              <p className="text-xs text-amber-600 mt-1">Currently: {data.total_managers} managers. Minimum required: {data.minimum_required}.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (catalog.length === 0) {
    return (
      <Card className="border border-dashed border-gray-200 rounded-xl">
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">No check-in data yet</p>
          <p className="text-xs text-gray-500 mt-1">Insights will appear once your team starts completing check-ins.</p>
        </CardContent>
      </Card>
    );
  }

  const visibleQuestions = [
    ...grouped.measures,
    ...grouped.activeCustom,
    ...(showHistorical ? grouped.historical : []),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          {title || (scope === "org" ? "Organisation-wide Check-in Intelligence" : "Team Check-in Insights")}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {subtitle || (scope === "org"
            ? "Aggregate signals from daily check-ins across all managers. Privacy-safe — no individual attribution."
            : "Insights derived from the actual questions asked in daily check-ins. As questions change, insights update — but historical data is always preserved.")}
        </p>
      </div>

      {/* Date range pills */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {DATE_RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
              days === r.days ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Question selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Select a question or measure</p>
          {grouped.historical.length > 0 && (
            <button
              onClick={() => setShowHistorical(!showHistorical)}
              className="text-[11px] text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
            >
              {showHistorical ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showHistorical ? "Hide" : "Show"} historical ({grouped.historical.length})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {visibleQuestions.map((q) => {
            const selected = selectedKey === q.key;
            const hasData = q.response_count > 0;
            return (
              <button
                key={q.key}
                onClick={() => setSelectedKey(q.key)}
                disabled={!hasData && q.type === "custom" && !q.is_active}
                className={`text-xs font-medium py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 ${
                  selected
                    ? "bg-[#0202ff] text-white border-[#0202ff]"
                    : hasData
                    ? "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    : "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
                }`}
              >
                {q.emoji && <span>{q.emoji}</span>}
                {!q.is_active && q.type === "custom" && <ListChecks className="w-3 h-3" />}
                {q.is_ai_generated && <Sparkles className="w-3 h-3" />}
                <span className="max-w-[160px] truncate">{q.label}</span>
                {hasData && (
                  <span className={`text-[10px] ${selected ? "text-white/70" : "text-gray-400"}`}>
                    {q.response_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected question insights */}
      {selectedEntry && selectedInsights && (
        <motion.div key={selectedKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <Card className="border border-gray-100 shadow-sm rounded-xl">
            <CardContent className="p-5 space-y-4">
              {/* Question header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedEntry.emoji ? `${selectedEntry.emoji} ` : ""}{selectedEntry.label}
                    </p>
                    {selectedEntry.type === "measure" && (
                      <Badge variant="outline" className="text-[10px]">Measure</Badge>
                    )}
                    {selectedEntry.is_ic_fixed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        <ListChecks className="w-2.5 h-2.5" /> Fixed
                      </span>
                    )}
                    {selectedEntry.is_ai_generated && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0202ff] bg-[#0202ff]/10 border border-[#0202ff]/20 rounded px-1.5 py-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> AI daily
                      </span>
                    )}
                    {!selectedEntry.is_active && selectedEntry.type === "custom" && (
                      <Badge variant="outline" className="text-[10px] text-gray-400">Historical</Badge>
                    )}
                  </div>
                  {selectedEntry.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedEntry.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-500 hover:bg-gray-100 h-7 flex-shrink-0"
                  onClick={handleExport}
                  disabled={!selectedInsights.trend || selectedInsights.trend.length === 0}
                >
                  <Download className="w-3 h-3 mr-1" /> Export CSV
                </Button>
              </div>

              {/* Summary stats */}
              <div className="flex flex-wrap items-center gap-4">
                {selectedInsights.avg != null && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                      {selectedInsights.avg_label || (selectedEntry.response_type === "yes_no" ? "Yes rate" : "Average")}
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {selectedInsights.avg}{selectedEntry.response_type === "scale_1_5" || selectedEntry.response_type === "measure" ? "/5" : ""}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Responses</p>
                  <p className="text-xl font-bold text-gray-900">{selectedInsights.response_count}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Trend</p>
                  <div className="mt-0.5">
                    <TrendBadge direction={selectedInsights.trend_direction} />
                  </div>
                </div>
                {selectedEntry.first_seen_date && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Active period</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formatDateShort(selectedEntry.first_seen_date)} — {formatDateShort(selectedEntry.last_seen_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Trend chart */}
              {selectedInsights.trend && selectedInsights.trend.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">
                    {selectedEntry.response_type === "yes_no" ? "Daily % yes" : selectedEntry.response_type === "anchored_choices" ? "Daily response count" : "Daily average"}
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={selectedInsights.trend} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDateShort}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={30}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        domain={selectedEntry.response_type === "yes_no" ? [0, 1] : selectedEntry.response_type === "anchored_choices" ? [0, "auto"] : [0, 5]}
                        tickFormatter={(v) => selectedEntry.response_type === "yes_no" ? `${Math.round(v * 100)}%` : v}
                      />
                      <Tooltip
                        contentStyle={{ border: "none", borderRadius: "10px", fontSize: "12px", boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)" }}
                        labelFormatter={formatDateShort}
                        formatter={(v) => [
                          selectedEntry.response_type === "yes_no" ? `${Math.round(v * 100)}%` : v,
                          selectedEntry.response_type === "anchored_choices" ? "Responses" : "Average",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#0202ff"
                        strokeWidth={2}
                        dot={{ fill: "#0202ff", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No trend data in this period.</p>
              )}

              {/* Distribution */}
              {selectedInsights.distribution && Object.keys(selectedInsights.distribution).length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">Distribution</p>
                  <div className="space-y-1.5">
                    {selectedEntry.response_type === "scale_1_5" || selectedEntry.type === "measure" ? (
                      Object.entries(selectedInsights.distribution).map(([k, count]) => {
                        const colors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981"];
                        const idx = parseInt(k) - 1;
                        return (
                          <DistributionRow
                            key={k}
                            label={["Low", "Below avg", "Okay", "Good", "Strong"][idx] || k}
                            count={count}
                            total={selectedInsights.response_count}
                            color={colors[idx] || "#9ca3af"}
                          />
                        );
                      })
                    ) : selectedEntry.response_type === "yes_no" ? (
                      Object.entries(selectedInsights.distribution).map(([k, count]) => (
                        <DistributionRow
                          key={k}
                          label={k === "yes" ? "Yes" : "No"}
                          count={count}
                          total={selectedInsights.response_count}
                          color={k === "yes" ? "#22c55e" : "#9ca3af"}
                        />
                      ))
                    ) : (
                      Object.entries(selectedInsights.distribution).map(([k, count]) => (
                        <DistributionRow
                          key={k}
                          label={k}
                          count={count}
                          total={selectedInsights.response_count}
                          color="#0202ff"
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Recent text answers */}
              {selectedInsights.recent_answers && selectedInsights.recent_answers.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">Recent responses</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedInsights.recent_answers.map((ans, i) => (
                      <div key={i} className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        {String(ans)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer metadata */}
      {data?.date_range && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 px-1">
          <span>{data.date_range.total_checkins} check-ins</span>
          <span>·</span>
          <span>{data.date_range.unique_respondents} {scope === "org" ? "managers" : "people"}</span>
          {data.date_range.earliest && (
            <>
              <span>·</span>
              <span>{formatDateShort(data.date_range.earliest)} — {formatDateShort(data.date_range.latest)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}