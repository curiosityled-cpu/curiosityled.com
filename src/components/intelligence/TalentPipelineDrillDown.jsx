import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, User, TrendingUp, BookOpen, ArrowRight } from "lucide-react";

const BAND_META = {
  readyNow:  { label: "Ready Now",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
  readySoon: { label: "Ready Soon", color: "bg-blue-100 text-blue-700 border-blue-200",         bar: "bg-blue-400"   },
  buildNow:  { label: "Build Now",  color: "bg-amber-100 text-amber-700 border-amber-200",       bar: "bg-amber-400"  },
};

function getBandKey(score) {
  if (score >= 85) return "readyNow";
  if (score >= 70) return "readySoon";
  return "buildNow";
}

export default function TalentPipelineDrillDown({ open, onClose, bandKey, leaders, activeEnrollments }) {
  if (!bandKey) return null;
  const meta = BAND_META[bandKey];

  const bandDescriptions = {
    readyNow:  "These leaders have strong capability evidence and demonstrated goal follow-through. They are succession-ready candidates for critical roles.",
    readySoon: "These leaders are on track and making progress. They need continued development, manager validation, or stretch experience before succession consideration.",
    buildNow:  "These leaders are in the early development stage. Structured investment in capability building and execution is the recommended next action.",
  };

  const actions = {
    readyNow:  "Validate with manager and include in succession slate review. Discuss stretch or expansion opportunities.",
    readySoon: "Schedule development check-in. Assign stretch assignment or coaching engagement to accelerate progression.",
    buildNow:  "Review development plan. Consider a structured capability-building program and increased manager coaching cadence.",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base flex items-center gap-2">
                <Badge className={`border ${meta.color}`}>{meta.label}</Badge>
                <span className="text-gray-700 font-normal text-sm">— Leader Detail</span>
              </DialogTitle>
              <p className="text-[11px] text-gray-500 mt-1">{bandDescriptions[bandKey]}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Recommended action for this band */}
        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-1">
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-700">{actions[bandKey]}</p>
        </div>

        {/* Leader list */}
        <div className="mt-3 space-y-2">
          {leaders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No leaders in this band.</p>
          ) : (
            leaders.map((a, i) => {
              const score = a.overall_pct ?? a.data?.overall_pct ?? 0;
              const email = a.user_email ?? a.data?.user_email ?? "";
              const name = a.user_name ?? a.data?.user_name ?? email ?? `Leader ${i + 1}`;
              const title = a.job_title ?? a.data?.job_title ?? null;
              const manager = a.manager_name ?? a.data?.manager_name ?? null;
              const level = a.leadership_level ?? a.data?.leadership_level ?? null;
              const isEnrolled = activeEnrollments?.has(email);
              const submissionDate = a.submission_date ?? a.data?.submission_date;
              const displayDate = submissionDate ? new Date(submissionDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;

              return (
                <div key={a.id ?? i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center flex-shrink-0 text-xs font-medium text-purple-600">
                    {name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">{name}</div>
                        {title && <div className="text-[11px] text-gray-600 truncate">{title}</div>}
                        {manager && <div className="text-[10px] text-gray-500 truncate">Manager: {manager}</div>}
                      </div>
                      <span className="text-xs font-bold text-gray-700 flex-shrink-0 whitespace-nowrap ml-2">{score}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full ${meta.bar} rounded-full`} style={{ width: `${score}%` }} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {level && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{level}</span>
                      )}
                      {isEnrolled && (
                        <span className="text-[10px] text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 flex items-center gap-1">
                          <BookOpen className="w-2.5 h-2.5" /> Developing
                        </span>
                      )}
                      {displayDate && (
                        <span className="text-[10px] text-gray-400">Assessed {displayDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
          Readiness scores are estimates based on capability evidence and development data. Use alongside manager judgment before making succession or development decisions.
        </p>
      </DialogContent>
    </Dialog>
  );
}