import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import LeaderDrilldown from "@/components/checkin/insights/LeaderDrilldown";
import QuestionPills from "@/components/checkin/insights/QuestionPills";
import QuestionInsightPanel from "@/components/checkin/insights/QuestionInsightPanel";
import InsightsExportBar from "@/components/checkin/insights/InsightsExportBar";
import { DATE_RANGES, rangeLabel, formatRangeLabel, formatDateShort, defaultCustomRange } from "@/lib/insightsShared";
import { Input } from "@/components/ui/input";
import { buildInsightsCsv } from "@/lib/insightsCsv";
import { downloadInsightsPdf } from "@/lib/insightsPdf";

export default function CheckInInsightsExplorer({ scope = "team", title, subtitle }) {
  const [days, setDays] = useState(90);
  const [customRange, setCustomRange] = useState(null); // { start, end } once both dates are chosen
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [showHistorical, setShowHistorical] = useState(false);
  const [leaderEmail, setLeaderEmail] = useState("");
  const [exportOptions, setExportOptions] = useState({ sessions: true, summary: true });
  const [busy, setBusy] = useState("");
  const initialised = useRef(false);

  // Rolling window in days, or the custom start/end the user picked
  const hasCustomRange = !!(customRange?.start && customRange?.end);
  const requestRange = hasCustomRange
    ? { start_date: customRange.start, end_date: customRange.end }
    : { days };
  const rangeKey = hasCustomRange ? `${customRange.start}|${customRange.end}` : `${days}`;
  const periodLabel = hasCustomRange
    ? formatRangeLabel(customRange.start, customRange.end)
    : rangeLabel(days);

  const { data, isLoading, error } = useQuery({
    queryKey: ["check-in-insights", scope, rangeKey, leaderEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke("getCheckInInsights", {
        scope,
        ...requestRange,
        leader_email: leaderEmail || "",
      });
      return res?.data || res;
    },
    staleTime: 2 * 60 * 1000,
  });

  const catalog = data?.question_catalog || [];
  const insights = data?.insights_by_key || {};
  const leaders = (data?.leaders || []).filter((leader) => !leader.is_self);

  // Group catalog
  const grouped = useMemo(() => {
    const measures = catalog.filter((q) => q.type === "measure");
    const activeCustom = catalog.filter((q) => q.type === "custom" && q.is_active);
    const historical = catalog.filter((q) => q.type === "custom" && !q.is_active);
    return { measures, activeCustom, historical };
  }, [catalog]);

  // Default selection: the first question only
  useEffect(() => {
    if (initialised.current || catalog.length === 0) return;
    const first = grouped.measures[0] || grouped.activeCustom[0];
    initialised.current = true;
    if (first) setSelectedKeys([first.key]);
  }, [catalog, grouped]);

  const visibleQuestions = [
    ...grouped.measures,
    ...grouped.activeCustom,
    ...(showHistorical ? grouped.historical : []),
  ];

  const selectedEntries = selectedKeys
    .map((key) => catalog.find((q) => q.key === key))
    .filter(Boolean);

  const toggleKey = (key) =>
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const heading = title || (scope === "org" ? "Organisation-wide Check-in Intelligence" : "Team Check-in Insights");
  const viewing = data?.viewing_leader;
  const scopeLabel = viewing
    ? viewing.is_self
      ? scope === "org" ? "Whole organisation" : "My team"
      : `${viewing.name} — ${viewing.direct_reports} team · ${viewing.subtree_size} vertical`
    : scope === "org" ? "Whole organisation" : "My team";

  const exportName = `${scope === "org" ? "organisation" : "team"}-check-in-insights${
    leaderEmail ? `-${leaderEmail.split("@")[0]}` : ""
  }-${hasCustomRange ? `${customRange.start}_to_${customRange.end}` : `${days}d`}`;

  const fetchSessions = async () => {
    const res = await base44.functions.invoke("getCheckInInsights", {
      scope,
      ...requestRange,
      leader_email: leaderEmail || "",
      include_raw: true,
      selected_keys: selectedKeys,
    });
    return (res?.data || res)?.sessions || [];
  };

  const saveFile = (content, mimeType, filename) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    if (selectedEntries.length === 0) return;
    setBusy("csv");
    try {
      const sessions = exportOptions.sessions || exportOptions.summary ? await fetchSessions() : [];
      const csv = buildInsightsCsv({
        entries: selectedEntries,
        insightsByKey: insights,
        sessions,
        includeSessions: exportOptions.sessions,
        includeSummary: exportOptions.summary,
        periodLabel,
      });
      saveFile(csv, "text/csv", `${exportName}.csv`);
    } finally {
      setBusy("");
    }
  };

  const handleExportPdf = async () => {
    if (selectedEntries.length === 0) return;
    setBusy("pdf");
    try {
      const sessions = exportOptions.summary ? await fetchSessions() : [];
      downloadInsightsPdf({
        title: heading,
        scopeLabel,
        periodLabel,
        entries: selectedEntries,
        insightsByKey: insights,
        sessions,
        includeSummary: exportOptions.summary,
        dateRange: data?.date_range,
        filename: `${exportName}.pdf`,
      });
    } finally {
      setBusy("");
    }
  };

  const handleOptionChange = (key, value) =>
    setExportOptions((prev) => ({ ...prev, [key]: value }));

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{heading}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {subtitle || (scope === "org"
            ? "Aggregate signals from daily check-ins across all managers. Privacy-safe — no individual attribution."
            : "Insights derived from the actual questions asked in daily check-ins. As questions change, insights update — but historical data is always preserved.")}
        </p>
      </div>

      {/* Date range + drill down */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => {
                setDays(range.days);
                setCustomRange(null);
              }}
              className={`text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
                !hasCustomRange && days === range.days ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={() => setCustomRange(customRange || defaultCustomRange(days))}
            className={`text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
              hasCustomRange ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Custom
          </button>
        </div>
        {customRange && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customRange.start}
              max={customRange.end}
              onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
              className="h-8 text-xs w-[150px]"
            />
            <span className="text-xs text-gray-400">to</span>
            <Input
              type="date"
              value={customRange.end}
              min={customRange.start}
              onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
              className="h-8 text-xs w-[150px]"
            />
          </div>
        )}
        <LeaderDrilldown
          leaders={leaders}
          value={leaderEmail}
          onChange={setLeaderEmail}
          selfLabel={scope === "org" ? "Whole organisation (all)" : "My team (all)"}
        />
      </div>

      {/* Question selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Select questions or measures
            {selectedEntries.length > 0 && (
              <span className="ml-1.5 font-normal normal-case text-gray-400">· {selectedEntries.length} selected</span>
            )}
          </p>
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
        <QuestionPills
          questions={visibleQuestions}
          selectedKeys={selectedKeys}
          onToggle={toggleKey}
        />
      </div>

      {/* Export */}
      <InsightsExportBar
        selectedCount={selectedEntries.length}
        options={exportOptions}
        onOptionChange={handleOptionChange}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        busy={busy}
      />

      {/* Selected questions */}
      {selectedEntries.length === 0 ? (
        <Card className="border border-dashed border-gray-200 rounded-xl">
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-gray-700">No questions selected</p>
            <p className="text-xs text-gray-500 mt-1">Pick one or more measures or questions above to see their insights.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {selectedEntries.map((entry) => (
            <motion.div
              key={entry.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <QuestionInsightPanel entry={entry} insight={insights[entry.key]} />
            </motion.div>
          ))}
        </div>
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
          <span>·</span>
          <span>{scopeLabel}</span>
        </div>
      )}
    </div>
  );
}