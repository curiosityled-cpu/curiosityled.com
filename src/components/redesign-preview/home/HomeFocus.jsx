import React from "react";
import { ArrowUpRight } from "lucide-react";
import { SAMPLE } from "../sampleData";
import { labelStyle } from "../directions";

const panel = {
  background: "var(--rp-surface)",
  border: "1px solid var(--rp-line)",
  borderRadius: "var(--rp-radius)",
};

function Bar({ percent }) {
  return (
    <div className="h-1 w-full rounded-full" style={{ background: "var(--rp-panel)" }}>
      <div
        className="h-1 rounded-full"
        style={{
          width: `${percent}%`,
          background: "var(--rp-accent)",
          boxShadow: "0 0 10px var(--rp-glow)",
        }}
      />
    </div>
  );
}

function Strip({ title, count, children }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p style={{ ...labelStyle, color: "var(--rp-ink)" }}>{title}</p>
        <p style={labelStyle}>{count}</p>
      </div>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Line({ title, meta, percent, state }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{
        background: "var(--rp-surface)",
        border: "1px solid var(--rp-line)",
        borderRadius: "var(--rp-radius)",
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{title}</p>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--rp-muted)" }}>
          {meta}
        </p>
      </div>
      <div className="w-16 flex-shrink-0">
        <Bar percent={percent} />
      </div>
      <span
        className="w-11 flex-shrink-0 text-right text-[10px] tabular-nums"
        style={{ fontFamily: "var(--rp-label)", color: "var(--rp-muted)" }}
      >
        {state || `${percent}%`}
      </span>
    </div>
  );
}

export default function HomeFocus() {
  const s = SAMPLE;
  return (
    <div className="px-7 py-7" style={{ background: "var(--rp-bg)", color: "var(--rp-ink)" }}>
      <div className="flex items-center justify-between">
        <p style={labelStyle}>My development / {s.firstName}</p>
        <p style={labelStyle}>Fri 27 Nov</p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <div className="p-5" style={panel}>
          <p style={labelStyle}>In progress</p>
          <p className="mt-2 text-[54px] font-semibold leading-none tabular-nums">
            {s.resume.percent}
            <span className="text-[20px]" style={{ color: "var(--rp-muted)" }}>
              %
            </span>
          </p>
          <div className="mt-4">
            <Bar percent={s.resume.percent} />
          </div>
          <p className="mt-4 text-[13px] font-medium leading-snug">{s.resume.title}</p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--rp-muted)" }}>
            {s.resume.step} · {s.resume.meta}
          </p>
          <button
            className="mt-4 w-full py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              background: "var(--rp-accent)",
              color: "var(--rp-accentInk)",
              borderRadius: "var(--rp-radius)",
            }}
          >
            Resume
          </button>
        </div>

        <div className="p-5" style={panel}>
          <div className="flex items-center justify-between">
            <p style={labelStyle}>Up next</p>
            <p style={{ ...labelStyle, color: "var(--rp-accent)" }}>3 open</p>
          </div>
          <div className="mt-3 space-y-2">
            {[s.courses[0], s.courses[1], s.journeys[1]].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 border-b pb-2 last:border-0 last:pb-0"
                style={{ borderColor: "var(--rp-line)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--rp-muted)" }}>
                    {item.meta}
                    {item.due ? ` · ${item.due}` : ""}
                  </p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--rp-accent)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Strip title="Journeys" count={`${s.journeys.length}`}>
        {s.journeys.map((j) => (
          <Line
            key={j.title}
            title={j.title}
            meta={j.meta}
            percent={Math.round((j.done / j.total) * 100)}
          />
        ))}
      </Strip>
      <Strip title="Courses" count={`${s.courses.length}`}>
        {s.courses.map((c) => (
          <Line
            key={c.title}
            title={c.title}
            meta={[c.meta, c.due].filter(Boolean).join(" · ")}
            percent={c.percent}
          />
        ))}
      </Strip>
      <Strip title="Experiences" count={`${s.experiences.length}`}>
        {s.experiences.map((e) => (
          <Line
            key={e.title}
            title={e.title}
            meta={e.meta}
            percent={e.state === "in_progress" ? 40 : 0}
            state={e.state === "in_progress" ? "ACTIVE" : "OPEN"}
          />
        ))}
      </Strip>
    </div>
  );
}