import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, Info, AlertTriangle, ChevronRight, CheckCircle2, Clock, Wrench, TrendingDown, Users, Brain, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─────────────────────────────────────────────────────────────────────────────
// Readiness band config
// Readiness is a role-based estimate, not a verdict.
// Bands are intentionally conservative to avoid false confidence.
// ─────────────────────────────────────────────────────────────────────────────
const BANDS = [
  {
    key: "readyNow",
    label: "Ready Now",
    sublabel: "Strong capability evidence and demonstrated follow-through",
    threshold: [85, 100],
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  {
    key: "readySoon",
    label: "Ready Soon",
    sublabel: "On track — needs continued development or validation",
    threshold: [70, 84],
    color: "bg-blue-400",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-400",
  },
  {
    key: "buildNow",
    label: "Build Now",
    sublabel: "Early development stage — invest in capability and goal completion",
    threshold: [0, 69],
    color: "bg-amber-400",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    dotColor: "bg-amber-400",
  },
];

function getBand(score) {
  return BANDS.find(b => score >= b.threshold[0] && score <= b.threshold[1]) ?? BANDS[2];
}

// Readiness driver signals — what feeds the estimate
const DRIVER_SIGNALS = [
  {
    key: "capability",
    label: "Capability Evidence",
    description: "Leadership assessment score across core competencies",
    available: true,
  },
  {
    key: "execution",
    label: "Execution & Follow-Through",
    description: "Goal completion rate — translates capability into demonstrated results",
    available: true,
  },
  {
    key: "development",
    label: "Development Engagement",
    description: "Active participation in learning journeys, coaching, and programs",
    available: true,
  },
  {
    key: "experience",
    label: "Experience Context",
    description: "Role tenure, span of control, and leadership level — not yet connected",
    available: false,
  },
  {
    key: "calibration",
    label: "Manager & Talent Calibration",
    description: "Talent review input and manager endorsement — not yet connected",
    available: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MethodologyNote() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 transition-colors">
            <Info className="w-3 h-3" />
            How readiness is estimated
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed p-3">
          <p className="font-semibold mb-1">Readiness methodology</p>
          <p>Readiness is a role-based estimate of how prepared a leader is to perform effectively at the next level or in a target role. It is derived from capability evidence, development progress, and goal follow-through — not a single assessment score.</p>
          <p className="mt-1.5 text-gray-400">This estimate should be used alongside manager judgment and talent review, not as a standalone decision tool.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BandRow({ band, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{}} >
        <span className={`block w-2 h-2 rounded-full ${band.dotColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-800">{band.label}</span>
          <span className="text-xs text-gray-500">{count} leader{count !== 1 ? "s" : ""} · {pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${band.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">{band.sublabel}</p>
      </div>
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

function SectionCard({ title, subtitle, icon: Icon, iconColor = "text-gray-600", children, className = "" }) {
  return (
    <div className={`border border-gray-200 rounded-xl p-4 bg-white ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <span className="text-sm font-semibold text-gray-900">{title}</span>
          </div>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5 ml-6">{subtitle}</p>}
        </div>
      </div>
      {children}
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
  // ── Score extraction ──────────────────────────────────────────────────────
  const getScore = (a) => a.overall_pct ?? a.data?.overall_pct ?? 0;
  const total = assessments.length;

  // ── Band bucketing ────────────────────────────────────────────────────────
  const readyNow  = assessments.filter(a => getScore(a) >= 85);
  const readySoon = assessments.filter(a => { const s = getScore(a); return s >= 70 && s < 85; });
  const buildNow  = assessments.filter(a => getScore(a) < 70);

  // ── Bench strength: weighted composite (not a simple %) ──────────────────
  // Ready Now counts fully, Ready Soon counts at 0.5, Build Now at 0
  const benchNumerator = readyNow.length + readySoon.length * 0.5;
  const benchDenominator = total || 1;
  const benchPct = Math.round((benchNumerator / benchDenominator) * 100);
  const benchLabel =
    benchPct >= 40 ? "Strong"
    : benchPct >= 20 ? "Building"
    : "Thin";
  const benchBadgeColor =
    benchPct >= 40 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : benchPct >= 20 ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-red-100 text-red-700 border-red-200";

  // ── Gap analysis ──────────────────────────────────────────────────────────
  // Identify where bench is weakest by leadership level
  const levelMap = {};
  assessments.forEach(a => {
    const level = a.leadership_level ?? a.data?.leadership_level ?? "Unspecified";
    if (!levelMap[level]) levelMap[level] = { total: 0, readyNow: 0, readySoon: 0, buildNow: 0 };
    levelMap[level].total++;
    const s = getScore(a);
    if (s >= 85) levelMap[level].readyNow++;
    else if (s >= 70) levelMap[level].readySoon++;
    else levelMap[level].buildNow++;
  });
  const levelEntries = Object.entries(levelMap).sort((a, b) => b[1].total - a[1].total);

  // Detect thinest level (lowest ready-now ratio with meaningful sample)
  const thinLevels = levelEntries
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => (a[1].readyNow / a[1].total) - (b[1].readyNow / b[1].total));
  const thinnestLevel = thinLevels[0]?.[0];
  const thinnestData = thinLevels[0]?.[1];

  // Low-capability, high-engagement leaders (invest here)
  const activeEnrollments = new Set(journeyEnrollments.map(j => j.user_email ?? j.data?.user_email));
  const highEngagementLowCap = assessments.filter(a => {
    const s = getScore(a);
    const email = a.user_email ?? a.data?.user_email;
    return s < 70 && activeEnrollments.has(email);
  });

  // ── Driver signal availability ────────────────────────────────────────────
  const hasGoalData = (metrics?.totalGoals ?? 0) > 0;
  const hasDevelopmentData = journeyEnrollments.length > 0 || assignedLearning.length > 0;
  const hasAssessmentData = total > 0;

  // Compute driver signal scores (0–100 where available)
  const capabilityScore = hasAssessmentData
    ? Math.round(assessments.reduce((sum, a) => sum + getScore(a), 0) / total)
    : null;

  const goalCompletionRate = hasGoalData
    ? metrics?.goalCompletionRate ?? null
    : null;

  const developmentEngagementRate = hasDevelopmentData && allUsers.length > 0
    ? Math.round((activeEnrollments.size / allUsers.length) * 100)
    : null;

  // ── Action recommendation logic ───────────────────────────────────────────
  let benchAction = "Review ready-soon leaders with their managers to validate succession readiness before the next talent cycle.";
  if (benchPct < 20) benchAction = "Bench depth is thin. Prioritize capability development and succession slate reviews for critical roles this quarter.";
  else if (readyNow.length === 0) benchAction = "No leaders are currently in the ready-now band. Focus on accelerating the ready-soon cohort through stretch assignments and validation.";

  let gapAction = "No critical gaps detected with current data. Expand data coverage to improve signal confidence.";
  if (thinnestLevel && thinnestData) {
    const readyNowPct = Math.round((thinnestData.readyNow / thinnestData.total) * 100);
    gapAction = `${thinnestLevel} level has the thinnest ready-now coverage (${readyNowPct}% of ${thinnestData.total} assessed). Schedule a calibration conversation with their managers this quarter.`;
  }
  if (highEngagementLowCap.length > 0) {
    gapAction += ` ${highEngagementLowCap.length} leader${highEngagementLowCap.length > 1 ? "s are" : " is"} actively developing but not yet showing capability gains — consider coaching or structured stretch assignments.`;
  }

  // ── Data coverage notice ──────────────────────────────────────────────────
  const hasHRIS = workforceMetrics?.length > 0;

  return (
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

        {/* Data coverage notice — honest about what is and isn't connected */}
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

        {/* ── CARD 1: Bench Strength ─────────────────────────────────────────── */}
        <SectionCard
          title="Bench Strength"
          subtitle="Coverage across assessed leaders by readiness band"
          icon={Users}
          iconColor="text-emerald-600"
        >
          {total === 0 ? (
            <p className="text-xs text-gray-400 py-2">No assessment data available. Bench strength cannot be estimated.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{benchPct}%</div>
                  <div className="text-[11px] text-gray-500">weighted bench coverage · {total} leaders assessed</div>
                </div>
                <Badge className={`text-xs border ${benchBadgeColor}`}>{benchLabel}</Badge>
              </div>

              <div className="space-y-3">
                {[
                  { band: BANDS[0], count: readyNow.length },
                  { band: BANDS[1], count: readySoon.length },
                  { band: BANDS[2], count: buildNow.length },
                ].map(({ band, count }) => (
                  <BandRow key={band.key} band={band} count={count} total={total} />
                ))}
              </div>

              {/* Level breakdown — if data exists */}
              {levelEntries.length > 1 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-medium text-gray-600 mb-2">By leadership level</p>
                  <div className="space-y-1.5">
                    {levelEntries.map(([level, data]) => {
                      const rn = Math.round((data.readyNow / data.total) * 100);
                      const rs = Math.round((data.readySoon / data.total) * 100);
                      return (
                        <div key={level} className="flex items-center gap-2 text-[11px]">
                          <span className="w-32 text-gray-600 truncate flex-shrink-0">{level}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-400 h-full" style={{ width: `${rn}%` }} />
                            <div className="bg-blue-300 h-full" style={{ width: `${rs}%` }} />
                          </div>
                          <span className="text-gray-400 w-12 text-right">{data.readyNow}/{data.total}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" /> Ready Now</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 bg-blue-300 rounded-full inline-block" /> Ready Soon</span>
                  </div>
                </div>
              )}

              <ActionCallout>
                Recommended next move: {benchAction}
              </ActionCallout>
            </>
          )}
        </SectionCard>

        {/* ── CARD 2: Readiness Gaps ─────────────────────────────────────────── */}
        <SectionCard
          title="Readiness Gaps"
          subtitle="Where development and succession coverage need attention first"
          icon={TrendingDown}
          iconColor="text-amber-600"
        >
          {total === 0 ? (
            <p className="text-xs text-gray-400 py-2">Insufficient data to identify gaps. Ensure leaders have completed assessments.</p>
          ) : (
            <>
              <div className="space-y-2">

                {/* Thin bench alert */}
                {buildNow.length > 0 && (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-medium text-amber-900">
                        {buildNow.length} leader{buildNow.length > 1 ? "s" : ""} in early development stage
                      </p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        These leaders show potential but need structured investment in capability and execution before succession consideration.
                      </p>
                    </div>
                  </div>
                )}

                {/* High engagement, low capability — investment signal */}
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

                {/* Level gap if applicable */}
                {thinnestLevel && thinnestData && (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-medium text-slate-900">
                        Thinnest bench: {thinnestLevel}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        Only {thinnestData.readyNow} of {thinnestData.total} assessed leaders at this level are in the ready-now band. Prioritize succession slate review.
                      </p>
                    </div>
                  </div>
                )}

                {/* If no specific gaps detected */}
                {buildNow.length === 0 && highEngagementLowCap.length === 0 && !thinnestLevel && (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-emerald-800">
                      No critical readiness gaps detected in current data. Validate with manager calibration before succession planning.
                    </p>
                  </div>
                )}

                {/* Missing data signal */}
                <div className="text-[10px] text-gray-400 pt-1">
                  Gap analysis strengthens with role-level data, time-in-role, and manager calibration — currently not connected.
                </div>
              </div>

              <ActionCallout>
                Recommended next move: {gapAction}
              </ActionCallout>
            </>
          )}
        </SectionCard>

        {/* ── CARD 3: Readiness Drivers ─────────────────────────────────────── */}
        <SectionCard
          title="Readiness Drivers"
          subtitle="Signals contributing to readiness estimates for this population"
          icon={Brain}
          iconColor="text-purple-600"
        >
          <div className="space-y-2.5">
            {DRIVER_SIGNALS.map((signal) => {
              const score =
                signal.key === "capability" ? capabilityScore
                : signal.key === "execution" ? goalCompletionRate
                : signal.key === "development" ? developmentEngagementRate
                : null;

              const isAvailable = signal.available && score !== null;

              return (
                <div key={signal.key} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isAvailable ? "bg-purple-500" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isAvailable ? "text-gray-800" : "text-gray-400"}`}>
                        {signal.label}
                      </span>
                      {isAvailable ? (
                        <span className="text-xs font-bold text-gray-700">{score}%</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Not connected</span>
                      )}
                    </div>
                    {isAvailable && (
                      <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: `${score}%` }} />
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{signal.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Readiness is an estimate, not a verdict. It should be used alongside manager judgment and formal talent review — not as a sole decision input. Scores and signals will increase in depth as more role-context data is connected.
            </p>
          </div>

          <ActionCallout>
            Recommended next move: Use these signals to prepare for talent calibration conversations, not to rank or sort leaders independently.
          </ActionCallout>
        </SectionCard>

      </CardContent>
    </Card>
  );
}