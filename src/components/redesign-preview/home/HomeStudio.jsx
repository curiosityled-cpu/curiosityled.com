import React from "react";
import { SAMPLE } from "../sampleData";

const thick = { border: "3px solid var(--rp-ink)" };

function Card({ index, title, meta, percent, state }) {
  return (
    <div
      className="p-3"
      style={{ ...thick, background: "var(--rp-surface)", boxShadow: "4px 4px 0 var(--rp-ink)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-black uppercase leading-[1.15] tracking-[-0.01em]">{title}</p>
        <span
          className="grid h-6 w-6 flex-shrink-0 place-items-center text-[11px] font-black"
          style={{ background: "var(--rp-second)", border: "2px solid var(--rp-ink)" }}
        >
          {index}
        </span>
      </div>
      <p
        className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{ color: "var(--rp-muted)" }}
      >
        {meta}
      </p>
      <div
        className="mt-2 h-2 w-full"
        style={{ background: "var(--rp-panel)", border: "2px solid var(--rp-ink)" }}
      >
        <div className="h-full" style={{ width: `${percent}%`, background: "var(--rp-accent)" }} />
      </div>
      {state && (
        <p
          className="mt-1.5 text-[10px] font-black uppercase tracking-[0.16em]"
          style={{ color: "var(--rp-accent)" }}
        >
          {state}
        </p>
      )}
    </div>
  );
}

function Column({ title, count, children }) {
  return (
    <div>
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ ...thick, background: "var(--rp-second)" }}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.18em]">{title}</p>
        <p className="text-[11px] font-black">{count}</p>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

export default function HomeStudio() {
  const s = SAMPLE;
  return (
    <div style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <div className="p-6">
        <div
          className="p-6"
          style={{
            ...thick,
            background: "var(--rp-accent)",
            color: "var(--rp-accentInk)",
            boxShadow: "8px 8px 0 var(--rp-ink)",
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
            Pick up where you left off
          </p>
          <h2 className="mt-2 text-[34px] font-black uppercase leading-[0.95] tracking-[-0.02em]">
            {s.resume.title}
          </h2>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              className="px-4 py-2 text-[12px] font-black uppercase tracking-[0.16em]"
              style={{
                border: "3px solid var(--rp-ink)",
                background: "var(--rp-second)",
                color: "var(--rp-secondInk)",
                boxShadow: "4px 4px 0 var(--rp-ink)",
              }}
            >
              Resume · {s.resume.percent}%
            </button>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-90">
              {s.resume.step} · {s.resume.meta}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 pb-7 lg:grid-cols-3">
        <Column title="Journeys" count="03">
          {s.journeys.map((j, i) => (
            <Card
              key={j.title}
              index={`0${i + 1}`}
              title={j.title}
              meta={j.meta}
              percent={Math.round((j.done / j.total) * 100)}
            />
          ))}
        </Column>
        <Column title="Courses" count="03">
          {s.courses.map((c, i) => (
            <Card
              key={c.title}
              index={`0${i + 1}`}
              title={c.title}
              meta={[c.meta, c.due].filter(Boolean).join(" · ")}
              percent={c.percent}
            />
          ))}
        </Column>
        <Column title="Experiences" count="02">
          {s.experiences.map((e, i) => (
            <Card
              key={e.title}
              index={`0${i + 1}`}
              title={e.title}
              meta={e.meta}
              percent={e.state === "in_progress" ? 40 : 0}
              state={e.state === "in_progress" ? "Active" : "Open"}
            />
          ))}
        </Column>
      </div>
    </div>
  );
}