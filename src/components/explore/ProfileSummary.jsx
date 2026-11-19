import React from "react";
import { Download, ArrowRight } from "lucide-react";
import { DIMENSIONS } from "@/lib/exploreDemoContent";

const band = (score) => (score >= 4 ? "strong" : score === 3 ? "steady" : "stretch");
const bandLabel = { strong: "Strength", steady: "Steady", stretch: "Stretch" };
const bandClass = {
  strong: "bg-emerald-50 text-emerald-700 border-emerald-200",
  steady: "bg-amber-50 text-amber-700 border-amber-200",
  stretch: "bg-red-50 text-red-700 border-red-200",
};

export default function ProfileSummary({ scores, compact = false }) {
  const keys = Object.keys(DIMENSIONS);
  const ranked = [...keys].sort((a, b) => (scores?.[b] || 0) - (scores?.[a] || 0));
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];

  const download = () => {
    const lines = [
      "Curiosity Led — sample manager profile",
      "From the interactive demo (illustrative, not a scored assessment)",
      "",
      ...keys.map(
        (k) => `${DIMENSIONS[k].label}: ${scores?.[k] || 0}/5 — ${DIMENSIONS[k][band(scores?.[k] || 0)]}`
      ),
      "",
      `What to practise next: ${DIMENSIONS[weakest].practice}`,
      "",
      "curiosityled.ai",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curiosity-led-sample-profile.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your profile</p>
          <h3 className="text-lg font-bold text-gray-900 mt-1">Where your judgment is strong</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
          Sample
        </span>
      </div>

      <div className="space-y-4">
        {keys.map((k) => {
          const score = scores?.[k] || 0;
          const b = band(score);
          return (
            <div key={k}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-800">{DIMENSIONS[k].label}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${bandClass[b]}`}>
                  {bandLabel[b]}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(score / 5) * 100}%`,
                    backgroundColor: b === "strong" ? "#10b981" : b === "steady" ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{DIMENSIONS[k][b]}</p>
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#0202ff" }}>
            Practise this next
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{DIMENSIONS[weakest].practice}</p>
          <p className="mt-2 text-xs text-gray-500">
            Strongest: {DIMENSIONS[strongest].label}. In the product this profile updates as you practise.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <button
          onClick={download}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white hover:opacity-90"
          style={{ backgroundColor: "#0202ff" }}
        >
          <Download className="w-3.5 h-3.5" />
          Save my profile
        </button>
        <a
          href="https://cal.com/curiosityled/bookdemo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-gray-400"
        >
          Want this with your real data?
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}