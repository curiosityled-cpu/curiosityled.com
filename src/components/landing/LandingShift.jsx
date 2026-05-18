import React from "react";
import { ArrowRight } from "lucide-react";

const rows = [
  { before: "Reactive programs", after: "Earlier leadership signals" },
  { before: "Out-of-workflow learning", after: "Support in the flow of work" },
  { before: "Fragmented data", after: "One leadership view" },
  { before: "No behavior tracking", after: "Clearer progress and intervention visibility" },
];

export default function LandingShift() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
              <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
              <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">The shift</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-6 leading-tight">
              From reactive development to earlier intervention.
            </h2>

            <p className="text-gray-500 leading-relaxed mb-8">
              Curiosity Led changes when development happens. Instead of waiting for a problem to surface and then assigning support, it helps you see risk sooner, intervene earlier, and connect every coaching conversation, learning moment, and goal to a clearer picture of how managers are actually leading.
            </p>

            <a
              href="https://cal.com/curiosityled/bookdemo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: "#0202ff" }}
            >
              See it in a demo
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Right: image + comparison table */}
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden shadow-sm">
              <img
                src="https://raw.githubusercontent.com/curiosityled-cpu/curiosityled.com/main/public/White%20and%20Blue%20How%20to%20Start%20a%20Saas%20Product%20Webinar%20Instagram%20Post_edited.jpg"
                alt="Team collaborating proactively"
                className="w-full h-52 object-cover object-center"
              />
            </div>
            <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Today</div>
              <div
                className="text-xs font-bold uppercase tracking-wider text-center"
                style={{ color: "#0202ff" }}
              >
                Curiosity Led
              </div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 items-stretch">
                {/* Before */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center">
                  <span className="text-sm text-gray-500 line-through">{row.before}</span>
                </div>
                {/* After */}
                <div
                  className="rounded-xl px-4 py-3 flex items-center border"
                  style={{ backgroundColor: "#eef0ff", borderColor: "#c7ccff" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "#0202ff" }}>
                    {row.after}
                  </span>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}