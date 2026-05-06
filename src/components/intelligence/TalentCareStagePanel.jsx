import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Shield,
  Mic,
  Brain,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Radio
} from "lucide-react";
import { STAGES } from "./TalentCareLifecycleBar";

// Stage-specific content: risk signals, listening events, protective factors, key metrics
const STAGE_CONTENT = {
  attraction: {
    executiveSummary: "The Attraction stage shapes the talent pool before a hire is made. Leadership brand perception, DEI representation in pipelines, and offer acceptance rates signal whether the organization is competitive for top talent.",
    riskSignals: [
      "High offer decline rate (>20%) signals brand or comp positioning issues",
      "Pipeline diversity gaps below industry benchmarks",
      "Candidate quality scores declining across consecutive quarters",
      "Time-to-fill for critical leadership roles exceeding 60 days"
    ],
    protectiveFactors: [
      "Strong Glassdoor / LinkedIn employer brand score (>4.0)",
      "Employee referral rate above 30% of hires",
      "Clear EVP (Employee Value Proposition) communicated in JDs",
      "Leadership visibility in talent market (speaking, publishing)"
    ],
    listeningEvents: [
      { name: "Candidate Experience Survey", cadence: "Post-offer (accept & decline)", owner: "TA Team" },
      { name: "New Hire Source Tracking", cadence: "Ongoing", owner: "HRIS" },
      { name: "Employer Brand Audit", cadence: "Annual", owner: "HR / Marketing" }
    ],
    leaderMetrics: ["Offer Acceptance Rate", "Pipeline Diversity %", "Time to Fill (Critical Roles)", "Candidate NPS"],
    executiveMetrics: ["Cost per Leadership Hire", "Strategic Role Pipeline Depth", "Brand Competitiveness Index"]
  },
  onboarding: {
    executiveSummary: "Onboarding is the most vulnerable stage for early talent loss. The 90-day window determines whether a leader builds psychological safety, understands organizational context, and forms the critical relationships needed to succeed.",
    riskSignals: [
      "First-year turnover rate above 15% for leadership roles",
      "Low 30/60/90-day check-in scores (below 70%)",
      "Onboarding survey scores below organizational benchmark",
      "Delayed completion of required competency assessments",
      "Absence from leadership development programs in first 90 days"
    ],
    protectiveFactors: [
      "Structured buddy/mentor assignment within week 1",
      "Onboarding journey enrollment within first 2 weeks",
      "Manager 1:1 cadence established by day 7",
      "Role clarity score above 80% at 30-day mark",
      "Completed baseline leadership assessment by day 30"
    ],
    listeningEvents: [
      { name: "30-Day Onboarding Pulse", cadence: "Day 30", owner: "HR / Manager" },
      { name: "90-Day Integration Survey", cadence: "Day 90", owner: "HR" },
      { name: "Manager Onboarding Effectiveness Check", cadence: "Day 60", owner: "HR Admin" }
    ],
    leaderMetrics: ["Onboarding Journey Completion %", "Assessment Completion Rate", "30/60/90 Satisfaction Scores", "Role Clarity Index"],
    executiveMetrics: ["First-Year Attrition Rate", "Ramp-to-Productivity Speed", "Onboarding Program ROI"]
  },
  development: {
    executiveSummary: "Development is where individual capability transforms into organizational capacity. Targeted investment in Decision Making (DM) and Situational Intelligence (SI) directly accelerates Manager Effectiveness, which drives team and business outcomes.",
    riskSignals: [
      "Leadership assessment scores below 60% (at-risk threshold)",
      "Low DM or SI scores relative to peer benchmarks",
      "No active development plan or coaching engagement",
      "Learning completion rate below 50% for assigned resources",
      "Stagnant competency scores across consecutive assessments"
    ],
    protectiveFactors: [
      "Active coaching engagement with measurable goals",
      "High-potential designation with succession planning",
      "Consistent learning journey participation (>75% completion)",
      "Leadership assessment score trend improving quarter-over-quarter",
      "Peer recognition and 360 feedback integration"
    ],
    listeningEvents: [
      { name: "Leadership Assessment (Curiosity Led)", cadence: "Quarterly or program-triggered", owner: "HR / L&D" },
      { name: "Coaching Session Check-In", cadence: "Per session", owner: "Coach" },
      { name: "Mid-Program Pulse Survey", cadence: "Mid-program", owner: "Program Admin" },
      { name: "Annual Development Plan Review", cadence: "Annual", owner: "Manager" }
    ],
    leaderMetrics: ["DM Score %", "SI Score %", "Manager Effectiveness Index", "Learning Completion %", "Assessment Trend"],
    executiveMetrics: ["Org-Wide Capability Score", "High-Potential % of Workforce", "L&D ROI", "Succession Bench Strength"]
  },
  performance: {
    executiveSummary: "Performance is the execution layer of the talent story. It connects leadership capability (measured via assessments) to business outcomes (measured via goals). The correlation between DM/SI scores and goal achievement is the clearest evidence of Manager Effectiveness in action.",
    riskSignals: [
      "Goal completion rate below 60% across a quarter",
      "Overdue goal count increasing month-over-month",
      "Low correlation between leadership score and goal achievement",
      "Absence of OKRs or cascaded organizational goals",
      "High-performing leaders without stretch assignments"
    ],
    protectiveFactors: [
      "Goals linked to organizational strategic priorities",
      "Regular goal review cadence (weekly or bi-weekly)",
      "High-scorers (>85%) matched to critical business initiatives",
      "Manager-to-team goal cascade established",
      "Recognition system tied to goal milestone achievement"
    ],
    listeningEvents: [
      { name: "Quarterly Business Review (Goal Audit)", cadence: "Quarterly", owner: "Business Leaders" },
      { name: "Performance Review / MBO Check-In", cadence: "Semi-annual or annual", owner: "Manager / HR" },
      { name: "Goal Completion Pulse", cadence: "Monthly", owner: "HR Analyst" }
    ],
    leaderMetrics: ["Goal Completion Rate %", "Overdue Goals", "Goal-to-Assessment Correlation", "OKR Progress %"],
    executiveMetrics: ["Org Goal Achievement Rate", "Critical Role Performance Index", "Strategy Execution Score"]
  },
  retention: {
    executiveSummary: "Retention is the outcome of everything that came before. Flight risk is highest where engagement is low, development investment feels invisible, or manager relationships are poor. The Talent Risk formula (Vulnerability × Risk Signals – Protective Factors) is most critical here.",
    riskSignals: [
      "Regrettable turnover rate exceeding 8%",
      "Declining eNPS or engagement index quarter-over-quarter",
      "Absenteeism rate above 3.5%",
      "Stay interview scores below 70%",
      "High performers with no active development plan",
      "Compensation equity concerns surfaced in exit data"
    ],
    protectiveFactors: [
      "Succession coverage above 80% for critical roles",
      "High-potential retention rate above 90%",
      "Strong manager effectiveness scores correlated with team retention",
      "Active career pathing conversations in past 6 months",
      "Engagement index above 75 organization-wide"
    ],
    listeningEvents: [
      { name: "Annual Engagement Survey", cadence: "Annual", owner: "HR / CHRO" },
      { name: "Quarterly Pulse Survey", cadence: "Quarterly", owner: "HR" },
      { name: "Stay Interview", cadence: "Annual or triggered by risk flag", owner: "Manager / HRBP" },
      { name: "eNPS Check", cadence: "Quarterly", owner: "HR Analytics" }
    ],
    leaderMetrics: ["eNPS Score", "Engagement Index", "Absenteeism Rate", "Flight Risk Score", "Regrettable Turnover %"],
    executiveMetrics: ["Overall Retention Rate", "High-Potential Retention %", "Succession Coverage %", "Cost of Turnover"]
  },
  separation: {
    executiveSummary: "Separation is not the end of the talent story—it is critical intelligence for improving every prior stage. Exit data reveals the root causes of talent loss, identifies systemic issues in management, and can be transformed into alumni strategy.",
    riskSignals: [
      "Exit interviews citing manager relationship or development as top reason for leaving",
      "High exit rate among high performers (regrettable loss >30% of exits)",
      "Short tenure patterns (majority leaving within 2 years)",
      "Concentration of exits in specific teams or managers",
      "Critical role vacancies persisting beyond 60 days post-departure"
    ],
    protectiveFactors: [
      "Structured exit interview process capturing theme data",
      "Alumni program to maintain brand ambassadors",
      "Knowledge transfer protocol activated at resignation",
      "Succession plan already in place for departing role",
      "Exit data integrated into HR strategic planning cycle"
    ],
    listeningEvents: [
      { name: "Exit Interview / Survey", cadence: "At separation", owner: "HR / HRBP" },
      { name: "Alumni Check-In", cadence: "6 months post-departure", owner: "TA / HR" },
      { name: "Critical Role Vacancy Review", cadence: "Monthly", owner: "HR / Business Leader" }
    ],
    leaderMetrics: ["Exit Interview Completion Rate", "Top Exit Themes", "Regrettable Loss %", "Critical Vacancy Rate"],
    executiveMetrics: ["Total Separation Cost", "Alumni Rehire Rate", "Exit-to-Succession Coverage Ratio", "Avg Tenure at Exit"]
  }
};

