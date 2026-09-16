import React from "react";
import { Link } from "react-router-dom";
import { PenLine, ChevronRight } from "lucide-react";

export default function DecisionJournalCard() {
  return (
    <Link
      to="/decision-journal"
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <PenLine className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-900">Leadership Support Tool</p>
          <p className="text-[10px] text-slate-500">Think through a moment, review outcomes later</p>
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
    </Link>
  );
}