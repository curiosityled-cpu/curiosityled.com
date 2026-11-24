/**
 * LeadershipToolsCard — the Leadership Tools rail on the Practice canvas.
 * Mirrors the Coaching Flows block: a collapsible header, then one card whose
 * rows each hold a tinted icon tile, a title with its one-line purpose, and a
 * chevron showing the row opens a tool.
 */
import React from "react";
import { Link } from "react-router-dom";
import { Brain, Users, Layers, ChevronRight, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const TOOLS = [
  {
    label: "Leadership Support Tool",
    hint: "Think through a high-stakes moment and review outcomes later.",
    to: "/decision-journal",
    icon: Brain,
    iconBg: "bg-[#FDECEA] dark:bg-[#3A2521]",
    iconColor: "text-[#C0553C] dark:text-[#F0A08C]",
  },
  {
    label: "1:1 prep & notes",
    hint: "Prepare questions, review commitments, track notes.",
    to: "/one-on-ones",
    icon: Users,
    iconBg: "bg-[#E8F4FD] dark:bg-[#1E323B]",
    iconColor: "text-[#3B7890] dark:text-[#8FC4D8]",
  },
  {
    label: "Delegation planner",
    hint: "Identify what to hand off and set your team up to win.",
    to: "/delegation-planner",
    icon: Layers,
    iconBg: "bg-[#FDF1E1] dark:bg-[#3A2E20]",
    iconColor: "text-[#B4762E] dark:text-[#E1A45E]",
  },
];

export default function LeadershipToolsCard() {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-1 pt-1 group text-left">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Leadership Tools
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jump to a structured tool to capture, plan, or review.
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform flex-shrink-0 ml-2" />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors active:bg-muted/60 group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tool.iconBg}`}>
                    <Icon className={`w-4.5 h-4.5 ${tool.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">{tool.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.hint}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}