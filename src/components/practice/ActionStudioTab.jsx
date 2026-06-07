/**
 * ActionStudioTab — Tab 1: Tactical & In-The-Moment coaching actions.
 * Houses coaching flows, decision journal, and team tools.
 */
import React from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare, CheckCircle2, Lightbulb, FileText,
  Brain, Users, Layers, ChevronRight
} from "lucide-react";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import DecisionJournalOutcomeReview from "@/components/practice/DecisionJournalOutcomeReview";

const FLOW_KEYS = {
  Prepare: 'prepare',
  Debrief: 'debrief',
  'Work through something': 'work_through',
  Reflect: 'reflect',
};

function FlowTile({ icon: Icon, iconBg, iconColor, accentColor, title, subtitle, description, prompt, to, onStartFlow }) {
  const { openWithContext } = useAtreusChat();
  const flowKey = FLOW_KEYS[title];

  const handleClick = () => {
    if (flowKey && onStartFlow) {
      onStartFlow(flowKey);
    } else if (prompt) {
      openWithContext({ context: { pageType: 'practice' }, starterMessage: prompt });
    }
  };

  const content = (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all group cursor-pointer active:scale-[0.99]">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        {subtitle && <p className="text-[10px] font-medium mt-0.5" style={{ color: accentColor }}>{subtitle}</p>}
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </div>
  );

  if (to) return <Link to={to}>{content}</Link>;
  return <button className="w-full text-left" onClick={handleClick}>{content}</button>;
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">{children}</p>;
}

export default function ActionStudioTab({ onStartFlow }) {
  return (
    <div className="space-y-5 pb-6">

      {/* Coaching Flows — Hero 2x2 */}
      <div>
        <SectionLabel>Coaching Flows</SectionLabel>
        <p className="text-xs text-muted-foreground px-1 mb-3 mt-1">Structured, step-by-step sessions to guide you through real moments.</p>
        <div className="grid grid-cols-1 gap-2.5">
          <FlowTile
            icon={MessageSquare}
            iconBg="bg-[#0202ff]/10"
            iconColor="text-[#0202ff]"
            accentColor="#0202ff"
            title="Prepare"
            subtitle="Before the moment"
            description="Get ready for a hard conversation, 1:1, feedback, or stakeholder meeting."
            onStartFlow={onStartFlow}
          />
          <FlowTile
            icon={CheckCircle2}
            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
            iconColor="text-emerald-600"
            accentColor="#059669"
            title="Debrief"
            subtitle="After the moment"
            description="Reflect after a difficult interaction, missed commitment, or important meeting."
            onStartFlow={onStartFlow}
          />
          <FlowTile
            icon={Lightbulb}
            iconBg="bg-amber-50 dark:bg-amber-950/40"
            iconColor="text-amber-600"
            accentColor="#d97706"
            title="Work through something"
            subtitle="When you're stuck"
            description="Feeling stuck, avoiding something, or overwhelmed? Let's name it and find a next step."
            onStartFlow={onStartFlow}
          />
          <FlowTile
            icon={FileText}
            iconBg="bg-violet-50 dark:bg-violet-950/40"
            iconColor="text-violet-600"
            accentColor="#7c3aed"
            title="Reflect"
            subtitle="Weekly or end-of-day"
            description="Weekly reflection, end-of-day debrief, or momentum review."
            onStartFlow={onStartFlow}
          />
        </div>
      </div>

      {/* Decision Center */}
      <div className="space-y-2.5">
        <SectionLabel>Decision Center</SectionLabel>
        <FlowTile
          icon={Brain}
          iconBg="bg-rose-50 dark:bg-rose-950/40"
          iconColor="text-rose-600"
          title="Decision journal"
          description="Capture a high-stakes decision — context, confidence, risks — and review outcomes later."
          to="/decision-journal"
        />
        <DecisionJournalOutcomeReview />
      </div>

      {/* Team Tools */}
      <div className="space-y-2.5">
        <SectionLabel>Team</SectionLabel>
        <FlowTile
          icon={Users}
          iconBg="bg-sky-50 dark:bg-sky-950/40"
          iconColor="text-sky-600"
          title="1:1 prep & notes"
          description="Prepare questions, review commitments, and track conversation notes."
          to="/team"
        />
        <FlowTile
          icon={Layers}
          iconBg="bg-orange-50 dark:bg-orange-950/40"
          iconColor="text-orange-600"
          title="Delegation planner"
          description="Identify what to hand off and how to set your team up for success."
          prompt="I want to think through what I should delegate. Can you help me work through it?"
        />
      </div>

    </div>
  );
}