import React from "react";
import { Link } from "react-router-dom";
import { Brain, CheckCircle2, FileText, MessageSquare } from "lucide-react";

const TOOLS = [
  {
    key: "prepare",
    label: "Prepare a conversation",
    hint: "Get ready for a 1:1, feedback or stakeholder meeting.",
    icon: MessageSquare,
    tile: "bg-[#0202ff]/10 text-[#0202ff]",
  },
  {
    key: "debrief",
    label: "Debrief a moment",
    hint: "Turn a difficult interaction into a learning.",
    icon: CheckCircle2,
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    key: "reflect",
    label: "Reflect",
    hint: "Zoom out on the week, your energy and your momentum.",
    icon: FileText,
    tile: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  },
];

/**
 * The quiet four-tile entry point into practice. The first three start the
 * existing coaching flows; the fourth opens the Leadership Support Tool.
 */
export default function PracticeToolsGrid({ onStartFlow }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.key}
            type="button"
            onClick={() => onStartFlow(tool.key)}
            className="group flex flex-col items-start gap-2 rounded-[16px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--pf-soft-border)] hover:shadow-[0_8px_18px_rgba(23,40,50,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)]"
          >
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${tool.tile}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-[var(--pf-text)]">{tool.label}</span>
            <span className="text-[12px] leading-[1.45] text-[var(--pf-muted)]">{tool.hint}</span>
          </button>
        );
      })}

      <Link
        to="/decision-journal"
        className="group flex flex-col items-start gap-2 rounded-[16px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--pf-soft-border)] hover:shadow-[0_8px_18px_rgba(23,40,50,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E1A45E]/15 text-[#B4762E] dark:text-[#E1A45E]">
          <Brain className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold text-[var(--pf-text)]">Leadership tools</span>
        <span className="text-[12px] leading-[1.45] text-[var(--pf-muted)]">
          Think through a high-stakes moment and review it later.
        </span>
      </Link>
    </div>
  );
}