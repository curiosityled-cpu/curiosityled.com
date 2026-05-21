import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Target scores by leadership level (1=Leading Self → 5=Leading Orgs)
const LEVEL_TARGETS = {
  "leading_self":          { si: 60, dm: 60, comm: 60, rm: 55, sm: 55, pm: 60 },
  "leading_others":        { si: 65, dm: 65, comm: 70, rm: 65, sm: 65, pm: 70 },
  "leading_managers":      { si: 70, dm: 70, comm: 75, rm: 70, sm: 70, pm: 75 },
  "leading_functions":     { si: 78, dm: 78, comm: 80, rm: 75, sm: 78, pm: 80 },
  "leading_organizations": { si: 85, dm: 85, comm: 85, rm: 82, sm: 85, pm: 85 },
};

// Fallback default when no level known
const DEFAULT_TARGETS = { si: 70, dm: 70, comm: 75, rm: 70, sm: 70, pm: 75 };

const COMPETENCY_DEFINITIONS = {
  si:   { name: "Situational Intelligence", definition: "Your ability to assess situations, predict outcomes, adapt to context, and calibrate decisions. This drives effectiveness across all leadership behaviors." },
  dm:   { name: "Decision Making",           definition: "Your ability to gather information, analyze options, and make sound choices under pressure and ambiguity." },
  comm: { name: "Communication",             definition: "How effectively you convey information, listen actively, and adapt your message to different audiences and contexts." },
  rm:   { name: "Time/Resource Management",  definition: "Your skill in optimizing time, budget, people, and materials to achieve objectives efficiently and effectively." },
  sm:   { name: "Stakeholder Management",    definition: "Your ability to work effectively with others, facilitate teamwork, and create synergies across diverse groups." },
  pm:   { name: "Performance Management",    definition: "How well you set expectations, monitor progress, provide feedback, and drive results through others." },
};

const SCORE_BAND = (score) => {
  if (score >= 85) return { label: "Exceptional", color: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" };
  if (score >= 75) return { label: "Proficient",  color: "bg-blue-100 text-blue-700",    bar: "bg-blue-500" };
  if (score >= 65) return { label: "Developing",  color: "bg-amber-100 text-amber-700",  bar: "bg-amber-500" };
  return                   { label: "Emerging",   color: "bg-red-100 text-red-700",      bar: "bg-red-500" };
};

const STRENGTHS_MAP = {
  si:   { strength: "Reads complex situations quickly; anticipates second-order effects", dev: "Balance situational awareness with decisiveness to avoid analysis paralysis" },
  dm:   { strength: "Makes data-driven decisions quickly; considers multiple perspectives", dev: "Strengthen risk communication and ensure broader team alignment on decisions" },
  comm: { strength: "Communicates with clarity; adapts tone for different audiences", dev: "May struggle with non-verbal cues or inappropriate channel selection for message" },
  rm:   { strength: "Efficiently allocates resources; anticipates needs; maximizes team productivity", dev: "Build contingency planning skills for unexpected resource constraints" },
  sm:   { strength: "Builds inclusive teams; fosters productive collaboration; leverages diverse perspectives", dev: "Strengthen upward stakeholder navigation and executive presence" },
  pm:   { strength: "Sets clear goals; provides regular constructive feedback; develops team accountability", dev: "Deepen coaching skills to address performance gaps before they escalate" },
};

// Industry benchmarks (Corporate sector, First-Line manager level targets)
const INDUSTRY_BENCHMARKS = { si: 68, dm: 70, comm: 72, rm: 71, sm: 72, pm: 69 };

export default function CompetencyExpandableCard({ fieldKey, score, insight, leadershipLevel }) {
   const [open, setOpen] = useState(false);
   const levelTargets = leadershipLevel ? (LEVEL_TARGETS[leadershipLevel] || DEFAULT_TARGETS) : DEFAULT_TARGETS;
   const target = levelTargets[fieldKey] || 70;
   const benchmark = INDUSTRY_BENCHMARKS[fieldKey] || 70;
   const def  = COMPETENCY_DEFINITIONS[fieldKey] || { name: fieldKey, definition: "" };
   const band = SCORE_BAND(score);
   const maps = STRENGTHS_MAP[fieldKey] || {};
   const gap  = score - target;

  return (
    <div className="border rounded-xl bg-white overflow-hidden transition-shadow hover:shadow-md">
      {/* Header row — always visible */}
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-gray-900">{def.name}</span>
            <Badge className={`text-xs ${band.color}`}>{score}% — {band.label}</Badge>
            <span className="text-xs text-gray-400">Industry Benchmark {benchmark}%</span>
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{def.definition}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-24 hidden sm:block relative">
            <Progress value={score} className="h-2" />
            {/* Industry Benchmark marker on mini bar */}
            <div
              className="absolute top-0 h-full w-0.5 bg-black"
              style={{ left: `${benchmark}%` }}
            />
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-5 pb-5 pt-0 border-t bg-gray-50 space-y-4">
          {/* Score vs Target bar */}
          <div className="pt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Your Score</span>
              <span>Industry Benchmark {benchmark}%</span>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${band.bar}`}
                style={{ width: `${score}%` }}
              />
              {/* Industry Benchmark marker */}
              <div
                className="absolute top-0 h-full bg-black"
                style={{ left: `${benchmark}%`, width: "4px" }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="font-medium text-gray-700">{score}%</span>
              <span className={gap >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                {gap >= 0 ? `+${gap}% above target` : `${Math.abs(gap)}% below target`}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Strengths */}
            {maps.strength && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Your Strengths</span>
                </div>
                <p className="text-sm text-green-700">{maps.strength}</p>
              </div>
            )}
            {/* Development Focus */}
            {maps.dev && (
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Development Focus</span>
                </div>
                <p className="text-sm text-amber-700">{maps.dev}</p>
              </div>
            )}
          </div>

          {/* AI narrative from insight if available */}
          {insight && (
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-800">AI Narrative</span>
              </div>
              <p className="text-sm text-purple-700">{insight}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}