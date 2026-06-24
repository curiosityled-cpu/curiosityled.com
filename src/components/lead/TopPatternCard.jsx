/**
 * TopPatternCard — Compact surface on /today that shows the top active pattern
 * with an Explore button that opens the full PatternDetailDrawer.
 */
import React, { useState } from "react";
import { AlertTriangle, Users, Zap, ArrowRight, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import PatternDetailDrawer from "@/components/patterns/PatternDetailDrawer";

const BUCKET_STYLES = {
  'Operational Risk': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-400', icon: AlertTriangle },
  'People Risk':      { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', icon: Users },
  'Execution':        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400', icon: Zap },
};

const STATUS_STYLES = {
  Emerging:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  Active:     'bg-orange-100 text-orange-800 border-orange-200',
  Persistent: 'bg-red-100 text-red-800 border-red-200',
};

export default function TopPatternCard({ pattern, onOpenAtreus, onDecisionCommitted, pendingDecisions = [] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoOpenDecision, setAutoOpenDecision] = useState(false);

  if (!pattern) return null;

  const style = BUCKET_STYLES[pattern.bucket] || BUCKET_STYLES['Execution'];
  const Icon = style.icon;

  return (
    <React.Fragment>
      <div className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden`}>
        {/* thin accent bar */}
        <div className={`h-0.5 ${pattern.status === 'Persistent' ? 'bg-red-500' : pattern.status === 'Active' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className={`p-1.5 rounded-lg bg-white/70 border ${style.border} flex-shrink-0 mt-0.5`}>
              <Icon className={`w-3.5 h-3.5 ${style.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Top pattern</p>
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${STATUS_STYLES[pattern.status] || ''}`}>
                  {pattern.status}
                </Badge>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{pattern.name}</p>
              <p className="text-xs text-gray-600 leading-snug mt-0.5 line-clamp-2">{pattern.tagline}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAutoOpenDecision(false); setDrawerOpen(true); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${style.border} ${style.text} hover:bg-white/60 transition-colors`}
              >
                Explore & get decision support
                <ArrowRight className="w-3 h-3" />
              </button>
              <Link
                to="/patterns"
                className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                All patterns
              </Link>
            </div>
            <button
              onClick={() => { setAutoOpenDecision(true); setDrawerOpen(true); }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-dashed border-[#0202ff]/30 text-[#0202ff] hover:bg-[#0202ff]/5 transition-colors"
            >
              <FileEdit className="w-3 h-3" />
              Draft a decision related to this pattern
            </button>
          </div>
        </div>
      </div>

      <PatternDetailDrawer
        pattern={pattern}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setAutoOpenDecision(false); }}
        onDecisionSaved={async () => {
          await onDecisionCommitted?.();
        }}
        onOpenAtreus={onOpenAtreus}
        autoOpenDecision={autoOpenDecision}
        patternDecisions={pendingDecisions.filter(d => d.pattern_name === pattern.name).slice(0, 3)}
      />
    </React.Fragment>
  );
}