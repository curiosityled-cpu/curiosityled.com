import React from "react";
import { ArrowLeft } from "lucide-react";
import { SAMPLE } from "../sampleData";
import { labelStyle } from "../directions";

const STATE_WORD = { done: "Done", next: "Next", locked: "Locked" };

export default function JourneyEditorial() {
  const j = SAMPLE.journeyDetail;
  return (
    <div className="px-8 py-7" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <p className="inline-flex items-center gap-1.5" style={labelStyle}>
        <ArrowLeft className="h-3 w-3" /> My development
      </p>

      <h2
        className="mt-4 max-w-[24ch] text-[32px] leading-[1.08] tracking-[-0.01em]"
        style={{ fontFamily: "var(--rp-display)" }}
      >
        {j.title}
      </h2>
      <p className="mt-2 max-w-[58ch] text-[13px] leading-[1.6]" style={{ color: "var(--rp-muted)" }}>
        {j.deck}
      </p>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <div
            className="flex items-baseline justify-between border-b pb-1.5"
            style={{ borderColor: "var(--rp-ink)" }}
          >
            <h3 className="text-[19px]" style={{ fontFamily: "var(--rp-display)" }}>
              Contents
            </h3>
            <span style={labelStyle}>{j.steps.length} steps</span>
          </div>

          {j.steps.map((step) => {
            const done = step.state === "done";
            const next = step.state === "next";
            const locked = step.state === "locked";
            return (
              <div
                key={step.n}
                className="flex items-baseline gap-4 border-b py-2.5"
                style={{ borderColor: "var(--rp-line)", opacity: locked ? 0.5 : 1 }}
              >
                <span
                  className="w-6 flex-shrink-0 text-[13px] tabular-nums"
                  style={{
                    fontFamily: "var(--rp-display)",
                    color: next ? "var(--rp-accent)" : "var(--rp-muted)",
                  }}
                >
                  {String(step.n).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[14px] leading-snug"
                    style={{
                      fontFamily: "var(--rp-display)",
                      textDecoration: done ? "line-through" : "none",
                      color: done ? "var(--rp-muted)" : "var(--rp-ink)",
                    }}
                  >
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[10.5px]" style={{ color: "var(--rp-muted)" }}>
                    {step.kind}
                    {step.meta ? ` · ${step.meta}` : ""}
                  </p>
                </div>
                <span
                  className="flex-shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: next ? "var(--rp-accent)" : "var(--rp-muted)" }}
                >
                  {STATE_WORD[step.state]}
                </span>
              </div>
            );
          })}

          <div className="mt-6">
            <p style={{ ...labelStyle, color: "var(--rp-accent)" }}>Optional missions</p>
            {j.optional.map((mission) => (
              <p
                key={mission}
                className="mt-1.5 text-[12.5px]"
                style={{ fontFamily: "var(--rp-display)", color: "var(--rp-muted)" }}
              >
                {mission}
              </p>
            ))}
          </div>
        </div>

        <aside className="lg:border-l lg:pl-6" style={{ borderColor: "var(--rp-line)" }}>
          <p style={labelStyle}>Progress</p>
          <p
            className="mt-1 text-[40px] leading-none tabular-nums"
            style={{ fontFamily: "var(--rp-display)" }}
          >
            {j.percent}%
          </p>
          <div className="mt-3 h-px w-full" style={{ background: "var(--rp-ink)" }} />
          <p className="mt-2 text-[11.5px]" style={{ color: "var(--rp-muted)" }}>
            {j.due} · 3 of 8 steps done
          </p>
          <button
            className="mt-5 w-full py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ background: "var(--rp-ink)", color: "var(--rp-bg)" }}
          >
            Continue step 4
          </button>
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--rp-muted)" }}>
            Next: Your first one-on-one · 18 min
          </p>
        </aside>
      </div>
    </div>
  );
}