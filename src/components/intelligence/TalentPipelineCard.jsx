import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Info, AlertTriangle, CheckCircle2, Clock, TrendingDown, Users, Brain, ArrowRight, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TalentPipelineDrillDown from "./TalentPipelineDrillDown";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const BANDS = [
  {
    key: "readyNow",
    label: "Ready Now",
    sublabel: "Strong capability evidence and demonstrated follow-through",
    threshold: [85, 100],
    color: "bg-emerald-500",
    hoverBg: "hover:bg-emerald-50",
    dotColor: "bg-emerald-500",
  },
  {
    key: "readySoon",
    label: "Ready Soon",
    sublabel: "On track — needs continued development or validation",
    threshold: [70, 84],
    color: "bg-blue-400",
    hoverBg: "hover:bg-blue-50",
    dotColor: "bg-blue-400",
  },
  {
    key: "buildNow",
    label: "Build Now",
    sublabel: "Early development stage — invest in capability and goal completion",
    threshold: [0, 69],
    color: "bg-amber-400",
    hoverBg: "hover:bg-amber-50",
    dotColor: "bg-amber-400",
  },
];

const DRIVER_SIGNALS = [
  {
    key: "capability",
    label: "Capability Evidence",
    description: "Leadership assessment score across core competencies. Derived from the platform's leadership assessment.",
    available: true,
  },
  {
    key: "execution",
    label: "Execution & Follow-Through",
    description: "Goal completion rate — translates capability into demonstrated results. Based on completed goals tracked in the platform.",
    available: true,
  },
  {
    key: "development",
    label: "Development Engagement",
    description: "Active participation in learning journeys, coaching, and programs. Based on journey enrollment data.",
    available: true,
  },
  {
    key: "experience",
    label: "Experience Context",
    description: "Role tenure, span of control, and leadership level. Not yet connected — requires HRIS integration.",
    available: false,
  },
  {
    key: "calibration",
    label: "Manager & Talent Calibration",
    description: "Talent review input and manager endorsement. Not yet connected — requires talent review module.",
    available: false,
  },
];

const LEVEL_OPTIONS = [
  "All Levels",
  "Level 1 (Leading Self)",
  "Level 2 (Leading Others)",
  "Level 3 (Leading Managers)",
  "Level 4 (Leading Functions)",
  "Level 5 (Leading Organizations)",
  "HiPo Individual Contributor",
];

// ─────────────────────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────────────────────
function MethodologyNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Info className="w-3 h-3" />
        How readiness is estimated
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs leading-relaxed">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-900">Readiness methodology</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-base leading-none">×</button>
          </div>
          <p className="text-gray-600 mb-2">
            Readiness is a role-based estimate of how prepared a leader is to perform effectively at the next level or in a target role. It is derived from capability evidence, development progress, and goal follow-through — not a single assessment score.
          </p>
          <p className="text-gray-500">
            This estimate should be used alongside manager judgment and talent review, not as a standalone decision tool. Thresholds and signals will improve as more data is connected.
          </p>
        </div>
      )}
    </div>
  );
}

