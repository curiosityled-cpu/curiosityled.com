/**
 * LeadershipToolsCard — the Leadership Tools rail on the Practice canvas.
 * A collapsible block: header with a one-line purpose, then one card per tool
 * with its own icon tile, a short description of what it is for, and a chevron
 * that shows it opens.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Users, Layers, ChevronRight, ChevronUp } from "lucide-react";

const TOOLS = [
  {
    label: "Leadership Support Tool",
    hint: "Think through a high-stakes moment and review outcomes later.",
    to: "/decision-journal",
    icon: Brain,
    tile: "bg-[#FDECEA] dark:bg-[#3A2521]",
    ink: "text-[#C0553C] dark:text-[#F0A08C]",
  },
  {
    label: "1:1 prep & notes",
    hint: "Prepare questions, review commitments, track notes.",
    to: "/one-on-ones",
    icon: Users,
    tile: "bg-[#E6F2F7] dark:bg-[#1E323B]",
    ink: "text-[#3B7890] dark:text-[#8FC4D8]",
  },
  {
    label: "Delegation planner",
    hint: "Identify what to hand off and set your team up to win.",
    to: "/delegation-planner",
    icon: Layers,
    tile: "bg-[#FDF2E6] dark:bg-[#3A2E20]",
    ink: "text-[#B4762E] dark:text-[#E1A45E]",
  },
];

export default function LeadershipToolsCard() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-[20px] border border-[var(--pf-border)] bg-[var(--pf-panel)] p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 px-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--pf-text)]">
            Leadership Tools
          </p>
          <p className="pt-1 text-[11px] leading-[1.4] text-[var(--pf-muted)]">
            Jump to a structured tool to capture, plan, or review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Hide leadership tools" : "Show leadership tools"}
          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-soft)] hover:text-[var(--pf-text)]"
        >
          <ChevronUp
            className={`h-4 w-4 transition-transform ${expanded ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {expanded && (
        <>
          <div className="my-3 h-px bg-[var(--pf-soft-border)]" />
          <div className="flex flex-col gap-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className="flex items-center gap-3 rounded-[14px] border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] px-3 py-3 transition-[box-shadow,background] duration-200 hover:bg-[var(--pf-soft-hover)] hover:shadow-[0_4px_10px_rgba(23,40,50,0.1)] active:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B7890]"
                >
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] ${tool.tile}`}
                  >
                    <Icon className={`h-[18px] w-[18px] ${tool.ink}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-[1.25] text-[var(--pf-text)]">
                      {tool.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-[1.35] text-[var(--pf-muted)]">
                      {tool.hint}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--pf-muted)]" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}