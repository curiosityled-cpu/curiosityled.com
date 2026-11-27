import React from "react";
import { SAMPLE } from "../sampleData";

const thick = { border: "3px solid var(--rp-ink)" };

export default function ActivityStudio() {
  const a = SAMPLE.activity;
  return (
    <div style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] px-6 py-2" style={{ borderColor: "var(--rp-ink)" }}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em]">{a.course}</p>
        <div className="flex items-center gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="h-3 w-3"
              style={{
                border: "2px solid var(--rp-ink)",
                background: i < 3 ? "var(--rp-accent)" : "var(--rp-surface)",
              }}
            />
          ))}
          <span className="ml-2 text-[10px] font-black uppercase tracking-[0.14em]">{a.minutes}</span>
        </div>
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="p-5" style={{ ...thick, background: "var(--rp-surface)", boxShadow: "6px 6px 0 var(--rp-ink)" }}>
          <p className="text-[9px] font-black uppercase tracking-[0.28em]" style={{ color: "var(--rp-accent)" }}>
            {a.step}
          </p>
          <h2 className="mt-1 text-[26px] font-black uppercase leading-[0.95] tracking-[-0.02em]">
            {a.lesson}
          </h2>
          <div className="mt-4 space-y-3">
            {a.body.map((paragraph, i) => (
              <p key={i} className="text-[12.5px] leading-[1.65]" style={{ color: i === 0 ? "var(--rp-ink)" : "var(--rp-muted)" }}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="p-5" style={{ ...thick, background: "var(--rp-second)", boxShadow: "6px 6px 0 var(--rp-ink)" }}>
          <p className="text-[9px] font-black uppercase tracking-[0.26em]">In this lesson</p>
          <p className="mt-2 text-[14px] font-black uppercase leading-[1.25]">{a.purpose}</p>

          <div className="mt-4 h-2 w-full" style={{ background: "#FFFFFF", border: "2px solid var(--rp-ink)" }}>
            <div className="h-full" style={{ width: "43%", background: "var(--rp-accent)" }} />
          </div>
          <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.14em]">Step 3 of 7</p>

          <div className="mt-4 border-t-2 pt-3" style={{ borderColor: "var(--rp-ink)" }}>
            <p className="text-[9px] font-black uppercase tracking-[0.26em]">Keep this</p>
            <p className="mt-1 text-[13px] font-black uppercase leading-[1.3]">{a.takeaway}</p>
          </div>

          <button
            className="mt-4 w-full py-2.5 text-[12px] font-black uppercase tracking-[0.18em]"
            style={{
              border: "3px solid var(--rp-ink)",
              background: "var(--rp-accent)",
              color: "var(--rp-accentInk)",
              boxShadow: "4px 4px 0 var(--rp-ink)",
            }}
          >
            Mark complete
          </button>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em]">{a.next}</p>
        </div>
      </div>
    </div>
  );
}