const RISK_COLORS = {
  riskSignals: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", icon: "text-red-500" },
  protectiveFactors: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", icon: "text-emerald-500" },
  listeningEvents: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", icon: "text-blue-500" }
};

function CollapsibleSection({ title, icon: Icon, colorSet, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-lg border ${colorSet.border} ${colorSet.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorSet.icon}`} />
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TalentCareStagePanel({ stageId, metrics, onPromptAtreus }) {
  const stage = STAGES.find(s => s.id === stageId);
  const content = STAGE_CONTENT[stageId];

  if (!stage || !content) return null;

  const Icon = stage.icon;

  return (
    <motion.div
      key={stageId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Stage Header */}
      <div className={`rounded-xl bg-gradient-to-br ${stage.color} p-5 text-white shadow-md`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Lifecycle Stage</span>
            </div>
            <h3 className="text-xl font-bold text-white">{stage.label}</h3>
            <p className="text-sm text-white/85 mt-1 leading-relaxed">{content.executiveSummary}</p>
          </div>
        </div>

        {/* Quick Metric Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {content.leaderMetrics.slice(0, 3).map(m => (
            <span key={m} className="text-xs px-2 py-1 bg-white/20 rounded-full text-white/90 font-medium">{m}</span>
          ))}
          <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/60">+{content.leaderMetrics.length - 3 + content.executiveMetrics.length} more</span>
        </div>
      </div>

      {/* Three-Column Grid: Risk Signals | Protective Factors | Listening Events */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Risk Signals */}
        <CollapsibleSection
          title="Risk Signals"
          icon={AlertTriangle}
          colorSet={RISK_COLORS.riskSignals}
          defaultOpen={true}
        >
          <ul className="space-y-2 mt-1">
            {content.riskSignals.map((signal, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 leading-snug">{signal}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* Protective Factors */}
        <CollapsibleSection
          title="Protective Factors"
          icon={Shield}
          colorSet={RISK_COLORS.protectiveFactors}
          defaultOpen={true}
        >
          <ul className="space-y-2 mt-1">
            {content.protectiveFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-gray-700 leading-snug">{factor}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* Listening Events */}
        <CollapsibleSection
          title="Listening Events"
          icon={Radio}
          colorSet={RISK_COLORS.listeningEvents}
          defaultOpen={true}
        >
          <div className="space-y-3 mt-1">
            {content.listeningEvents.map((event, i) => (
              <div key={i} className="bg-white rounded-lg p-2.5 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Mic className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-800">{event.name}</span>
                </div>
                <div className="text-[10px] text-gray-500 pl-4">{event.cadence} · <span className="text-blue-500">{event.owner}</span></div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      {/* Metrics by Lens */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">Leader-Level Metrics</span>
            <Badge variant="outline" className="text-[10px]">HR / L&D View</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {content.leaderMetrics.map((m, i) => (
              <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-md">{m}</span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-gray-800">Executive Metrics</span>
            <Badge variant="outline" className="text-[10px]">CPO / CHRO View</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {content.executiveMetrics.map((m, i) => (
              <span key={i} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-md">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* AI Prompt CTA */}
      {onPromptAtreus && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={() => onPromptAtreus(`Analyze our organization's ${stage.label} stage risks. Key metrics: Leadership Score ${metrics?.avgLeadershipScore}%, Goal Completion ${metrics?.goalCompletionRate}%, At-Risk Leaders ${metrics?.atRiskLeaders}. What are the top 3 interventions I should prioritize?`)}
          >
            <Brain className="w-3.5 h-3.5" />
            Ask Atreus: {stage.label} Strategy
            <ArrowRight className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={() => onPromptAtreus(`What are the early warning signs we should be monitoring in our ${stage.label} stage? Based on our current data (${metrics?.atRiskLeaders} at-risk leaders, ${metrics?.avgLeadershipScore}% avg score), where should HR focus their listening events?`)}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Surface {stage.label} Risk Signals
          </Button>
        </div>
      )}
    </motion.div>
  );
}