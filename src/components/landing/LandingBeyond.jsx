import React from "react";
import { X, Check } from "lucide-react";

const notList = [
  "Another LMS",
  "Another leadership program",
  "Another coaching marketplace",
];

const isList = [
  "A system that surfaces leadership risk earlier",
  "In-the-workflow support tied to real management moments",
  "One clear view of progress, readiness, and intervention",
  "A foundation for career pathing and succession decisions",
];

export default function LandingBeyond() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">Who we are</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-4 leading-tight">
            Beyond support: leadership visibility.
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Curiosity Led is not another LMS, another leadership program, or another coaching marketplace. It is a system that makes leadership development more timely, measurable, and tied to real behavior before problems escalate. That gives organizations a stronger foundation for career pathing, succession decisions, and leadership investment that can be explained with more than anecdotes.
          </p>
        </div>

        {/* Leader reviewing data image */}
        <div className="mb-10 rounded-2xl overflow-hidden max-w-3xl mx-auto shadow-sm">
          <img
            src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5ef0756e0_image.png"
            alt="Leader reviewing leadership data"
            className="w-full h-64 object-cover object-top"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Not */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">We are not</div>
            <ul className="space-y-3">
              {notList.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-gray-500 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Is */}
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: "#eef0ff", borderColor: "#c7ccff" }}
          >
            <div
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: "#0202ff" }}
            >
              We are
            </div>
            <ul className="space-y-3">
              {isList.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#0a0a2e" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}