import React from "react";
import { Link } from "react-router-dom";
import { Brain, ChevronRight } from "lucide-react";

export default function DecisionJournalCard() {
  return (
    <Link to="/decision-journal">
      <div className="flex items-center justify-between gap-3 px-4 py-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-rose-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Decision journal</p>
            <p className="text-xs text-muted-foreground truncate">Capture decisions, review outcomes later</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
      </div>
    </Link>
  );
}