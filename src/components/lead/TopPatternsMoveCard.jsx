/**
 * TopPatternsMoveCard — Consolidated "Top 3 Patterns + best next move" surface.
 *
 * Replaces the separate TopPatternCard + NextMoveCard on /today.
 * Synthesizes leadership patterns across the user's entire flow of work:
 * in-app signals plus connected external systems (Outlook, Google Calendar,
 * HubSpot) and simulated demo patterns for unconnected tools (Microsoft Viva,
 * LMS, HRIS, watchdog).
 *
 * Each pattern shows source badges + a compact cross-tool evidence trail.
 * One highlighted "best next move" row below the list, selected as the
 * highest-impact action across ALL three patterns.
 */
import React, { useState } from "react";
import { AlertTriangle, Users, Zap, ArrowRight, Brain, CheckCircle2, BookmarkCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
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

const SOURCE_BADGE_STYLES = {
  'in-app':          'bg-slate-100 text-slate-600',
  'outlook':         'bg-blue-100 text-blue-700',
  'google-calendar': 'bg-green-100 text-green-700',
  'hubspot':         'bg-orange-100 text-orange-700',
  'microsoft-viva':  'bg-purple-100 text-purple-700',
  'lms':             'bg-indigo-100 text-indigo-700',
  'hris':            'bg-teal-100 text-teal-700',
  'watchdog':        'bg-rose-100 text-rose-700',
};

function SourceBadge({ source, sourceLabel }) {
  const style = SOURCE_BADGE_STYLES[source] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${style}`}>
      {sourceLabel}
    </span>
  );
}

function PatternRow({ pattern, rank, onOpenDetail }) {
  const style = BUCKET_STYLES[pattern.bucket] || BUCKET_STYLES['Execution'];
  const Icon = style.icon;
  const isSimulated = pattern.isSimulated;

  return (
    <button
      onClick={onOpenDetail}
      className={`w-full text-left p-3 rounded-xl transition-colors hover:bg-slate-50 ${isSimulated ? 'border border-dashed border-slate-300' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-[10px] font-bold text-slate-400 mt-0.5 flex-shrink-0">#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <SourceBadge source={pattern.source} sourceLabel={pattern.sourceLabel} />
            {isSimulated && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-slate-200 text-slate-500">
                <Sparkles className="w-2 h-2" /> Preview
              </span>
            )}
            <Badge variant="outline" className={`text-[8px] px-1 py-0 border ${STATUS_STYLES[pattern.status] || ''}`}>
              {pattern.status}
            </Badge>
          </div>
          <p className="text-xs font-bold text-slate-900 leading-tight">{pattern.name}</p>
          <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-1">{pattern.tagline}</p>
          {pattern.evidence?.length > 0 && (
            <p className="text-[9px] text-slate-400 leading-snug mt-1 line-clamp-1">
              {pattern.evidence.slice(0, 2).join(' · ')}
            </p>
          )}
        </div>
        <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function BestMoveRow({ move, onAtreus, onCommit, committed, done, onDone }) {
  const handleAtreus = async () => {
    await onCommit();
    onAtreus(move.atreusMsg);
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 py-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <p className="text-sm font-medium text-slate-700">Done. That's noted.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#0202ff]/5 to-white rounded-xl px-4 py-3.5 border border-[#0202ff]/10">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
          <Brain className="w-3 h-3 text-white" />
        </div>
        <p className="text-[10px] font-semibold text-[#0202ff] uppercase tracking-wider">Best next move</p>
        {move.sourceAttribution && (
          <span className="text-[9px] text-slate-400 ml-auto">{move.sourceAttribution}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-900 leading-snug">{move.move}</p>
      <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{move.reason}</p>
      {committed && (
        <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
          <BookmarkCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
          <p className="text-[9px] text-emerald-700 font-medium">Saved as a commitment</p>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {move.atreus ? (
          <Button size="sm" className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8" onClick={handleAtreus}>
            <Brain className="w-3 h-3 mr-1.5" /> {move.cta}
          </Button>
        ) : (
          <Link to={move.link} className="flex-1" onClick={onCommit}>
            <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8">
              {move.cta} <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          </Link>
        )}
        <Button size="sm" variant="outline" className="text-xs h-8 text-slate-500" onClick={onDone}>
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Done
        </Button>
      </div>
    </div>
  );
}

export default function TopPatternsMoveCard({ crossToolData, onOpenAtreus, onDecisionCommitted, pendingDecisions = [] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPattern, setDrawerPattern] = useState(null);
  const [autoOpenDecision, setAutoOpenDecision] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [moveDone, setMoveDone] = useState(false);
  const { user } = useAuth();

  if (!crossToolData || !crossToolData.topPatterns?.length) return null;

  const { topPatterns, bestMove, connectedSources, simulatedSources } = crossToolData;

  const saveCommitment = async () => {
    if (committed) return;
    try {
      await base44.entities.Goal.create({
        user_email: user.email,
        created_by: user.email,
        title: bestMove.move,
        description: bestMove.reason,
        status: 'active',
        goal_type: 'behavioral_commitment',
        source: 'next_move',
        progress: 0,
      });
      setCommitted(true);
    } catch {
      // non-blocking
    }
  };

  const handleOpenDetail = (pattern) => {
    // Convert the cross-tool signal back to a pattern shape the drawer understands
    setDrawerPattern({
      id: pattern.id,
      name: pattern.name,
      bucket: pattern.bucket,
      status: pattern.status,
      tagline: pattern.tagline,
      evidence: pattern.evidence,
      whatsAtStake: pattern.tagline,
      cta: pattern.suggestedMove?.move || 'Take action',
      ctaType: 'practice',
    });
    setAutoOpenDecision(true);
    setDrawerOpen(true);
  };

  return (
    <React.Fragment>
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Top 3 Patterns</p>
            {(connectedSources.length > 0 || simulatedSources.length > 0) && (
              <span className="text-[9px] text-slate-400">
                {connectedSources.length > 0 && `${connectedSources.length} connected`}
                {connectedSources.length > 0 && simulatedSources.length > 0 && ' · '}
                {simulatedSources.length > 0 && `${simulatedSources.length} preview`}
              </span>
            )}
          </div>
        </div>

        {/* Pattern rows */}
        <div className="space-y-1.5">
          {topPatterns.map((pattern, i) => (
            <PatternRow key={pattern.id} pattern={pattern} rank={i + 1} onOpenDetail={() => handleOpenDetail(pattern)} />
          ))}
        </div>

        {/* Best next move */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <BestMoveRow
            move={bestMove}
            onAtreus={onOpenAtreus}
            onCommit={saveCommitment}
            committed={committed}
            done={moveDone}
            onDone={() => setMoveDone(true)}
          />
        </div>

        {/* Simulated sources hint */}
        {simulatedSources.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <Sparkles className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <p className="text-[9px] text-slate-500 leading-snug">
              Connect {simulatedSources.join(', ')} to unlock cross-tool patterns from your full stack.
            </p>
          </div>
        )}
      </div>

      {/* Pattern detail drawer */}
      {drawerPattern && (
        <PatternDetailDrawer
          pattern={drawerPattern}
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setAutoOpenDecision(false); }}
          onDecisionSaved={async () => { await onDecisionCommitted?.(); }}
          onOpenAtreus={(msg, context) => {
            const enrichedContext = context ? { ...context } : {};
            if (!enrichedContext.pattern_name) enrichedContext.pattern_name = drawerPattern.name;
            if (!enrichedContext.pattern_bucket) enrichedContext.pattern_bucket = drawerPattern.bucket;
            onOpenAtreus?.(msg, enrichedContext);
          }}
          autoOpenDecision={autoOpenDecision}
          patternDecisions={pendingDecisions.filter(d => d.pattern_name === drawerPattern.name).slice(0, 3)}
        />
      )}
    </React.Fragment>
  );
}