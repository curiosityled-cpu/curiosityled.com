import React, { useState } from "react";
import { ArrowRight, Check, Sun, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import DemoHero from "@/components/explore/DemoHero";
import { CHECKIN } from "@/lib/exploreDemoContent";

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
const GREETING = HOUR < 12 ? "Good morning" : HOUR < 17 ? "Good afternoon" : "Good evening";

export default function StepCheckIn({ onNext }) {
  const [values, setValues] = useState(
    CHECKIN.measures.reduce((acc, m) => ({ ...acc, [m.key]: m.start }), {})
  );
  const [anchored, setAnchored] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const ready = CHECKIN.anchored.every((q) => anchored[q.id]);

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <DemoHero variant="lead" greeting={GREETING} day={DAY} firstName="Alex" hour={HOUR} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left — Today's rhythm */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">Morning check-in</p>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Sample
              </span>
            </div>

            {!submitted ? (
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground mb-4">Forty seconds. Five measures, two questions.</p>

                <div className="space-y-5">
                  {CHECKIN.measures.map((m) => (
                    <div key={m.key}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">{m.label}</span>
                        <span className="text-xs font-bold" style={{ color: "#0202ff" }}>
                          {values[m.key]}/5
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={values[m.key]}
                        onChange={(e) => setValues((v) => ({ ...v, [m.key]: Number(e.target.value) }))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: "#0202ff" }}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span>{m.low}</span>
                        <span>{m.high}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-border space-y-4">
                  {CHECKIN.anchored.map((q) => (
                    <div key={q.id}>
                      <p className="text-sm font-semibold text-foreground mb-2">{q.q}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt) => {
                          const selected = anchored[q.id] === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => setAnchored((a) => ({ ...a, [q.id]: opt }))}
                              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                selected
                                  ? "text-white border-transparent"
                                  : "border-border text-muted-foreground hover:border-gray-300"
                              }`}
                              style={selected ? { backgroundColor: "#0202ff" } : undefined}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => setSubmitted(true)}
                  disabled={!ready}
                  className="mt-5 text-white"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  Submit check-in
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            ) : (
              <div className="px-5 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#10b981" }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </span>
                  <p className="text-sm font-bold text-foreground">Check-in logged</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{CHECKIN.followUp}</p>
                <Button
                  onClick={onNext}
                  className="mt-4 text-white"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  Now show me the org view
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#0202ff] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Delivered where you already are</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                The same card arrives in Microsoft Teams or email on your cadence. No new app to remember.
              </p>
            </div>
          </div>
        </div>

        {/* Right — Reflect, like the Lead page sidebar */}
        <div className="space-y-4 md:sticky md:top-20 md:self-start">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-violet-500" />
              <p className="text-sm font-semibold text-foreground">Reflect</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Energy · last 7 days
              </p>
              <div className="flex items-end gap-1.5 h-24">
                {CHECKIN.trend.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${(v / 5) * 100}%`,
                      backgroundColor: i === CHECKIN.trend.length - 1 ? "#0202ff" : "#c7d2fe",
                    }}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                Three down days in a row, all after late meetings. That's the kind of thing a manager can act on.
              </p>
            </div>
            <div className="border-t border-border px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Weekly reflections</p>
                <p className="text-[10px] text-muted-foreground">Charts, narrative, risks, next steps</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Your Big 3</p>
            <div className="space-y-2">
              {["Land the Q3 scope decision", "Fix the Marcus overload", "Open the Priya conversation"].map((t, i) => (
                <div key={t} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] text-muted-foreground">{i + 1}</span>
                  </span>
                  <p className="text-[13px] text-foreground leading-snug">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}