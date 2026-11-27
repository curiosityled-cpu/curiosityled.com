import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SAMPLE } from "../sampleData";
import { labelStyle } from "../directions";

export default function ActivityEditorial() {
  const a = SAMPLE.activity;
  return (
    <div className="px-8 py-7" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <div className="flex items-baseline justify-between">
        <p className="inline-flex items-center gap-1.5" style={labelStyle}>
          <ArrowLeft className="h-3 w-3" /> {a.course}
        </p>
        <p style={labelStyle}>
          {a.step} · {a.minutes}
        </p>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div>
          <h2 className="text-[30px] leading-[1.1] tracking-[-0.01em]" style={{ fontFamily: "var(--rp-display)" }}>
            {a.lesson}
          </h2>
          <p className="mt-2 text-[13px] italic" style={{ fontFamily: "var(--rp-display)", color: "var(--rp-muted)" }}>
            {a.purpose}
          </p>

          <div className="mt-5 h-px w-full" style={{ background: "var(--rp-ink)" }} />

          <div className="mt-4 max-w-[56ch] space-y-3">
            {a.body.map((paragraph, i) => (
              <p key={i} className="text-[14px] leading-[1.7]" style={{ color: "var(--rp-ink)" }}>
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--rp-line)" }}>
            <button
              className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ background: "var(--rp-ink)", color: "var(--rp-bg)" }}
            >
              Mark complete
            </button>
            <span className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--rp-muted)" }}>
              Next: {a.next} <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        <aside className="lg:border-l lg:pl-6" style={{ borderColor: "var(--rp-line)" }}>
          <p style={{ ...labelStyle, color: "var(--rp-accent)" }}>Margin note</p>
          <p className="mt-2 text-[16px] leading-[1.35]" style={{ fontFamily: "var(--rp-display)" }}>
            {a.takeaway}
          </p>
          <p className="mt-4 text-[11px] leading-relaxed" style={{ color: "var(--rp-muted)" }}>
            Lesson 3 of 7 · about {a.minutes} to finish
          </p>
        </aside>
      </div>
    </div>
  );
}