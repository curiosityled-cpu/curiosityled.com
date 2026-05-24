import React from "react";
import { motion } from "framer-motion";
import { Telescope, UserPlus, Sparkles, TrendingUp, Repeat2, MoveRight, DoorOpen, ArrowUpRight, Star, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STAGE_CONFIG = {
  attraction: {
    icon: Telescope,
    color: "from-violet-600 to-purple-700",
    label: "Attract & Hire",
    support: "Directional",
    headline: "Early pipeline signals — before assessment data, leadership intelligence is directional only.",
    subtext: "Prioritised below: Talent Pipeline (bench depth), Org Health (early capability indicators). Avoid drawing conclusions from pre-hire or early-stage data.",
    sectionOrder: "Talent Pipeline → Org Health → Leader Profiles",
    topRisks: "Pipeline thin or unassessed population high.",
    topAction: "Ensure new leaders are enrolled in baseline assessment within 30 days.",
  },
  onboarding: {
    icon: UserPlus,
    color: "from-blue-600 to-indigo-700",
    label: "Onboarding",
    support: "Directional",
    headline: "90-day integration — early assessment completion is the primary signal to watch.",
    subtext: "Prioritised below: Org Health (early scores), Leader Profiles (onboarding cohort). Data confidence improves as assessments are completed.",
    sectionOrder: "Org Health → Leader Profiles → Talent Pipeline",
    topRisks: "Delayed assessment completion, low role clarity scores.",
    topAction: "Confirm baseline leadership assessments are scheduled for all leaders in their first 30 days.",
  },
  development: {
    icon: Sparkles,
    color: "from-emerald-600 to-teal-700",
    label: "Develop",
    support: "Supported today",
    headline: "Development stage — capability building is the primary investment. DM and SI are the highest-leverage competencies to move.",
    subtext: "Prioritised below: Org Health (ME Index & Competency Dimensions), Learning Velocity, Leader Profiles. Capability vs. Execution Matrix is visible for practitioner use.",
    sectionOrder: "Org Health → Leader Profiles → Talent Pipeline",
    topRisks: "Learning velocity low, DM/SI scores below benchmark.",
    topAction: "Identify leaders with lowest DM and SI scores and activate coaching engagement or structured learning.",
  },
  performance: {
    icon: TrendingUp,
    color: "from-amber-600 to-orange-700",
    label: "Perform",
    support: "Supported today",
    headline: "Performance stage — execution is the measure. High-capability leaders with unmet goals need unblocking, not more development.",
    subtext: "Prioritised below: Org Health (ME Index), Capability vs. Execution Matrix, Leader Profiles. Use the matrix to distinguish execution gaps from capability gaps.",
    sectionOrder: "Org Health → Capability Matrix → Leader Profiles",
    topRisks: "Goal completion rate below 60%, DM/goal correlation gap.",
    topAction: "Use the Capability vs. Execution Matrix to identify who needs unblocking vs. who needs capability investment.",
  },
  transition: {
    icon: Repeat2,
    color: "from-purple-600 to-indigo-700",
    label: "Mobility & Succession",
    support: "Directional",
    headline: "Succession and mobility — which leaders are ready now, ready soon, or not yet ready for movement.",
    subtext: "Prioritised below: Talent Pipeline (bench coverage & readiness bands), Leader Profiles (sorted by readiness). Workforce Stability signals where relevant.",
    sectionOrder: "Talent Pipeline → Leader Profiles → Org Health",
    topRisks: "Thin bench, succession slates not validated against assessment data.",
    topAction: "Review Talent Pipeline bench coverage and validate succession slates against assessed readiness, not tenure.",
  },
  retention: {
    icon: MoveRight,
    color: "from-rose-600 to-pink-700",
    label: "Retain",
    support: "Directional",
    headline: "Retention signals — flight risk is highest where development investment feels invisible or manager relationships are poor.",
    subtext: "Prioritised below: Workforce Stability, Engagement & Culture (if connected), Leader Profiles for at-risk leaders. Connect HRIS and engagement data to improve signal quality.",
    sectionOrder: "Workforce Stability → Engagement & Culture → Leader Profiles",
    topRisks: "Declining eNPS, at-risk leaders with no active development plan.",
    topAction: "Identify high-potential leaders without active development plans — they are the highest retention risk.",
  },
  separation: {
    icon: DoorOpen,
    color: "from-slate-500 to-gray-700",
    label: "Separation",
    support: "Coming soon",
    headline: "Exit intelligence — this stage is not yet supported by platform data.",
    subtext: "Exit data, alumni strategy, and separation intelligence are planned for a future release. Current hub data remains visible but is not stage-optimised for this view.",
    sectionOrder: "Standard order maintained",
    topRisks: "N/A — stage not yet supported.",
    topAction: "Use Retain stage view to identify at-risk leaders before separation occurs.",
  },
};

const MOBILITY_CHIP_CONTEXT = {
  promotion_ready: "Showing readiness context for Promotion Ready leaders. Talent Pipeline is sorted with Ready Now leaders surfaced first.",
  lateral_move: "Showing internal mobility context. Leader Profiles highlight leaders with strong capability in adjacent competency areas.",
  high_potential: "Highlighting High Potential leaders (85%+ capability score). Talent Pipeline and Leader Profiles are filtered to this cohort.",
};

const SUPPORT_STYLE = {
  "Supported today": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Directional":     "bg-amber-50 text-amber-700 border-amber-200",
  "Coming soon":     "bg-slate-50 text-slate-500 border-slate-200",
};

export default function LifecycleNarrativeHeader({ stageId, mobilityChip, metrics, onPromptAtreus }) {
  const config = STAGE_CONFIG[stageId];
  if (!config) return null;

  const Icon = config.icon;
  const chipContext = mobilityChip ? MOBILITY_CHIP_CONTEXT[mobilityChip] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl bg-gradient-to-r ${config.color} text-white shadow-md overflow-hidden`}
    >
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Lifecycle Stage</span>
              <Badge className={`text-[10px] border ${SUPPORT_STYLE[config.support]} shrink-0`}>
                {config.support}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-white">{config.label}</h3>
            <p className="text-sm text-white/90 mt-1 leading-relaxed">{config.headline}</p>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">{config.subtext}</p>

            {/* Mobility chip context */}
            {chipContext && (
              <div className="mt-2 flex items-start gap-1.5 bg-white/10 rounded-lg px-2.5 py-2">
                <Info className="w-3 h-3 text-white/70 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white/90 leading-relaxed">{chipContext}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom action strip */}
        <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-white/70">
            <span>Priority order: <strong className="text-white/90">{config.sectionOrder}</strong></span>
          </div>
          {onPromptAtreus && config.support !== "Coming soon" && (
            <button
              onClick={() => onPromptAtreus(`I'm focused on the ${config.label} stage. Key signal: ${config.topRisks} Recommended action: ${config.topAction} Current ME Index: ${Math.round((metrics?.competencyAverages?.dm || 0) * 0.35 + (metrics?.competencyAverages?.si || 0) * 0.30 + (metrics?.competencyAverages?.comm || 0) * 0.20 + (metrics?.competencyAverages?.pm || 0) * 0.15)}%. What should I prioritise in this stage?`)}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-md transition-colors font-medium"
            >
              Ask Atreus about {config.label} →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}