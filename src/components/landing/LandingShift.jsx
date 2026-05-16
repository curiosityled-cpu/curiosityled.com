import React from "react";

const rows = [
  { before: "Reactive programs", after: "Early risk detection" },
  { before: "Out-of-workflow learning", after: "In-the-workflow support" },
  { before: "Fragmented data", after: "One leadership view" },
  { before: "No behavior tracking", after: "Clearer progress visibility" },
];

export default function LandingShift() {
  return (
    <section id="home-shift" className="py-24 bg-white px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0202FF] mb-4">
          The shift
        </p>
        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-950 mb-4 max-w-2xl">
          From reactive to earlier intervention
        </h2>
        <p className="text-base text-gray-500 leading-relaxed max-w-2xl mb-14">
          Curiosity Led changes the timing of leadership development so support starts earlier and connects to a clearer view of progress.
        </p>

        <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {/* Header row */}
          <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-100">
            <div className="px-7 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Today
            </div>
            <div className="px-7 py-3 text-xs font-semibold uppercase tracking-widest text-[#0202FF] border-l border-gray-100">
              Curiosity Led
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.before}
              className={`grid grid-cols-2 ${i < rows.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <div className="px-7 py-5 text-sm text-gray-500 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                {row.before}
              </div>
              <div className="px-7 py-5 text-sm font-medium text-gray-900 border-l border-gray-100 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0202FF] flex-shrink-0" />
                {row.after}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}