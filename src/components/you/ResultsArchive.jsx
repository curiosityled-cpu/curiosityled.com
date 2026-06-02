/**
 * ResultsArchive — Assessment history, development themes, change over time.
 * Brief spec: "Leadership Index result summaries, other assessment outputs, development themes derived from each,
 * change over time view. Feed Grow Active Focus. Feed Patterns interpretation."
 * Lives in You.
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Award, Brain, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const COMPETENCY_LABELS = {
  si_pct: "Situational Intelligence",
  dm_pct: "Decision Making",
  comm_pct: "Communication",
  rm_pct: "Resource Management",
  sm_pct: "Stakeholder Management",
  pm_pct: "Performance Management",
};

function ScoreBadge({ pct }) {
  const color = pct >= 75 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : pct >= 55 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-rose-700 bg-rose-50 border-rose-200";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>{Math.round(pct)}%</span>
  );
}

function BandLabel({ band }) {
  if (!band) return null;
  const colors = {
    Mastery: "bg-emerald-50 text-emerald-700",
    Excellence: "bg-blue-50 text-blue-700",
    Proficiency: "bg-sky-50 text-sky-700",
    Developing: "bg-amber-50 text-amber-700",
    Foundation: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[band] || "bg-gray-100 text-gray-500"}`}>{band}</span>
  );
}

function ChangeIndicator({ current, previous, label }) {
  if (!previous) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 2) return <Minus className="w-3 h-3 text-gray-400 inline ml-1" />;
  return diff > 0
    ? <span className="text-[10px] text-emerald-600 ml-1">+{Math.round(diff)}%</span>
    : <span className="text-[10px] text-rose-500 ml-1">{Math.round(diff)}%</span>;
}

function AssessmentCard({ assessment, previousAssessment, isLatest }) {
  const [expanded, setExpanded] = useState(isLatest);
  const date = new Date(assessment.created_date || assessment.submission_ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const scores = Object.entries(COMPETENCY_LABELS).map(([key, label]) => ({
    key,
    label,
    pct: assessment[key],
    prevPct: previousAssessment?.[key],
  })).filter(s => s.pct != null).sort((a, b) => b.pct - a.pct);

  const topStrengths = scores.slice(0, 2);
  const devAreas = [...scores].sort((a, b) => a.pct - b.pct).slice(0, 2);

  return (
    <div className={`rounded-xl border ${isLatest ? 'border-[#0202ff]/20 bg-gradient-to-br from-[#0202ff]/5 to-white' : 'border-gray-100 bg-gray-50'} overflow-hidden`}>
      {/* Header */}
      <button
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isLatest ? 'bg-[#0202ff]' : 'bg-gray-200'}`}>
          <Award className={`w-4 h-4 ${isLatest ? 'text-white' : 'text-gray-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">Leadership Index</p>
            {isLatest && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#0202ff] text-white">Latest</span>}
            <BandLabel band={assessment.band_overall} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{date} · Overall: {Math.round(assessment.overall_pct || 0)}%</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          {/* Archetype */}
          {assessment.archetype_label && (
            <div className="pt-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Archetype</p>
              <p className="text-sm font-semibold text-gray-800">{assessment.archetype_label}</p>
            </div>
          )}

          {/* Competency scores */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Competency breakdown</p>
            <div className="space-y-1.5">
              {scores.map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <p className="text-xs text-gray-600 flex-1 min-w-0 truncate">{s.label}</p>
                  <div className="flex items-center gap-1">
                    <ScoreBadge pct={s.pct} />
                    <ChangeIndicator current={s.pct} previous={s.prevPct} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Development themes */}
          <div className="pt-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Strengths</p>
              {topStrengths.map(s => (
                <div key={s.key} className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1 mb-1">{s.label}</div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Develop</p>
              {devAreas.map(s => (
                <div key={s.key} className="text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1 mb-1">{s.label}</div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Link to="/AssessmentResults" className="flex-1">
              <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Full report <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
            {isLatest && (
              <Link to="/LeadershipAssessment" className="flex-1">
                <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0202ff] text-xs font-medium text-white hover:bg-[#0101dd] transition-colors">
                  Retake <Brain className="w-3 h-3" />
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OverallTrendView({ assessments }) {
  const [showDetail, setShowDetail] = useState(false);
  if (assessments.length < 2) return null;
  const sorted = [...assessments].sort((a, b) => new Date(a.created_date || a.submission_ts) - new Date(b.created_date || b.submission_ts));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const diff = (last.overall_pct || 0) - (first.overall_pct || 0);

  // Per-competency deltas
  const competencyDeltas = Object.entries(COMPETENCY_LABELS).map(([key, label]) => {
    const firstVal = first[key];
    const lastVal = last[key];
    if (firstVal == null || lastVal == null) return null;
    return { label, delta: Math.round(lastVal - firstVal), first: Math.round(firstVal), last: Math.round(lastVal) };
  }).filter(Boolean).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3.5 text-left"
        onClick={() => setShowDetail(s => !s)}
      >
        <div className="flex-1">
          <p className="text-xs text-gray-500">Change since first assessment · {sorted.length} assessments total</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">
            {Math.round(first.overall_pct || 0)}% → {Math.round(last.overall_pct || 0)}%
            {diff > 0 ? (
              <span className="text-emerald-600 ml-2">↑ +{Math.round(diff)}%</span>
            ) : diff < -1 ? (
              <span className="text-rose-500 ml-2">↓ {Math.round(diff)}%</span>
            ) : (
              <span className="text-gray-400 ml-2">— stable</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {diff > 2 ? <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            : diff < -2 ? <TrendingDown className="w-4 h-4 text-rose-500 flex-shrink-0" />
            : <Minus className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          {showDetail ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </button>

      {showDetail && competencyDeltas.length > 0 && (
        <div className="px-3.5 pb-3.5 space-y-2 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-2">By competency</p>
          {competencyDeltas.map(c => (
            <div key={c.label} className="flex items-center gap-3">
              <p className="text-xs text-gray-600 flex-1 min-w-0 truncate">{c.label}</p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-gray-400">{c.first}%</span>
                <span className="text-[10px] text-gray-400">→</span>
                <span className="text-[10px] font-semibold text-gray-700">{c.last}%</span>
                {c.delta > 1 ? (
                  <span className="text-[10px] font-bold text-emerald-600">+{c.delta}%</span>
                ) : c.delta < -1 ? (
                  <span className="text-[10px] font-bold text-rose-500">{c.delta}%</span>
                ) : (
                  <span className="text-[10px] text-gray-400">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsArchive() {
  const { user } = useAuth();

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['you-assessments-archive', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 10);
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-[#0202ff] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="py-8 px-4 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto">
          <Award className="w-6 h-6 text-purple-400" />
        </div>
        <p className="text-sm font-semibold text-gray-700">No assessments yet</p>
        <p className="text-xs text-gray-500 leading-relaxed">Take the Leadership Index to establish your baseline and unlock personalized development insights.</p>
        <Link to="/LeadershipAssessment">
          <button className="mt-1 text-xs font-medium text-[#0202ff] hover:underline flex items-center gap-1 mx-auto">
            Take the Leadership Index <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
    );
  }

  const sorted = [...assessments].sort((a, b) => new Date(b.created_date || b.submission_ts) - new Date(a.created_date || a.submission_ts));

  return (
    <div className="space-y-3">
      <OverallTrendView assessments={assessments} />
      {sorted.map((a, i) => (
        <AssessmentCard
          key={a.id}
          assessment={a}
          previousAssessment={sorted[i + 1] || null}
          isLatest={i === 0}
        />
      ))}
    </div>
  );
}