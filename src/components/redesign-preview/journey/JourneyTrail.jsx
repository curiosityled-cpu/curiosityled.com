import React from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { SAMPLE } from "../sampleData";
import { labelStyle } from "../directions";

function Stone({ step }) {
  const done = step.state === "done";
  const next = step.state === "next";
  return (
    <span
      className="absolute left-1/2 top-4 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full text-[11px] font-semibold"
      style={{
        background: done ? "var(--rp-accent)" : next ? "var(--rp-surface)" : "var(--rp-panel)",
        color: done ? "var(--rp-accentInk)" : "var(--rp-ink)",
        border: next ? "2px solid var(--rp-accent)" : "2px solid var(--rp-line)",
        boxShadow: next ? "0 0 0 5px var(--rp-second)" : "none",
      }}
    >
      {done ? "✓" : step.state === "locked" ? <Lock className="h-3.5 w-3.5" /> : step.n}
    </span>
  );
}

export default function JourneyTrail() {
  const j = SAMPLE.journeyDetail;
  return (
    <div className="px-7 py-7" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <p className="inline-flex items-center gap-1.5" style={labelStyle}>
        <ArrowLeft className="h-3 w-3" /> My development
      </p>

      <div
        className="mt-3 p-5"
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, var(--rp-second) 100%)",
          border: "1px solid var(--rp-line)",
          borderRadius: "var(--rp-radius)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0 max-w-[52ch]">
            <h2 className="text-[26px] font-semibold leading-tight">{j.title}</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--rp-muted)" }}>
              {j.deck}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[30px] font-semibold leading-none tabular-nums">{j.percent}%</p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--rp-muted)" }}>
              {j.due}
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.7)" }}>
          <div className="h-full rounded-full" style={{ width: `${j.percent}%`, background: "var(--rp-accent)" }} />
        </div>
      </div>

      <div className="relative mt-7">
        <div
          className="absolute bottom-4 left-1/2 top-4 w-0 -translate-x-1/2 border-l-2 border-dashed"
          style={{ borderColor: "var(--rp-line)" }}
        />
        {j.steps.map((step, i) => {
          const left = i % 2 === 0;
          return (
            <div key={step.n} className="relative mb-3.5 flex">
              <Stone step={step} />
              <div
                className={`w-[calc(50%-30px)] p-4 ${left ? "" : "ml-auto"}`}
                style={{
                  background: "var(--rp-surface)",
                  border: "1px solid var(--rp-line)",
                  borderRadius: "var(--rp-radius)",
                  opacity: step.state === "locked" ? 0.62 : 1,
                }}
              >
                <p className="text-[13.5px] font-semibold leading-snug">{step.title}</p>
                <p className="mt-1 text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--rp-muted)" }}>
                  {step.kind}
                  {step.meta ? ` · ${step.meta}` : ""}
                </p>
                {step.state === "next" && (
                  <button
                    className="mt-2.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                    style={{ background: "var(--rp-accent)", color: "var(--rp-accentInk)" }}
                  >
                    Open step
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <p style={labelStyle}>Optional</p>
        {j.optional.map((mission) => (
          <span
            key={mission}
            className="rounded-full px-3 py-1 text-[11px]"
            style={{ background: "var(--rp-surface)", border: "1px solid var(--rp-line)" }}
          >
            {mission}
          </span>
        ))}
      </div>
    </div>
  );
}