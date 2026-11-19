import React, { useState } from "react";
import { ArrowRight, Send, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ATREUS, DIMENSIONS } from "@/lib/exploreDemoContent";

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
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "assistant", text: ATREUS.fallback },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#0202ff" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">Atreus</p>
            <p className="text-[10px] text-gray-500">Scripted for this demo</p>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-[13px] leading-relaxed ${
                  m.role === "user" ? "text-white" : "bg-gray-100 text-gray-800"
                }`}
                style={m.role === "user" ? { backgroundColor: "#0202ff" } : undefined}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {commitment && (
          <div className="mx-4 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
              This week's commitment
            </p>
            <p className="text-[13px] text-gray-800 leading-relaxed">{commitment}</p>
            <p className="mt-1.5 text-[11px] text-emerald-700">
              You'd be asked how it went. That's the whole mechanism.
            </p>
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
                    ? "border-gray-200 text-gray-400"
                    : "border-gray-300 text-gray-700 hover:border-[#0202ff] hover:text-[#0202ff]"
                }`}
              >
                {done && <Check className="w-3 h-3" />}
                {p.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={sendFreeText} className="flex items-center gap-2 border-t border-gray-100 p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type anything — you'll see the scripted answer"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-[#0202ff]"
          />
          <Button type="submit" size="icon" className="text-white" style={{ backgroundColor: "#0202ff" }} aria-label="Send">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {used.length === 0
            ? "Pick one prompt to continue."
            : "Every answer ends in something you can do this week."}
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
  );
}