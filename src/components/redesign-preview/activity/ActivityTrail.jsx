import React from "react";
import { ArrowRight, Clock } from "lucide-react";
import { SAMPLE } from "../sampleData";

export default function ActivityTrail() {
  const a = SAMPLE.activity;
  return (
    <div className="px-6 py-8" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <div
        className="mx-auto max-w-[760px] overflow-hidden"
        style={{
          background: "var(--rp-surface)",
          border: "1px solid var(--rp-line)",
          borderRadius: "var(--rp-radius)",
        }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--rp-line)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ background: "var(--rp-second)", color: "var(--rp-secondInk)" }}
            >
              {a.step}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ background: "var(--rp-panel)", color: "var(--rp-muted)" }}
            >
              <Clock className="h-3 w-3" /> {a.minutes}
            </span>
            <span className="ml-auto text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--rp-muted)" }}>
              {a.course}
            </span>
          </div>
          <h2 className="mt-3 text-[26px] font-semibold leading-tight">{a.lesson}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--rp-muted)" }}>
            {a.purpose}
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="max-w-[58ch] space-y-3">
            {a.body.map((paragraph, i) => (
              <p key={i} className="text-[13.5px] leading-[1.75]">
                {paragraph}
              </p>
            ))}
          </div>

          <div
            className="mt-5 rounded-2xl p-4"
            style={{ background: "var(--rp-panel)", border: "1px solid var(--rp-line)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--rp-accent)" }}>
              Takeaway
            </p>
            <p className="mt-1 text-[14px] font-medium leading-snug">{a.takeaway}</p>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4"
          style={{ borderColor: "var(--rp-line)", background: "var(--rp-panel)" }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--rp-muted)" }}>
              Next
            </p>
            <p className="mt-0.5 text-[12.5px] font-medium">{a.next}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold"
            style={{ background: "var(--rp-accent)", color: "var(--rp-accentInk)" }}
          >
            Complete lesson <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}