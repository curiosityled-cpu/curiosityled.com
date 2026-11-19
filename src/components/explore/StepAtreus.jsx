import React, { useState } from "react";
import { ArrowRight, Send, Sparkles, Check, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import DemoHero from "@/components/explore/DemoHero";
import { ATREUS, DIMENSIONS } from "@/lib/exploreDemoContent";

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

const weakestOf = (profile) => {
  if (!profile) return null;
  return Object.keys(DIMENSIONS).sort((a, b) => (profile[a] || 0) - (profile[b] || 0))[0];
};

export default function StepAtreus({ profile, onNext }) {
  const weakest = weakestOf(profile);
  const [messages, setMessages] = useState(() => [
    { role: "assistant", text: ATREUS.greeting },
    ...(weakest ? [{ role: "assistant", text: ATREUS.leadByDimension[weakest] }] : []),
  ]);
  const [used, setUsed] = useState([]);
  const [commitment, setCommitment] = useState(null);
  const [draft, setDraft] = useState("");

  const runPrompt = (prompt) => {
    if (used.includes(prompt.id)) return;
    setUsed((u) => [...u, prompt.id]);
    setMessages((m) => [
      ...m,
      { role: "user", text: prompt.user },
      ...prompt.turns.map((t) => ({ role: "assistant", text: t })),
    ]);
    setCommitment(prompt.commitment);
  };

  const sendFreeText = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMessages((m) => [...m, { role: "user", text }, { role: "assistant", text: ATREUS.fallback }]);
  };

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <DemoHero variant="lead" greeting={GREETING} day={DAY} firstName="Alex" hour={HOUR} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left — today's rhythm, with Atreus open */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/40">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#0202ff" }}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground leading-tight">Atreus</p>
                <p className="text-[10px] text-muted-foreground">Your leadership coach · scripted for this demo</p>
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-[13px] leading-relaxed ${
                      m.role === "user" ? "text-white" : "bg-muted text-foreground"
                    }`}
                    style={m.role === "user" ? { backgroundColor: "#0202ff" } : undefined}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {commitment && (
              <div className="mx-4 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
                  This week's commitment
                </p>
                <p className="text-[13px] text-foreground leading-relaxed">{commitment}</p>
                <p className="mt-1.5 text-[11px] text-emerald-700">You'd be asked how it went. That's the mechanism.</p>
              </div>
            )}

            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {ATREUS.prompts.map((p) => {
                const done = used.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => runPrompt(p)}
                    disabled={done}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      done
                        ? "border-border text-muted-foreground"
                        : "border-gray-300 text-foreground hover:border-[#0202ff] hover:text-[#0202ff]"
                    }`}
                  >
                    {done && <Check className="w-3 h-3" />}
                    {p.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={sendFreeText} className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type anything — you'll see the scripted answer"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-[#0202ff]"
              />
              <Button type="submit" size="icon" className="text-white" style={{ backgroundColor: "#0202ff" }} aria-label="Send">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {used.length === 0 ? "Pick one prompt to continue." : "Every answer ends in something you can do this week."}
            </p>
            <Button
              onClick={onNext}
              disabled={used.length === 0}
              className="text-white flex-shrink-0"
              style={{ backgroundColor: "#0202ff" }}
            >
              Keep the rhythm
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Right — what the system sees, like the Lead page sidebar */}
        <div className="space-y-4 md:sticky md:top-20 md:self-start">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0202ff]" />
              <p className="text-sm font-semibold text-foreground">Patterns</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Top pattern</p>
              <p className="text-sm font-semibold text-foreground">You carry the hard conversation for 11 days</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                The gap between deciding to raise something and raising it is your widest one. Two of your three
                commitments this month named it.
              </p>
              <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Next move:</span> open the 1:1 you moved twice.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-500" />
              <p className="text-sm font-semibold text-foreground">Your people</p>
            </div>
            <div className="divide-y divide-border">
              {[
                { name: "Priya", note: "Quiet in reviews, strong in delivery", dot: "bg-emerald-500" },
                { name: "Marcus", note: "Stretched — two roles, one headcount", dot: "bg-amber-500" },
                { name: "Dana", note: "Ready for more scope", dot: "bg-emerald-500" },
              ].map((p) => (
                <div key={p.name} className="px-5 py-3 flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.dot}`} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}