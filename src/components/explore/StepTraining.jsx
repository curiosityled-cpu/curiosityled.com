import React, { useState } from "react";
import { ArrowRight, ArrowLeft, Check, BookOpen, Award, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRAINING, ONBOARDING } from "@/lib/exploreDemoContent";

export default function StepTraining({ onNext }) {
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState(null);
  const [done, setDone] = useState([]);

  const total = TRAINING.steps.length;
  const finished = done.length === total;
  const step = TRAINING.steps[idx];
  const pct = Math.round((done.length / total) * 100);

  const complete = () => {
    setDone((d) => (d.includes(step.id) ? d : [...d, step.id]));
    setChoice(null);
    if (idx < total - 1) setIdx(idx + 1);
  };

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Practice · {ONBOARDING.title}
          </p>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-1">{TRAINING.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{TRAINING.subtitle}</p>
        </div>
        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
          Sample
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Left — the module itself */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0202ff]" />
              <p className="text-sm font-semibold text-foreground">Module</p>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {TRAINING.minutes} min
              </span>
            </div>

            {!finished ? (
              <div className="px-5 py-5">
                <div className="flex items-center gap-2 mb-4">
                  {TRAINING.steps.map((s, i) => (
                    <span
                      key={s.id}
                      className="h-1.5 flex-1 rounded-full"
                      style={{ backgroundColor: done.includes(s.id) ? "#0202ff" : "#e5e7eb" }}
                    />
                  ))}
                </div>

                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Step {idx + 1} of {total}
                </p>
                <h2 className="text-lg font-bold text-foreground mt-1 leading-snug">{step.title}</h2>
                <div className="mt-2 space-y-2.5">
                  {step.body.map((p, i) => (
                    <p key={i} className="text-[13px] text-muted-foreground leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>

                <div className="mt-4 rounded-xl bg-muted/50 p-4">
                  <p className="text-[13px] font-semibold text-foreground mb-2.5">{step.prompt}</p>
                  <div className="space-y-1.5">
                    {step.options.map((opt) => {
                      const selected = choice === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setChoice(opt)}
                          className={`w-full text-left rounded-lg border px-3 py-2 text-[12px] transition-colors ${
                            selected
                              ? "border-transparent text-white"
                              : "border-border bg-card text-foreground hover:border-gray-300"
                          }`}
                          style={selected ? { backgroundColor: "#0202ff" } : undefined}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {idx > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setIdx((i) => i - 1)}>
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    disabled={!choice}
                    onClick={complete}
                    className="text-white"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    {idx === total - 1 ? "Complete module" : "Save and continue"}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-6">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#10b981" }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </span>
                  <p className="text-sm font-bold text-foreground">Module complete</p>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{TRAINING.completion}</p>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                  <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-[12px] text-foreground">
                    <span className="font-semibold">40 points</span> · recorded against your onboarding journey
                  </p>
                </div>
                <Button onClick={onNext} className="mt-4 text-white" style={{ backgroundColor: "#0202ff" }}>
                  Now show me the org view
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Why this isn't a course catalogue</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              The module came from your own pattern and your onboarding plan — not from a library of 400 titles. What you
              commit to here is what next week's check-in asks about.
            </p>
          </div>
        </div>

        {/* Right — journey progress, as the app shows it */}
        <div className="space-y-4 md:sticky md:top-20 md:self-start">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Your onboarding journey</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{ONBOARDING.subtitle}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#0202ff" }} />
                </div>
                <span className="text-[11px] font-bold text-foreground">{pct}%</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {ONBOARDING.milestones.map((m) => (
                <div key={m.title} className="px-5 py-3 flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${
                      m.status === "done"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : m.status === "due"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {m.status === "done" ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : m.status === "locked" ? (
                      <Lock className="w-2.5 h-2.5" />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[12px] leading-snug ${m.status === "locked" ? "text-muted-foreground" : "text-foreground"}`}>
                      {m.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{m.when}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">This module</p>
            <div className="space-y-1.5">
              {TRAINING.steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                      done.includes(s.id) ? "text-white" : "bg-muted text-muted-foreground"
                    }`}
                    style={done.includes(s.id) ? { backgroundColor: "#10b981" } : undefined}
                  >
                    {done.includes(s.id) ? <Check className="w-2.5 h-2.5" /> : i + 1}
                  </span>
                  <p className="text-[12px] text-foreground leading-snug truncate">{s.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}