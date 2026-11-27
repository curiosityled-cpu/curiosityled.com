import React from "react";
import { ArrowRight } from "lucide-react";
import { SAMPLE } from "../sampleData";
import { labelStyle } from "../directions";

export default function ActivityFocus() {
  const a = SAMPLE.activity;
  return (
    <div className="px-7 py-6" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p style={labelStyle}>{a.course}</p>
          <p className="mt-1 text-[15px] font-medium">{a.lesson}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: i < 3 ? "var(--rp-accent)" : "var(--rp-line)",
                  boxShadow: i === 2 ? "0 0 8px var(--rp-glow)" : "none",
                }}
              />
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-[0.16em]" style={{ fontFamily: "var(--rp-label)", color: "var(--rp-muted)" }}>
            {a.minutes} left
          </span>
        </div>
      </div>

      <div
        className="mt-4 p-6"
        style={{
          background: "var(--rp-surface)",
          border: "1px solid var(--rp-line)",
          borderRadius: "var(--rp-radius)",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: "var(--rp-label)", color: "var(--rp-accent)" }}>
          Why this matters
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--rp-muted)" }}>
          {a.purpose}
        </p>

        <div className="mt-5 max-w-[62ch] space-y-3">
          {a.body.map((paragraph, i) => (
            <p key={i} className="text-[14px] leading-[1.75]">
              {paragraph}
            </p>
          ))}
        </div>

        <div
          className="mt-5 border-l-2 pl-3 text-[13px]"
          style={{ borderColor: "var(--rp-accent)", color: "var(--rp-ink)" }}
        >
          {a.takeaway}
        </div>
      </div>

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{
          background: "var(--rp-surface)",
          border: "1px solid var(--rp-line)",
          borderRadius: "var(--rp-radius)",
        }}
      >
        <span className="text-[11px]" style={{ color: "var(--rp-muted)" }}>
          {a.next}
        </span>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{
            background: "var(--rp-accent)",
            color: "var(--rp-accentInk)",
            borderRadius: "var(--rp-radius)",
            boxShadow: "0 0 18px var(--rp-glow)",
          }}
        >
          Complete &amp; continue <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}