/**
 * LeadAlertsSection — Surfaces active patterns/risks from the Lead page
 * so Practice becomes the place to directly address them.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Users, Zap, ArrowRight, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import PatternDetailDrawer from "@/components/patterns/PatternDetailDrawer";

const BUCKET_STYLES = {
  'Operational Risk': { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900', text: 'text-red-700 dark:text-red-400', icon: AlertTriangle },
  'People Risk':      { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900', text: 'text-amber-700 dark:text-amber-400', icon: Users },
  'Execution':        { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900', text: 'text-blue-700 dark:text-blue-400', icon: Zap },
};

const STATUS_STYLES = {
  Emerging:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  Active:     'bg-orange-100 text-orange-800 border-orange-200',
  Persistent: 'bg-red-100 text-red-800 border-red-200',
};

export default function LeadAlertsSection({ patterns = [], onOpenAtreus }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const { openWithContext } = useAtreusChat();

  if (!patterns || patterns.length === 0) return null;

  const topPatterns = patterns.slice(0, 2);

  const openDrawer = (pattern) => {
    setSelectedPattern(pattern);
    setDrawerOpen(true);
  };

  const addressWithAtreus = (pattern) => {
    openWithContext({
      context: { pageType: 'practice', pattern_name: pattern.name, pattern_bucket: pattern.bucket },
      starterMessage: `I want to work on the "${pattern.name}" pattern that was flagged on my Lead page. Help me think through what to do about it right now.`,
    });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From Your Lead Page</p>
        <Link to="/today" className="text-[10px] text-[#0202ff] font-medium hover:underline">View all →</Link>
      </div>
      <p className="text-xs text-muted-foreground px-1 -mt-1">Patterns and risks the system is seeing right now — address them here.</p>

      <div className={`grid gap-2.5 ${topPatterns.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {topPatterns.map((pattern) => {
          const style = BUCKET_STYLES[pattern.bucket] || BUCKET_STYLES['Execution'];
          const Icon = style.icon;
          return (
            <div key={pattern.id} className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden flex flex-col`}>
              <div className={`h-0.5 ${pattern.status === 'Persistent' ? 'bg-red-500' : pattern.status === 'Active' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
              <div className="px-4 py-3 flex-1 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg bg-white/70 dark:bg-white/10 border ${style.border} flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${style.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${STATUS_STYLES[pattern.status] || ''}`}>
                        {pattern.status}
                      </Badge>
                      <span className="text-[10px] font-medium text-muted-foreground">{pattern.bucket}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground leading-tight">{pattern.name}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{pattern.tagline}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3 mt-auto pt-3">
                  <button
                    onClick={() => addressWithAtreus(pattern)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${style.border} ${style.text} hover:bg-white/60 dark:hover:bg-white/10 transition-colors`}
                  >
                    Address now
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => openDrawer(pattern)}
                    className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    Explore
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPattern && (
        <PatternDetailDrawer
          pattern={selectedPattern}
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelectedPattern(null); }}
          onOpenAtreus={(msg, context) => onOpenAtreus?.(msg, context)}
        />
      )}
    </div>
  );
}