import React from "react";
import { ArrowRight } from "lucide-react";
import { SAMPLE } from "../sampleData";
import { labelStyle } from "../directions";

function Ring({ percent }) {
  return (
    <div
      className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(var(--rp-accent) ${percent * 3.6}deg, var(--rp-line) 0)` }}
    >
      <div
        className="grid h-11 w-11 place-items-center rounded-full text-[11px] font-semibold"
        style={{ background: "var(--rp-surface)" }}
      >
        {percent}%
      </div>
    </div>
  );
}

function Shelf({ title, count, children }) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[17px] font-semibold">{title}</h3>
        <span style={labelStyle}>{count}</span>
      </div>
      <div className="mt-2.5 flex gap-3 overflow-x-auto pb-1">{children}</div>
    </div>
  );
}

function Tile({ title, meta, percent, state }) {
  return (
    <div
      className="w-[236px] flex-shrink-0 p-4"
      style={{
        background: "var(--rp-surface)",
        border: "1px solid var(--rp-line)",
        borderRadius: "var(--rp-radius)",
      }}
    >
      <p className="text-[13.5px] font-semibold leading-snug">{title}</p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--rp-muted)" }}>
        {meta}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--rp-panel)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: "var(--rp-accent)" }}
        />
      </div>
      <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--rp-muted)" }}>
        {state || (percent === 100 ? "Complete" : percent > 0 ? `${percent}% complete` : "Not started")}
      </p>
    </div>
  );
}

export default function HomeTrail() {
  const s = SAMPLE;
  return (
    <div className="px-7 py-8" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <p style={labelStyle}>My development</p>
      <h2 className="mt-1.5 text-[30px] font-medium leading-tight">
        Good afternoon, {s.firstName}
      </h2>

      <div
        className="mt-5 p-5"
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, var(--rp-second) 100%)",
          border: "1px solid var(--rp-line)",
          borderRadius: "var(--rp-radius)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p style={labelStyle}>Continue</p>
            <p className="mt-1 truncate text-[20px] font-semibold">{s.resume.title}</p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--rp-muted)" }}>
              {s.resume.step} · {s.resume.meta} · {s.resume.due}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Ring percent={s.resume.percent} />
            <button
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold"
              style={{ background: "var(--rp-accent)", color: "var(--rp-accentInk)" }}
            >
              Resume <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <Shelf title="Journeys" count={`${s.journeys.length} enrolled`}>
        {s.journeys.map((j) => (
          <Tile
            key={j.title}
            title={j.title}
            meta={j.meta}
            percent={Math.round((j.done / j.total) * 100)}
            state={
              j.state === "in_progress"
                ? `${j.done} of ${j.total} steps`
                : j.state === "completed"
                ? "Complete"
                : "Not started"
            }
          />
        ))}
      </Shelf>

      <Shelf title="Courses" count={`${s.courses.length} assigned`}>
        {s.courses.map((c) => (
          <Tile
            key={c.title}
            title={c.title}
            meta={[c.meta, c.due].filter(Boolean).join(" · ")}
            percent={c.percent}
          />
        ))}
      </Shelf>

      <Shelf title="Experiences" count={`${s.experiences.length} logged`}>
        {s.experiences.map((e) => (
          <Tile
            key={e.title}
            title={e.title}
            meta={e.meta}
            percent={e.state === "in_progress" ? 40 : 0}
            state={e.state === "in_progress" ? "Active" : "Open"}
          />
        ))}
      </Shelf>
    </div>
  );
}