import React, { useState } from "react";
import { ArrowRight, ChevronLeft, ClipboardList, Flame, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import DemoHero from "@/components/explore/DemoHero";
import ProfileSummary from "@/components/explore/ProfileSummary";
import { LI_ITEMS, SCALE_LABELS, DIMENSIONS } from "@/lib/exploreDemoContent";

const now = new Date();
const HOUR = parseInt(
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(now),
  10
);
const DAY = now.toLocaleDateString("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
});
const GREETING = HOUR < 12 ? "Ready for a morning workout" : HOUR < 17 ? "Ready to practice" : "Time for an evening workout";

const WORKOUTS = [
  { title: "The hard conversation opener", minutes: 5, tone: "bg-rose-50 text-rose-600" },
  { title: "Delegating without dropping it", minutes: 4, tone: "bg-sky-50 text-sky-600" },
  { title: "Naming the pattern out loud", minutes: 3, tone: "bg-amber-50 text-amber-600" },
];

export default function StepLeadership({ onComplete }) {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showProfile, setShowProfile] = useState(false);

  const item = LI_ITEMS[idx];
  const current = answers[item.id];
  const answered = Object.keys(answers).length > 0;

  const scores = LI_ITEMS.reduce((acc, it) => {
    acc[it.dimension] = answers[it.id] || 0;
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <DemoHero variant="practice" greeting={GREETING} day={DAY} firstName="Alex" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left — action zone, like the Practice page */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#0202ff]" />
              <p className="text-sm font-semibold text-foreground">Assessments</p>
            </div>

            {!started && (
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leadership Index</p>
                <h2 className="text-lg font-bold text-foreground mt-1">See where your judgment is strong</h2>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Three statements from the validated item bank. No pass or fail — the point is an honest read you can
                  practise against.
                </p>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 3 minutes
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Sample
                  </span>
                </div>
                <Button
                  onClick={() => setStarted(true)}
                  className="mt-4 text-white"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  Begin assessment
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {started && !showProfile && (
              <div className="px-5 py-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Statement {idx + 1} of {LI_ITEMS.length}
                  </span>
                  <div className="flex gap-1">
                    {LI_ITEMS.map((it) => (
                      <span
                        key={it.id}
                        className="h-1 w-6 rounded-full"
                        style={{ backgroundColor: answers[it.id] ? "#0202ff" : "#e5e7eb" }}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-base font-semibold text-foreground leading-snug mb-5">{item.statement}</p>

                <div className="grid grid-cols-5 gap-1.5">
                  {SCALE_LABELS.map((label, i) => {
                    const value = i + 1;
                    const selected = current === value;
                    return (
                      <button
                        key={label}
                        onClick={() => setAnswers((a) => ({ ...a, [item.id]: value }))}
                        className={`rounded-lg border px-1 py-2.5 text-[10px] font-semibold leading-tight transition-all ${
                          selected
                            ? "text-white border-transparent"
                            : "border-border text-muted-foreground hover:border-gray-300 hover:bg-muted"
                        }`}
                        style={selected ? { backgroundColor: "#0202ff" } : undefined}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {idx > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setIdx((i) => i - 1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    disabled={!current}
                    onClick={() => (idx === LI_ITEMS.length - 1 ? setShowProfile(true) : setIdx((i) => i + 1))}
                    className="text-white"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    {idx === LI_ITEMS.length - 1 ? "See my profile" : "Next"}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {showProfile && (
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leadership Index</p>
                <h2 className="text-lg font-bold text-foreground mt-1">That's your profile — three answers, one honest read.</h2>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  The full index uses a validated item bank across {Object.keys(DIMENSIONS).length}+ dimensions. This is
                  the shape of it, enough to show you what you'd be working from.
                </p>
                <Button
                  onClick={() => onComplete(scores)}
                  className="mt-4 text-white"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  Now get the support for it
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0202ff]" />
              <p className="text-sm font-semibold text-foreground">Coaching flows</p>
            </div>
            <div className="divide-y divide-border">
              {["A conversation I'm dreading", "The feedback I keep postponing"].map((t) => (
                <div key={t} className="px-5 py-3 flex items-center justify-between gap-3">
                  <p className="text-[13px] text-foreground">{t}</p>
                  <span className="text-[11px] font-semibold" style={{ color: "#0202ff" }}>
                    Start
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — context sidebar, like the Practice page */}
        <div className="space-y-4 md:sticky md:top-20 md:self-start">
          {answered || showProfile ? (
            <ProfileSummary scores={scores} compact={!showProfile} />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Development progress</p>
              <p className="text-sm font-semibold text-foreground mt-1">No baseline yet</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Complete the Leadership Index and this fills in — strengths, stretches, and the practice that follows.
              </p>
              <div className="mt-4 space-y-2">
                {Object.keys(DIMENSIONS).map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-24 truncate">{DIMENSIONS[k].label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="px-1 pt-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Daily Gym</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                3–7 min exercises personalised to your active patterns and goals.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card shadow-sm divide-y divide-border overflow-hidden">
              {WORKOUTS.map((w) => (
                <div key={w.title} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${w.tone}`}>
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate">{w.title}</p>
                    <p className="text-[10px] text-muted-foreground">{w.minutes} min</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}