function ActionCallout({ children }) {
  return (
    <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-3">
      <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
      <p className="text-[11px] text-slate-700 leading-relaxed">{children}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, iconColor = "text-gray-600", children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div
        className={`flex items-start justify-between p-4 pb-3 ${collapsible ? "cursor-pointer select-none hover:bg-gray-50 transition-colors" : ""}`}
        onClick={collapsible ? () => setOpen(v => !v) : undefined}
      >
        <div>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <span className="text-sm font-semibold text-gray-900">{title}</span>
          </div>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5 ml-6">{subtitle}</p>}
        </div>
        {collapsible && (
          open
            ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Clickable band row — shows drill-down affordance
function BandRow({ band, count, total, onClick }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors ${band.hoverBg} group`}
    >
      <span className={`block w-2 h-2 rounded-full flex-shrink-0 ${band.dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-800">{band.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{count} leader{count !== 1 ? "s" : ""} · {pct}%</span>
            <span className="text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors">View →</span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${band.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">{band.sublabel}</p>
      </div>
    </button>
  );
}

// Driver signal row with expandable detail
function DriverRow({ signal, score }) {
  const [expanded, setExpanded] = useState(false);
  const isAvailable = signal.available && score !== null;

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left flex items-start gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors group"
      >
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isAvailable ? "bg-purple-500" : "bg-gray-300"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isAvailable ? "text-gray-800" : "text-gray-400"}`}>
              {signal.label}
            </span>
            <div className="flex items-center gap-2">
              {isAvailable ? (
                <span className="text-xs font-bold text-gray-700">{score}%</span>
              ) : (
                <span className="text-[10px] text-gray-400 italic">Not connected</span>
              )}
              {expanded
                ? <ChevronUp className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                : <ChevronDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
              }
            </div>
          </div>
          {isAvailable && (
            <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${score}%` }} />
            </div>
          )}
        </div>
      </button>
      {expanded && (
        <div className="ml-5 mt-1 mb-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-[11px] text-gray-600 leading-relaxed">{signal.description}</p>
          {!isAvailable && (
            <p className="text-[10px] text-amber-600 mt-1">
              This signal is not yet connected. Readiness estimates will be more reliable once it is available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function TalentPipelineCard({
  metrics,
  assessments = [],
  assignedLearning = [],
  journeyEnrollments = [],
  allUsers = [],
  workforceMetrics = [],
}) {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [showFilters, setShowFilters] = useState(false);

  // ── Drill-down modal state ────────────────────────────────────────────────
  const [drillBand, setDrillBand] = useState(null); // "readyNow" | "readySoon" | "buildNow"

  // ── Filtered assessments ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (levelFilter === "All Levels") return assessments;
    return assessments.filter(a => {
      const level = a.leadership_level ?? a.data?.leadership_level;
      return level === levelFilter;
    });
  }, [assessments, levelFilter]);

  const getScore = (a) => a.overall_pct ?? a.data?.overall_pct ?? 0;
  const total = filtered.length;

  // ── Band bucketing (on filtered set) ─────────────────────────────────────
  const readyNow  = filtered.filter(a => getScore(a) >= 85);
  const readySoon = filtered.filter(a => { const s = getScore(a); return s >= 70 && s < 85; });
  const buildNow  = filtered.filter(a => getScore(a) < 70);

  // ── Bench strength ────────────────────────────────────────────────────────
  const benchNumerator = readyNow.length + readySoon.length * 0.5;
  const benchPct = total > 0 ? Math.round((benchNumerator / total) * 100) : 0;
  const benchLabel = benchPct >= 40 ? "Strong" : benchPct >= 20 ? "Building" : "Thin";
  const benchBadgeColor =
    benchPct >= 40 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : benchPct >= 20 ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-red-100 text-red-700 border-red-200";

  // ── Level breakdown ───────────────────────────────────────────────────────
  const levelMap = useMemo(() => {
    const map = {};
    filtered.forEach(a => {
      const level = a.leadership_level ?? a.data?.leadership_level ?? "Unspecified";
      if (!map[level]) map[level] = { total: 0, readyNow: 0, readySoon: 0, buildNow: 0 };
      map[level].total++;
      const s = getScore(a);
      if (s >= 85) map[level].readyNow++;
      else if (s >= 70) map[level].readySoon++;
      else map[level].buildNow++;
    });
    return map;
  }, [filtered]);
  const levelEntries = Object.entries(levelMap).sort((a, b) => b[1].total - a[1].total);

  // ── Gap analysis ──────────────────────────────────────────────────────────
  const thinLevels = levelEntries
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => (a[1].readyNow / a[1].total) - (b[1].readyNow / b[1].total));
  const thinnestLevel = thinLevels[0]?.[0];
  const thinnestData = thinLevels[0]?.[1];

  const activeEnrollments = useMemo(
    () => new Set(journeyEnrollments.map(j => j.user_email ?? j.data?.user_email)),
    [journeyEnrollments]
  );

  const highEngagementLowCap = filtered.filter(a => {
    const s = getScore(a);
    const email = a.user_email ?? a.data?.user_email;
    return s < 70 && activeEnrollments.has(email);
  });

  // ── Driver signals ────────────────────────────────────────────────────────
  const hasGoalData = (metrics?.totalGoals ?? 0) > 0;
  const hasDevelopmentData = journeyEnrollments.length > 0 || assignedLearning.length > 0;

  const capabilityScore = total > 0
    ? Math.round(filtered.reduce((sum, a) => sum + getScore(a), 0) / total)
    : null;

  const goalCompletionRate = hasGoalData ? (metrics?.goalCompletionRate ?? null) : null;

  const developmentEngagementRate = hasDevelopmentData && allUsers.length > 0
    ? Math.round((activeEnrollments.size / allUsers.length) * 100)
    : null;

  const driverScores = {
    capability: capabilityScore,
    execution: goalCompletionRate,
    development: developmentEngagementRate,
    experience: null,
    calibration: null,
  };

  // ── Action text ───────────────────────────────────────────────────────────
  let benchAction = "Review ready-soon leaders with their managers to validate succession readiness before the next talent cycle.";
  if (benchPct < 20) benchAction = "Bench depth is thin. Prioritize capability development and succession slate reviews for critical roles this quarter.";
  else if (readyNow.length === 0) benchAction = "No leaders are currently in the ready-now band. Focus on accelerating the ready-soon cohort through stretch assignments and validation.";

  let gapAction = "No critical gaps detected with current data. Expand data coverage to improve signal confidence.";
  if (thinnestLevel && thinnestData) {
    const pct = Math.round((thinnestData.readyNow / thinnestData.total) * 100);
    gapAction = `${thinnestLevel} level has the thinnest ready-now coverage (${pct}% of ${thinnestData.total} assessed). Schedule a calibration conversation with their managers this quarter.`;
  }
  if (highEngagementLowCap.length > 0) {
    gapAction += ` ${highEngagementLowCap.length} leader${highEngagementLowCap.length > 1 ? "s are" : " is"} actively developing but not yet showing capability gains — consider coaching or structured stretch.`;
  }

  const hasHRIS = workforceMetrics?.length > 0;

  // ── Drill-down leaders list ───────────────────────────────────────────────
  const drillLeaders = useMemo(() => {
    if (!drillBand) return [];
    if (drillBand === "readyNow") return readyNow;
    if (drillBand === "readySoon") return readySoon;
    return buildNow;
  }, [drillBand, readyNow, readySoon, buildNow]);

  // ── Available levels for filter (from full assessments set) ──────────────
  const availableLevels = useMemo(() => {
    const levels = new Set(assessments.map(a => a.leadership_level ?? a.data?.leadership_level).filter(Boolean));
    return ["All Levels", ...Array.from(levels).sort()];
  }, [assessments]);

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Talent Pipeline, Development &amp; Succession
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Role-based readiness estimates for succession planning and development action
              </p>
            </div>
            <MethodologyNote />
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                showFilters || levelFilter !== "All Levels"
                  ? "bg-purple-50 border-purple-200 text-purple-700"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Filter className="w-3 h-3" />
              {levelFilter === "All Levels" ? "Filter by level" : levelFilter}
            </button>
            {levelFilter !== "All Levels" && (
              <button
                onClick={() => setLevelFilter("All Levels")}
                className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear ×
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-[10px] font-medium text-gray-500 mb-2">Leadership Level</p>
              <div className="flex flex-wrap gap-1.5">
                {availableLevels.map(level => (
                  <button
                    key={level}
                    onClick={() => { setLevelFilter(level); setShowFilters(false); }}
                    className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                      levelFilter === level
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data coverage notice */}
          <div className={`mt-2 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
            hasHRIS
              ? "bg-blue-50 border border-blue-200 text-blue-700"
              : "bg-amber-50 border border-amber-200 text-amber-700"
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {hasHRIS
              ? "Showing platform-native and HRIS-connected data. Readiness estimates will strengthen as more role context data is added."
              : "Readiness estimates are based on platform-native data only (capability, development, goals). Connect HRIS, talent review, and role data to improve signal depth."}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* ── CARD 1: Bench Strength ──────────────────────────────────────── */}
          <SectionCard
            title="Bench Strength"
            subtitle="Coverage across assessed leaders by readiness band — click any band to view leaders"
            icon={Users}
            iconColor="text-emerald-600"
            collapsible
            defaultOpen={true}
          >
            {total === 0 ? (
              <p className="text-xs text-gray-400 py-2">No assessment data available{levelFilter !== "All Levels" ? ` for ${levelFilter}` : ""}. Bench strength cannot be estimated.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{benchPct}%</div>
                    <div className="text-[11px] text-gray-500">
                      weighted bench coverage · {total} leader{total !== 1 ? "s" : ""} assessed
                      {levelFilter !== "All Levels" && <span className="ml-1 text-purple-600">· {levelFilter}</span>}
                    </div>
                  </div>
                  <Badge className={`text-xs border ${benchBadgeColor}`}>{benchLabel}</Badge>
                </div>

                <div className="space-y-1">
                  {[
                    { band: BANDS[0], count: readyNow.length },
                    { band: BANDS[1], count: readySoon.length },
                    { band: BANDS[2], count: buildNow.length },
                  ].map(({ band, count }) => (
                    <BandRow
                      key={band.key}
                      band={band}
                      count={count}
                      total={total}
                      onClick={() => count > 0 && setDrillBand(band.key)}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Click any band to view the leaders in that category.</p>

                {/* Level breakdown */}
                {levelEntries.length > 1 && levelFilter === "All Levels" && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-medium text-gray-600 mb-2">By leadership level</p>
                    <div className="space-y-1.5">
                      {levelEntries.map(([level, data]) => {
                        const rn = Math.round((data.readyNow / data.total) * 100);
                        const rs = Math.round((data.readySoon / data.total) * 100);
                        return (
                          <button
                            key={level}
                            onClick={() => setLevelFilter(level)}
                            className="w-full flex items-center gap-2 text-[11px] rounded px-1 py-0.5 hover:bg-gray-50 transition-colors group"
                          >
                            <span className="w-36 text-gray-600 truncate flex-shrink-0 text-left">{level}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-400 h-full" style={{ width: `${rn}%` }} />
                              <div className="bg-blue-300 h-full" style={{ width: `${rs}%` }} />
                            </div>
                            <span className="text-gray-400 w-12 text-right flex-shrink-0">{data.readyNow}/{data.total}</span>
                            <span className="text-[10px] text-gray-300 group-hover:text-gray-500 flex-shrink-0">Filter →</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" /> Ready Now</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 bg-blue-300 rounded-full inline-block" /> Ready Soon</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Click a level row to filter the full section to that population.</p>
                  </div>
                )}

                <ActionCallout>Recommended next move: {benchAction}</ActionCallout>
              </>
            )}
          </SectionCard>

          {/* ── CARD 2: Readiness Gaps ──────────────────────────────────────── */}
          <SectionCard
            title="Readiness Gaps"
            subtitle="Where development and succession coverage need attention first"
            icon={TrendingDown}
            iconColor="text-amber-600"
            collapsible
            defaultOpen={false}
          >
            {total === 0 ? (
              <p className="text-xs text-gray-400 py-2">Insufficient data to identify gaps. Ensure leaders have completed assessments.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {buildNow.length > 0 && (
                    <button
                      onClick={() => setDrillBand("buildNow")}
                      className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors group"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-amber-900">
                          {buildNow.length} leader{buildNow.length > 1 ? "s" : ""} in early development stage
                        </p>
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          These leaders need structured investment in capability and execution before succession consideration.
                        </p>
                      </div>
                      <span className="text-[10px] text-amber-400 group-hover:text-amber-600 flex-shrink-0 mt-0.5">View →</span>
                    </button>
                  )}

                  {highEngagementLowCap.length > 0 && (
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-medium text-blue-900">
                          {highEngagementLowCap.length} leader{highEngagementLowCap.length > 1 ? "s are" : " is"} actively developing but not yet showing capability gains
                        </p>
                        <p className="text-[10px] text-blue-700 mt-0.5">
                          High engagement with low capability evidence suggests the development approach may need to be revisited. Consider coaching or structured stretch.
                        </p>
                      </div>
                    </div>
                  )}

                  {thinnestLevel && thinnestData && (
                    <button
                      onClick={() => setLevelFilter(thinnestLevel)}
                      className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors group"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-slate-900">Thinnest bench: {thinnestLevel}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          Only {thinnestData.readyNow} of {thinnestData.total} assessed leaders at this level are in the ready-now band.
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-600 flex-shrink-0 mt-0.5">Filter →</span>
                    </button>
                  )}

                  {buildNow.length === 0 && highEngagementLowCap.length === 0 && !thinnestLevel && (
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-emerald-800">
                        No critical readiness gaps detected in current data. Validate with manager calibration before succession planning.
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 pt-1">
                    Gap analysis strengthens with role-level data, time-in-role, and manager calibration — currently not connected.
                  </p>
                </div>

                <ActionCallout>Recommended next move: {gapAction}</ActionCallout>
              </>
            )}
          </SectionCard>

          {/* ── CARD 3: Readiness Drivers ───────────────────────────────────── */}
          <SectionCard
            title="Readiness Drivers"
            subtitle="Signals contributing to readiness estimates — click any driver to see how it is measured"
            icon={Brain}
            iconColor="text-purple-600"
            collapsible
            defaultOpen={false}
          >
            <div className="space-y-1">
              {DRIVER_SIGNALS.map((signal) => (
                <DriverRow
                  key={signal.key}
                  signal={signal}
                  score={driverScores[signal.key]}
                />
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Readiness is an estimate, not a verdict. It should be used alongside manager judgment and formal talent review — not as a sole decision input. Signal depth improves as more data sources are connected.
              </p>
            </div>

            <ActionCallout>
              Recommended next move: Use these signals to prepare for talent calibration conversations, not to rank or sort leaders independently.
            </ActionCallout>
          </SectionCard>

        </CardContent>
      </Card>

      {/* Drill-down modal */}
      <TalentPipelineDrillDown
        open={!!drillBand}
        onClose={() => setDrillBand(null)}
        bandKey={drillBand}
        leaders={drillLeaders}
        activeEnrollments={activeEnrollments}
        allUsers={allUsers}
      />
    </>
  );
}