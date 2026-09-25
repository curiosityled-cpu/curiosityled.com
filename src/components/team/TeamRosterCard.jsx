/**
 * TeamRosterCard — Combined Team roster + at-risk signals card.
 * Mirrors the Talent Scorecard design: accent bar, collapsible header,
 * at-risk sub-card, and roster list sub-card.
 */
import React, { useState } from "react";
import { Users, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";

export default function TeamRosterCard({
  count,
  atRisk = [],
  children,
}) {
  const [cardExpanded, setCardExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_roster"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [atRiskExpanded, setAtRiskExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_roster_atrisk"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });

  const persist = (key, setter) => (v) => { setter(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
      {/* Accent bar */}
      <div className="h-0.5 w-full" style={{ backgroundColor: '#0202ff' }} />

      {/* Header */}
      <button
        onClick={() => persist("cl_collapse_team_roster", setCardExpanded)(!cardExpanded)}
        className="flex items-center gap-2.5 px-4 py-3.5 w-full text-left group"
      >
        <Users className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
        <p className="text-sm font-semibold text-slate-900 flex-1 group-hover:text-slate-700 transition-colors">
          Team · {count}
        </p>
        {cardExpanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {/* Content */}
      {cardExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {/* At-risk sub-card */}
          {atRisk.length > 0 && (
            <div className="bg-card border border-border rounded-2xl px-5 py-4">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => persist("cl_collapse_team_roster_atrisk", setAtRiskExpanded)(!atRiskExpanded)}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    At-risk signals · {atRisk.length}
                  </p>
                </div>
                {atRiskExpanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              </button>
              {atRiskExpanded && (
                <div className="mt-3 space-y-2">
                  {atRisk.map((r) => (
                    <div key={r.email} className="flex items-start gap-2 px-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{r.full_name || r.email}</p>
                        <p className="text-xs text-muted-foreground">{r.reasons.join(" · ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Roster / subtree sub-card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}