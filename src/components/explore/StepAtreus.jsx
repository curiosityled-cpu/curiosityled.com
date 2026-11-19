import React, { useState } from "react";
import { ArrowRight, Send, Sparkles, Check, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import DemoLeadPage from "@/components/explore/DemoLeadPage";
import { ATREUS, DIMENSIONS } from "@/lib/exploreDemoContent";

const weakestOf = (profile) => {
  if (!profile) return null;
  return Object.keys(DIMENSIONS).sort((a, b) => (profile[a] || 0) - (profile[b] || 0))[0];
};

export default function StepAtreus({ profile, onNext }) {
  const weakest = weakestOf(profile);
  const [open, setOpen] = useState(true);
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
    <DemoLeadPage showContinue={false}>
      {/* Atreus as the floating panel the app uses, over the real Lead page */}
      {open ? (
        <div className="fixed z-40 inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]">
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/40 flex-shrink-0">
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
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
                aria-label="Minimise Atreus"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
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

              {commitment && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
                    This week's commitment
                  </p>
                  <p className="text-[12px] text-foreground leading-relaxed">{commitment}</p>
                  <p className="mt-1.5 text-[10px] text-emerald-700">You'd be asked how it went. That's the mechanism.</p>
                </div>
              )}
            </div>

            <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {ATREUS.prompts.map((p) => {
                const done = used.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => runPrompt(p)}
                    disabled={done}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                      done
                        ? "border-border text-muted-foreground"
                        : "border-gray-300 text-foreground hover:border-[#0202ff] hover:text-[#0202ff]"
                    }`}
                  >
                    {done && <Check className="w-2.5 h-2.5" />}
                    {p.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={sendFreeText} className="flex items-center gap-2 border-t border-border p-3 flex-shrink-0">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type anything — you'll see the scripted answer"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-[#0202ff]"
              />
              <Button
                type="submit"
                size="icon"
                className="text-white flex-shrink-0"
                style={{ backgroundColor: "#0202ff" }}
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>

            <div className="border-t border-border px-3 py-2.5 flex items-center justify-between gap-2 flex-shrink-0">
              <p className="text-[10px] text-muted-foreground">
                {used.length === 0 ? "Pick a prompt to continue" : "Every answer ends in something to do this week"}
              </p>
              <Button
                size="sm"
                onClick={onNext}
                disabled={used.length === 0}
                className="text-white flex-shrink-0"
                style={{ backgroundColor: "#0202ff" }}
              >
                Keep the rhythm
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-40 right-6 bottom-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white"
          style={{ backgroundColor: "#0202ff" }}
          aria-label="Open Atreus"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </DemoLeadPage>
  );
}