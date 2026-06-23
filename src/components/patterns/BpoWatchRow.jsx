import React, { useState } from "react";
import { AlertTriangle, Users, Zap, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import PatternDetailDrawer from "./PatternDetailDrawer";

const BUCKET_ICON = {
  'Operational Risk': AlertTriangle,
  'People Risk': Users,
  'Execution': Zap,
};

const STATUS_STYLES = {
  Emerging:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  Active:     'bg-orange-100 text-orange-800 border-orange-200',
  Persistent: 'bg-red-100 text-red-800 border-red-200',
};

const BUCKET_DOT = {
  'Operational Risk': 'bg-red-400',
  'People Risk':      'bg-amber-400',
  'Execution':        'bg-blue-400',
};

function WatchItem({ pattern, onOpenAtreus }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const Icon = BUCKET_ICON[pattern.bucket] || Zap;
  const dot = BUCKET_DOT[pattern.bucket] || 'bg-gray-400';

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-800 truncate">{pattern.name}</p>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border flex-shrink-0 ${STATUS_STYLES[pattern.status] || ''}`}>
              {pattern.status}
            </Badge>
          </div>
          {pattern.evidence[0] && (
            <p className="text-[11px] text-gray-500 truncate mt-0.5">{pattern.evidence[0]}</p>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
      </button>

      <PatternDetailDrawer
        pattern={pattern}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenAtreus={onOpenAtreus}
      />
    </>
  );
}

export default function BpoWatchRow({ patterns, onOpenAtreus }) {
  const watchPatterns = (patterns || []).slice(1, 3);
  if (watchPatterns.length === 0) return null;

  return (
    <Card className="shadow-sm border border-border bg-card rounded-2xl">
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Also Watch
        </p>
        <div className="divide-y divide-border -mx-1">
          {watchPatterns.map(p => (
            <WatchItem key={p.id} pattern={p} onOpenAtreus={onOpenAtreus} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}