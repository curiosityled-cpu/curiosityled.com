import React from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { SAMPLE } from "../sampleData";
import { labelStyle } from "../directions";

const panel = {
  background: "var(--rp-surface)",
  border: "1px solid var(--rp-line)",
  borderRadius: "var(--rp-radius)",
};

export default function JourneyFocus() {
  const j = SAMPLE.journeyDetail;
  return (
    <div className="px-7 py-7" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <p style={labelStyle}>My development / Journeys / 01</p>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{j.title}</h2>
          <p className="mt-1.5 max-w-[56ch] text-[12.5px] leading-relaxed" style={{ color: "var(--rp-muted)" }}>
            {j.deck}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div>
            <p style={labelStyle}>Progress</p>
            <p className="mt-0.5 text-[26px] font-semibold leading-none tabular-nums">{j.percent}%</p>
          </div>
          <button
            className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{
              background: "var(--rp-accent)",
              color: "var(--rp-accentInk)",
              borderRadius: "var(--rp-radius)",
              boxShadow: "0 0 18px var(--rp-glow)",
            }}
          >
            Continue
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="p-5" style={panel}>
          <div className="relative pl-9">
            <div
              className="absolute bottom-3 left-[13px] top-3 w-px"
              style={{ background: "var(--rp-line)" }}
            />
            {j.steps.map((step) => {
              const done = step.state === "done";
              const next = step.state === "next";
              const locked = step.state === "locked";
              return (
                <div key={step.n} className="relative pb-4 last:pb-0">
                  <span
                    className="absolute -left-9 top-0 grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold"
                    style={{
                      background: done ? "var(--rp-second)" : next ? "var(--rp-accent)" : "var(--rp-panel)",
                      color: next ? "var(--rp-accentInk)" : "var(--rp-ink)",
                      border: `1px solid ${next ? "var(--rp-accent)" : "var(--rp-line)"}`,
                      boxShadow: next ? "0 0 14px var(--rp-glow)" : "none",
                    }}
                  >
                    {done ? "✓" : locked ? <Lock className="h-3 w-3" /> : step.n}
                  </span>
                  <p
                    className="text-[13.5px] font-medium leading-snug"
                    style={{ color: locked ? "var(--rp-muted)" : "var(--rp-ink)" }}
                  >
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em]" style={{ fontFamily: "var(--rp-label)", color: next ? "var(--rp-accent)" : "var(--rp-muted)" }}>
                    {step.kind}
                    {step.meta ? ` · ${step.meta}` : ""}
                    {next ? " · up next" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-4" style={panel}>
            <p style={labelStyle}>This journey</p>
            <p className="mt-2 text-[12px]" style={{ color: "var(--rp-muted)" }}>
              8 steps · 6 weeks
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--rp-muted)" }}>
              {j.due}
            </p>
            <div className="mt-3 h-1 w-full rounded-full" style={{ background: "var(--rp-panel)" }}>
              <div
                className="h-1 rounded-full"
                style={{ width: `${j.percent}%`, background: "var(--rp-accent)", boxShadow: "0 0 10px var(--rp-glow)" }}
              />
            </div>
          </div>
          <div className="p-4" style={panel}>
            <p style={labelStyle}>Optional</p>
            {j.optional.map((mission) => (
              <p key={mission} className="mt-2 text-[11.5px] leading-snug" style={{ color: "var(--rp-muted)" }}>
                {mission}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}