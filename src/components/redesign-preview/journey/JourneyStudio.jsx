import React from "react";
import { Lock } from "lucide-react";
import { SAMPLE } from "../sampleData";

const thick = { border: "3px solid var(--rp-ink)" };

function Tile({ step }) {
  const done = step.state === "done";
  const next = step.state === "next";
  const locked = step.state === "locked";
  return (
    <div
      className="p-3"
      style={{
        ...thick,
        background: locked
          ? "repeating-linear-gradient(45deg, var(--rp-panel) 0 6px, #FFFFFF 6px 12px)"
          : next
          ? "var(--rp-second)"
          : "var(--rp-surface)",
        boxShadow: next ? "5px 5px 0 var(--rp-ink)" : "none",
        opacity: locked ? 0.75 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid h-7 w-7 flex-shrink-0 place-items-center text-[12px] font-black"
          style={{
            background: done ? "var(--rp-accent)" : "var(--rp-surface)",
            color: done ? "var(--rp-accentInk)" : "var(--rp-ink)",
            border: "2px solid var(--rp-ink)",
          }}
        >
          {locked ? <Lock className="h-3.5 w-3.5" /> : step.n}
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.16em]">
          {done ? "Done" : next ? "Up next" : "Locked"}
        </span>
      </div>
      <p className="mt-2 text-[13px] font-black uppercase leading-[1.2] tracking-[-0.01em]">
        {step.title}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--rp-muted)" }}>
        {step.kind}
        {step.meta ? ` · ${step.meta}` : ""}
      </p>
    </div>
  );
}

export default function JourneyStudio() {
  const j = SAMPLE.journeyDetail;
  return (
    <div style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <div className="flex flex-wrap items-stretch gap-4 p-6">
        <div
          className="grid w-[132px] flex-shrink-0 place-items-center p-4"
          style={{ ...thick, background: "var(--rp-second)", boxShadow: "6px 6px 0 var(--rp-ink)" }}
        >
          <p className="text-[40px] font-black leading-none">{j.percent}%</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em]">Complete</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: "var(--rp-accent)" }}>
            Journey · 3 of 8 steps
          </p>
          <h2 className="mt-1 text-[30px] font-black uppercase leading-[0.95] tracking-[-0.02em]">
            {j.title}
          </h2>
          <p className="mt-2 max-w-[52ch] text-[12px] leading-relaxed" style={{ color: "var(--rp-muted)" }}>
            {j.deck}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y-[3px] px-6 py-2" style={{ borderColor: "var(--rp-ink)" }}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">{j.due}</p>
        <button
          className="px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]"
          style={{
            border: "3px solid var(--rp-ink)",
            background: "var(--rp-accent)",
            color: "var(--rp-accentInk)",
            boxShadow: "3px 3px 0 var(--rp-ink)",
          }}
        >
          Continue step 4
        </button>
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2">
        {j.steps.map((step) => (
          <Tile key={step.n} step={step} />
        ))}
      </div>

      <div className="px-6 pb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--rp-muted)" }}>
          Optional missions
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {j.optional.map((mission) => (
            <span
              key={mission}
              className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em]"
              style={{ border: "2px solid var(--rp-ink)", background: "var(--rp-surface)" }}
            >
              {mission}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}