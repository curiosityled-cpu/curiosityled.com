import React from "react";
import { ArrowRight } from "lucide-react";
import { SAMPLE } from "../sampleData";
import { labelStyle } from "../directions";

function SectionHead({ n, title, count }) {
  return (
    <div
      className="mt-8 flex items-baseline justify-between border-b pb-1.5"
      style={{ borderColor: "var(--rp-ink)" }}
    >
      <div className="flex items-baseline gap-3">
        <span style={{ ...labelStyle, color: "var(--rp-accent)", fontSize: 11 }}>{n}</span>
        <h3 className="text-[19px] leading-none" style={{ fontFamily: "var(--rp-display)" }}>
          {title}
        </h3>
      </div>
      <span style={labelStyle}>{count}</span>
    </div>
  );
}

function Row({ title, meta, right }) {
  return (
    <div
      className="flex items-baseline justify-between gap-6 border-b py-2.5"
      style={{ borderColor: "var(--rp-line)" }}
    >
      <div className="min-w-0">
        <p className="truncate text-[14px]" style={{ fontFamily: "var(--rp-display)" }}>
          {title}
        </p>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--rp-muted)" }}>
          {meta}
        </p>
      </div>
      <span
        className="flex-shrink-0 text-[13px] tabular-nums"
        style={{ fontFamily: "var(--rp-display)", color: "var(--rp-accent)" }}
      >
        {right}
      </span>
    </div>
  );
}

export default function HomeEditorial() {
  const s = SAMPLE;
  return (
    <div className="px-8 py-8" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <div className="flex items-baseline justify-between">
        <span style={labelStyle}>Friday, 27 November</span>
        <span style={labelStyle}>My development</span>
      </div>

      <h2
        className="mt-5 text-[38px] leading-[1.05] tracking-[-0.01em]"
        style={{ fontFamily: "var(--rp-display)" }}
      >
        Good afternoon, {s.firstName}.
      </h2>

      <div className="mt-7" style={{ borderTop: "1px solid var(--rp-ink)" }}>
        <div className="flex items-center justify-between gap-6 py-4">
          <div className="min-w-0">
            <p style={labelStyle}>Continue</p>
            <p
              className="mt-1 truncate text-[22px]"
              style={{ fontFamily: "var(--rp-display)" }}
            >
              {s.resume.title}
            </p>
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--rp-muted)" }}>
              {s.resume.kind} · {s.resume.step} · {s.resume.meta} · {s.resume.due}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-4">
            <span
              className="text-[30px] leading-none tabular-nums"
              style={{ fontFamily: "var(--rp-display)", color: "var(--rp-accent)" }}
            >
              {s.resume.percent}%
            </span>
            <span
              className="grid h-9 w-9 place-items-center rounded-full"
              style={{ border: "1px solid var(--rp-ink)" }}
            >
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      <SectionHead n="01" title="Journeys" count={`${s.journeys.length} enrolled`} />
      {s.journeys.map((j) => (
        <Row
          key={j.title}
          title={j.title}
          meta={`${j.meta} · ${
            j.state === "completed"
              ? "Complete"
              : j.state === "in_progress"
              ? "In progress"
              : "Not started"
          }`}
          right={`${j.done}/${j.total}`}
        />
      ))}

      <SectionHead n="02" title="Courses" count={`${s.courses.length} assigned`} />
      {s.courses.map((c) => (
        <Row
          key={c.title}
          title={c.title}
          meta={[c.meta, c.due].filter(Boolean).join(" · ")}
          right={c.percent ? `${c.percent}%` : "Start"}
        />
      ))}

      <SectionHead n="03" title="Experiences" count={`${s.experiences.length} logged`} />
      {s.experiences.map((e) => (
        <Row
          key={e.title}
          title={e.title}
          meta={e.meta}
          right={e.state === "in_progress" ? "Active" : "Open"}
        />
      ))}

      <p className="mt-6 text-[11.5px]" style={{ color: "var(--rp-muted)" }}>
        Achievements — 4 certificates · 9 badges · full learning record
      </p>
    </div>
  );
}