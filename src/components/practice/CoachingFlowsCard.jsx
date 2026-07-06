import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MessageSquare, CheckCircle2, Lightbulb, FileText, ChevronRight, Play, Users } from "lucide-react";

const FLOWS = [
  {
    key: "prepare",
    icon: MessageSquare,
    iconBg: "bg-[#0202ff]/10",
    iconColor: "text-[#0202ff]",
    title: "Prepare",
    subtitle: "Before the moment",
    description: "Get ready for a hard conversation, 1:1, feedback, or stakeholder meeting.",
    longDescription:
      "Walk through what's coming: who's in the room, what you want them to feel, what they're likely worried about, and the exact words you'll open with. Walk out with a clear plan and the confidence to execute it.",
    prompts: ["Difficult conversation", "1:1 meeting", "Feedback delivery", "Stakeholder update"],
  },
  {
    key: "one_on_one",
    icon: Users,
    iconBg: "bg-sky-50 dark:bg-sky-950/40",
    iconColor: "text-sky-600",
    title: "1:1 Prep",
    subtitle: "Before the conversation",
    description: "Prepare questions, check commitments, and set a clear outcome for your next 1:1.",
    longDescription:
      "Walk into your 1:1 with purpose: who it's with, what commitments to follow up on, the one outcome that matters, and the question you most need to ask. Turn a routine check-in into a meaningful conversation.",
    prompts: ["Weekly check-in", "Follow-up on commitments", "Feedback conversation", "Career growth talk"],
  },
  {
    key: "debrief",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600",
    title: "Debrief",
    subtitle: "After the moment",
    description: "Reflect after a difficult interaction, missed commitment, or important meeting.",
    longDescription:
      "What happened, what you noticed in yourself and the other person, what you'd repeat, and what you'd do differently. Turn the experience into a learning before it fades.",
    prompts: ["Difficult conversation", "Missed commitment", "Important meeting", "Team conflict"],
  },
  {
    key: "work_through",
    icon: Lightbulb,
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600",
    title: "Work through something",
    subtitle: "When you're stuck",
    description: "Feeling stuck, avoiding something, or overwhelmed? Let's name it and find a next step.",
    longDescription:
      "Name what's stuck, surface what's underneath it, and choose one concrete next step you can take today. No judgment — just a structured way to get unstuck.",
    prompts: ["I'm avoiding something", "I feel overwhelmed", "I'm stuck on a decision", "I keep procrastinating"],
  },
  {
    key: "reflect",
    icon: FileText,
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
    iconColor: "text-violet-600",
    title: "Reflect",
    subtitle: "Weekly or end-of-day",
    description: "Weekly reflection, end-of-day debrief, or momentum review.",
    longDescription:
      "Zoom out: what moved this week, what drained you, what you're proud of, and what deserves your attention next. Build the habit of deliberate reflection.",
    prompts: ["End-of-day debrief", "Weekly reflection", "Momentum review", "Energy check"],
  },
];

export default function CoachingFlowsCard({ onStartFlow }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-3">
      <div className="px-1 pt-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Coaching Flows</p>
        <p className="text-xs text-muted-foreground mt-0.5">Structured sessions to prepare, debrief, and reflect. Tap any flow to preview it.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
          {FLOWS.map((flow) => {
            const Icon = flow.icon;
            return (
              <button
                key={flow.key}
                onClick={() => setSelected(flow)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors active:bg-muted/60 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${flow.iconBg}`}>
                  <Icon className={`w-4.5 h-4.5 ${flow.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-card-foreground">{flow.title}</p>
                    <span className="text-[10px] font-medium text-muted-foreground">{flow.subtitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{flow.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${selected.iconBg}`}>
                    <selected.icon className={`w-5 h-5 ${selected.iconColor}`} />
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{selected.title}</DialogTitle>
                    <p className="text-[11px] font-medium text-muted-foreground">{selected.subtitle}</p>
                  </div>
                </div>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
                  {selected.longDescription}
                </DialogDescription>
              </DialogHeader>

              <div className="pt-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ways to use this flow</p>
                <div className="flex flex-wrap gap-2">
                  {selected.prompts.map((p) => (
                    <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={() => {
                    const key = selected.key;
                    setSelected(null);
                    onStartFlow?.(key);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#0202ff] hover:bg-[#0101dd] transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start flow
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}