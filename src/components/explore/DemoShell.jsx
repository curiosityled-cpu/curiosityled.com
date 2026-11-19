import React from "react";
import { Link } from "react-router-dom";
import { Check, X, ChevronLeft } from "lucide-react";
import { STEPS } from "@/lib/exploreDemoContent";

const SIDEBAR = [
  { label: "Lead", key: "lead" },
  { label: "Team", key: "team" },
  { label: "Practice", key: "practice" },
];

const ADMIN = [
  { label: "Leadership Intelligence", key: "insights" },
  { label: "Development Manager", key: "dev" },
];

const ACTIVE_BY_STEP = ["lead", "practice", "lead", "insights"];

export default function DemoShell({ step, onStep, children }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Demo bar */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: "#0f0f1a" }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#0202ff" }} />
            <span className="text-sm font-bold text-white truncate">Curiosity Led</span>
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
              Interactive demo
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={s.id}
                  onClick={() => onStep(i)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      done ? "bg-emerald-500 text-white" : active ? "bg-[#0202ff] text-white" : "bg-white/15 text-gray-300"
                    }`}
                  >
                    {done ? <Check className="w-2.5 h-2.5" /> : i + 1}
                  </span>
                  {s.short}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white px-2 py-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Exit demo
            </Link>
            <a
              href="https://cal.com/curiosityled/bookdemo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-white px-3.5 py-2 rounded-lg hover:opacity-90"
              style={{ backgroundColor: "#0202ff" }}
            >
              Book a demo
            </a>
          </div>
        </div>

        {/* Mobile progress */}
        <div className="lg:hidden px-4 pb-2 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onStep(i)}
              className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: i <= step ? "#0202ff" : "rgba(255,255,255,0.18)" }}
              aria-label={s.label}
            />
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto flex">
        {/* App sidebar, mirrored */}
        <aside className="hidden sm:flex flex-col w-56 flex-shrink-0 border-r border-gray-200 bg-white min-h-[calc(100vh-3.5rem)]">
          <div className="px-4 py-4 border-b border-gray-100">
            <img
              src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/a426953be_CuriosityLedLogoBBW.png"
              alt="Curiosity Led"
              className="w-32 h-auto object-contain"
            />
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {SIDEBAR.map((item) => {
              const active = ACTIVE_BY_STEP[step] === item.key;
              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active ? "text-white shadow-sm" : "text-gray-500"
                  }`}
                  style={active ? { backgroundColor: "#0202ff" } : undefined}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white" : "bg-gray-300"}`} />
                  {item.label}
                </div>
              );
            })}
            <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Administration
            </p>
            {ADMIN.map((item) => {
              const active = ACTIVE_BY_STEP[step] === item.key;
              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                    active ? "text-white shadow-sm" : "text-gray-500"
                  }`}
                  style={active ? { backgroundColor: "#0202ff" } : undefined}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white" : "bg-gray-300"}`} />
                  {item.label}
                </div>
              );
            })}
          </nav>
          <div className="p-3 border-t border-gray-100">
            <p className="text-[10px] leading-relaxed text-gray-400">
              Navigation is illustrative. Nothing here is clickable except the demo.
            </p>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-gray-50 px-4 sm:px-8 py-6 sm:py-10">
          <div className="max-w-3xl mx-auto">{children}</div>
          {step > 0 && (
            <div className="max-w-3xl mx-auto mt-6">
              <button
                onClick={() => onStep(step - 1)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}