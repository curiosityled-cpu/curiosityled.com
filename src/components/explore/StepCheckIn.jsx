import React, { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { CHECKIN } from "@/lib/exploreDemoContent";

export default function StepCheckIn({ onNext }) {
  const [values, setValues] = useState(
    CHECKIN.measures.reduce((acc, m) => ({ ...acc, [m.key]: m.start }), {})
  );
  const [anchored, setAnchored] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const ready = CHECKIN.anchored.every((q) => anchored[q.id]);

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-3">
        Daily check-in · 40 seconds
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">
        One minute a day. That's what makes it provable.
      </h1>
      <p className="text-gray-600 leading-relaxed mb-6">
        Two fixed measures, two operational questions. Delivered in Teams or email — you answer
        where you already are, not in another portal.
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="space-y-5">
          {CHECKIN.measures.map((m) => (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">{m.label}</span>
                <span className="text-xs font-bold" style={{ color: "#0202ff" }}>
                  {values[m.key]}/5
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={values[m.key]}
                onChange={(e) => setValues((v) => ({ ...v, [m.key]: Number(e.target.value) }))}
                className="w-full cursor-pointer"
                style={{ accentColor: "#0202ff" }}
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>{m.low}</span>
                <span>{m.high}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 space-y-4">
          {CHECKIN.anchored.map((q) => (
            <div key={q.id}>
              <p className="text-sm font-semibold text-gray-800 mb-2">{q.q}</p>
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((opt) => {
                  const selected = anchored[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnchored((a) => ({ ...a, [q.id]: opt }))}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                        selected
                          ? "text-white border-transparent"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                      style={selected ? { backgroundColor: "#0202ff" } : undefined}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {submitted ? (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#10b981" }}>
              <Check className="w-3 h-3 text-white" />
            </span>
            <p className="text-sm font-bold text-gray-900">Check-in logged</p>
          </div>
          <p className="text-xs text-gray-500 mb-3">Your last seven days, energy:</p>
          <div className="flex items-end gap-1.5 h-16">
            {CHECKIN.trend.map((v, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${(v / 5) * 100}%`, backgroundColor: i === CHECKIN.trend.length - 1 ? "#0202ff" : "#c7d2fe" }} />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-600 leading-relaxed">{CHECKIN.followUp}</p>
          <button
            onClick={onNext}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
            style={{ backgroundColor: "#0202ff" }}
          >
            Now show me the org view
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!ready}
          className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: "#0202ff" }}
        >
          Submit check-in
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}