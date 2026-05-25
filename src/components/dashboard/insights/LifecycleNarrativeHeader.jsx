import React from "react";
import { motion } from "framer-motion";
import {
  Telescope, UserPlus, Sparkles, TrendingUp, Repeat2, MoveRight, DoorOpen,
  ArrowUpRight, Star, Info, Search, Ear, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STAGE_CONFIG = {
  attraction: {
    icon: Telescope,
    color: "from-violet-600 to-purple-700",
    label: "Attract & Hire",
    support: "Directional",
    viewMode: "reprioritized",
    headline: "Focus first on: pipeline quality and early leadership signals.",
    subtext: "Signals are directional only — treat as early indicators before full assessment data is available.",
    sectionOrder: "Talent Pipeline → Org Health → Leader Profiles",
    topRisks: "Pipeline thin or unassessed population high.",
    topAction: "Review Talent Pipeline to identify where leadership-ready candidates are thinnest.",
    guidance: {
      lookFor: "Quality of leadership pipeline, early signs of leadership potential",
      lookForAction: { type: "scroll", target: "talent-pipeline", label: "View Pipeline" },
      listenTo: "Candidate feedback, interview insights",
      listenToAction: { type: "atreus", prompt: "What are the key early leadership signals I should be listening to during the Attract & Hire stage? Summarise what candidate feedback and interview insights typically reveal about leadership potential.", label: "Ask Atreus" },
      actOn: "Refine recruitment strategy and early development planning",
      actOnAction: { type: "atreus", prompt: "Based on the Attract & Hire stage, what specific actions should I take to refine our recruitment strategy and begin early development planning for incoming leaders?", label: "Get Actions" },
    },
  },
  onboarding: {
    icon: UserPlus,
    color: "from-blue-600 to-indigo-700",
    label: "Onboarding",
    support: "Directional",
    viewMode: "reprioritized",
    headline: "Focus first on: early support signals for new leaders.",
    subtext: "Data confidence improves as baseline assessments complete — all signals are early and directional.",
    sectionOrder: "Org Health → Leader Profiles → Talent Pipeline",
    topRisks: "Delayed assessment completion, low role clarity scores.",
    topAction: "Identify new leaders without completed baseline assessments and confirm structured onboarding support is in place.",
    guidance: {
      lookFor: "90-day assessment results, early goal alignment",
      lookForAction: { type: "scroll", target: "leader-profiles", label: "View Profiles" },
      listenTo: "New leader feedback, manager check-ins",
      listenToAction: { type: "atreus", prompt: "What should I be listening for during the Onboarding stage? How do I interpret new leader feedback and manager check-in patterns to identify integration risks early?", label: "Ask Atreus" },
      actOn: "Support integration and adjust onboarding support where needed",
      actOnAction: { type: "atreus", prompt: "Based on the Onboarding stage, what are the most important actions to take to support new leader integration and adjust onboarding where gaps exist?", label: "Get Actions" },
    },
  },
  development: {
    icon: Sparkles,
    color: "from-emerald-600 to-teal-700",
    label: "Develop",
    support: "Supported today",
    viewMode: "reprioritized",
    headline: "Focus first on: capability gaps and development follow-through.",
    subtext: "DM and SI have the strongest impact on Manager Effectiveness — prioritise gaps here first.",
    sectionOrder: "Org Health → Leader Profiles → Talent Pipeline",
    topRisks: "Learning velocity low, DM/SI scores below benchmark.",
    topAction: "Identify leaders with lowest DM and SI scores and assign targeted coaching or structured learning.",
    guidance: {
      lookFor: "Competency growth, learning journey progress",
      lookForAction: { type: "scroll", target: "org-health", label: "View Org Health" },
      listenTo: "Coaching feedback, peer input",
      listenToAction: { type: "atreus", prompt: "In the Development stage, what coaching feedback and peer input patterns indicate whether development interventions are working? What signals should I watch for?", label: "Ask Atreus" },
      actOn: "Assign stretch work and targeted coaching",
      actOnAction: { type: "atreus", prompt: "Based on the Development stage, what specific development actions should I prioritise? Focus on assigning stretch work and targeted coaching for leaders with DM and SI gaps.", label: "Get Actions" },
    },
  },
  performance: {
    icon: TrendingUp,
    color: "from-amber-600 to-orange-700",
    label: "Perform",
    support: "Supported today",
    viewMode: "reprioritized",
    headline: "Focus first on: capability and execution patterns.",
    subtext: "Use the Capability vs. Execution Matrix to distinguish who needs unblocking from who needs capability investment.",
    sectionOrder: "Org Health → Capability Matrix → Leader Profiles",
    topRisks: "Goal completion rate below 60%, capability-execution gap visible in matrix.",
    topAction: "Use the Capability vs. Execution Matrix to prioritise coaching conversations this cycle.",
    guidance: {
      lookFor: "Goal achievement, manager effectiveness patterns",
      lookForAction: { type: "scroll", target: "org-health", label: "View Org Health" },
      listenTo: "Review data, team feedback",
      listenToAction: { type: "atreus", prompt: "In the Perform stage, what should I listen for in review data and team feedback? How do I identify whether underperformance is a capability gap or an execution/blockers issue?", label: "Ask Atreus" },
      actOn: "Address performance gaps and reinforce strong execution",
      actOnAction: { type: "atreus", prompt: "Based on the Perform stage, what actions should I take to address performance gaps and reinforce strong execution? Use the capability vs. execution lens to guide priorities.", label: "Get Actions" },
    },
  },
  transition: {
    icon: Repeat2,
    color: "from-purple-600 to-indigo-700",
    label: "Mobility & Succession",
    support: "Directional",
    viewMode: "reprioritized",
    headline: "Focus first on: bench strength and readiness depth for critical roles.",
    subtext: "Talent Pipeline surfaces readiness bands — use Leader Profiles to review individuals before finalising succession slates.",
    sectionOrder: "Talent Pipeline → Leader Profiles → Org Health",
    topRisks: "Thin bench, succession slates not validated against assessment data.",
    topAction: "Validate succession slates against Talent Pipeline readiness bands — prioritise ready-now and ready-soon leaders.",
    guidance: {
      lookFor: "Readiness depth, succession pipeline gaps",
      lookForAction: { type: "scroll", target: "talent-pipeline", label: "View Pipeline" },
      listenTo: "Readiness assessments, career aspirations",
      listenToAction: { type: "atreus", prompt: "In the Mobility & Succession stage, how should I interpret readiness assessment data and career aspiration signals? What patterns indicate a leader is truly succession-ready?", label: "Ask Atreus" },
      actOn: "Validate successors and plan next moves",
      actOnAction: { type: "atreus", prompt: "Based on the Mobility & Succession stage, what specific actions should I take to validate succession slates and plan next moves for ready-now and ready-soon leaders?", label: "Get Actions" },
    },
  },
  retention: {
    icon: MoveRight,
    color: "from-rose-600 to-pink-700",
    label: "Retain",
    support: "Directional",
    viewMode: "reprioritized",
    headline: "Focus first on: workforce and engagement risk patterns.",
    subtext: "Compare workforce stability patterns alongside leadership signals — treat as directional given data maturity.",
    sectionOrder: "Workforce Stability → Engagement & Culture → Leader Profiles",
    topRisks: "Declining engagement, at-risk leaders with no active development plan.",
    topAction: "Cross-reference Workforce Stability metrics with Leader Profiles to identify at-risk leaders who may lack development investment.",
    guidance: {
      lookFor: "Flight-risk signals, engagement patterns",
      lookForAction: { type: "scroll", target: "leader-profiles", label: "View Profiles" },
      listenTo: "Stay interviews, team sentiment",
      listenToAction: { type: "atreus", prompt: "In the Retain stage, what should I listen for in stay interviews and team sentiment data? What signals distinguish a recoverable retention risk from an imminent departure?", label: "Ask Atreus" },
      actOn: "Address retention drivers and reinforce support",
      actOnAction: { type: "atreus", prompt: "Based on the Retain stage, what actions should I take to address retention drivers and reinforce support for at-risk leaders? Focus on high-impact, near-term interventions.", label: "Get Actions" },
    },
  },
  separation: {
    icon: DoorOpen,
    color: "from-slate-500 to-gray-700",
    label: "Separation",
    support: "Coming soon",
    viewMode: "reprioritized",
    headline: "Focus first on: continuity risk and leadership handoff.",
    subtext: "Exit intelligence for this stage is not yet supported by enough connected data or product capability.",
    sectionOrder: "Standard order maintained",
    topRisks: "Succession gaps where exits may create capability or continuity risk.",
    topAction: "Use the Retain stage view to identify at-risk leaders before separation occurs.",
    guidance: {
      lookFor: "Continuity risk, leadership exit patterns",
      lookForAction: null,
      listenTo: "Transition feedback, handoff context",
      listenToAction: null,
      actOn: "Secure succession coverage and knowledge transfer",
      actOnAction: null,
    },
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

// View-mode label for Filtered vs Prioritized
const VIEW_MODE_LABEL = {
  reprioritized: { label: "Prioritized for this stage", style: "bg-white/15 text-white/90 border-white/20" },
  filtered:      { label: "Filtered to stage cohort",   style: "bg-white/15 text-white/90 border-white/20" },
};

export default function LifecycleNarrativeHeader({ stageId, mobilityChip, metrics, onPromptAtreus, onScrollTo }) {
  const config = STAGE_CONFIG[stageId];
  if (!config) return null;

  const Icon = config.icon;
  const chipContext = mobilityChip ? MOBILITY_CHIP_CONTEXT[mobilityChip] : null;
  const viewMode = VIEW_MODE_LABEL[config.viewMode] || VIEW_MODE_LABEL.reprioritized;

  const handleGuidanceAction = (action) => {
    if (!action) return;
    if (action.type === "scroll" && onScrollTo) {
      onScrollTo(action.target);
    } else if (action.type === "atreus" && onPromptAtreus) {
      onPromptAtreus(action.prompt);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl bg-gradient-to-r ${config.color} text-white shadow-md overflow-hidden`}
    >
      <div className="px-5 py-4">
        {/* Top row: stage identity + badges */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Lifecycle Stage</span>
              <Badge className={`text-[10px] border ${SUPPORT_STYLE[config.support]} shrink-0`}>
                {config.support}
              </Badge>
              <Badge className={`text-[10px] border shrink-0 ${viewMode.style}`}>
                {viewMode.label}
              </Badge>
            </div>

            <h3 className="text-base font-bold text-white">{config.label}</h3>
            <p className="text-sm text-white/90 mt-0.5 leading-relaxed">{config.headline}</p>
            <p className="text-xs text-white/65 mt-0.5 leading-relaxed">{config.subtext}</p>

            {/* Mobility chip context */}
            {chipContext && (
              <div className="mt-2 flex items-start gap-1.5 bg-white/10 rounded-lg px-2.5 py-2">
                <Info className="w-3 h-3 text-white/70 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white/90 leading-relaxed">{chipContext}</p>
              </div>
            )}
          </div>
        </div>

        {/* Compact guidance cluster: Look for / Listen to / Act on */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { icon: Search, label: "Look for", text: config.guidance.lookFor, action: config.guidance.lookForAction },
            { icon: Ear,    label: "Listen to", text: config.guidance.listenTo, action: config.guidance.listenToAction },
            { icon: Zap,    label: "Act on",    text: config.guidance.actOn,    action: config.guidance.actOnAction },
          ].map(({ icon: ItemIcon, label, text, action }) => (
            <div key={label} className="flex items-start gap-2 bg-white/10 rounded-lg px-3 py-2.5">
              <ItemIcon className="w-3.5 h-3.5 text-white/70 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-xs text-white/90 leading-snug">{text}</p>
                {action && (
                  <button
                    onClick={() => handleGuidanceAction(action)}
                    className="mt-1.5 text-[10px] font-semibold text-white/70 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    {action.label} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom strip: priority order + Atreus CTA */}
        <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-white/65">
            <span>Priority order: <strong className="text-white/85">{config.sectionOrder}</strong></span>
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