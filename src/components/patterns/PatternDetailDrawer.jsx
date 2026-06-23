/**
 * PatternDetailDrawer — Full elaboration panel for a BPO pattern.
 * Shows: narrative, what good looks like, what to watch, expanded evidence,
 * AI-generated decision recommendations, Ask Atreus, Log Decision link.
 */
import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Users, Zap, TrendingDown, Brain, FileText,
  CheckCircle2, Eye, Lightbulb, Loader2, ChevronDown, ChevronUp, ArrowRight
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

const BUCKET_STYLES = {
  'Operational Risk': { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   icon: AlertTriangle },
  'People Risk':      { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700', icon: Users },
  'Execution':        { bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-700',  icon: Zap },
};

const STATUS_STYLES = {
  Emerging:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  Active:     'bg-orange-100 text-orange-800 border-orange-200',
  Persistent: 'bg-red-100 text-red-800 border-red-200',
};

// Static BPO-context elaborations keyed by pattern name
const PATTERN_ELABORATIONS = {
  'Performance Avoidance': {
    what_it_means: 'You\'re delaying or softening difficult performance conversations — which in BPO environments compounds quickly. When agents don\'t receive clear, timely feedback, they can\'t course-correct, and performance metrics drift.',
    what_good_looks_like: 'Structured weekly 1:1s with specific metric feedback. Clear documentation of improvement expectations. Timely conversations within 48 hours of a missed target.',
    what_to_watch: ['Team AHT or CSAT drifting without correction', 'Agents repeating the same errors across weeks', 'Increasing escalations to your level instead of being handled directly'],
  },
  'Reactive Leadership': {
    what_it_means: 'Your time is dominated by firefighting rather than proactive management. In BPO contexts, reactive managers often spend 60-70% of their time on escalations that could be pre-empted with weekly pattern reviews.',
    what_good_looks_like: 'Scheduled "pattern blocks" each week to review metrics before issues surface. Clear escalation protocols so your team handles tier-1 issues without you.',
    what_to_watch: ['Meeting count climbing without declining after', 'No blocked focus time on calendar', 'You\'re the first call when something breaks'],
  },
  'Overload/Overcontrol': {
    what_it_means: 'High operational load is compressing your strategic bandwidth. When managers operate in this state for 2+ weeks, decision quality degrades and the team becomes dependent on your direct involvement.',
    what_good_looks_like: 'Clear delegation of recurring decisions. Defined criteria for what requires your sign-off. Energy scores averaging 3+ on check-ins.',
    what_to_watch: ['Consecutive load scores of 4-5', 'Team not making decisions without you', 'Skipping growth-oriented activities entirely'],
  },
  'Accountability Gap': {
    what_it_means: 'Goal completion rates and follow-through are lower than expected. In BPO environments this often signals unclear ownership, competing priorities, or a team that\'s learned to wait out deadlines.',
    what_good_looks_like: 'Goals with named owners, specific success criteria, and weekly progress check-ins. A culture where missed milestones trigger a conversation, not silence.',
    what_to_watch: ['Goals with no activity for 7+ days', 'Same goals carried forward across weeks', 'Team members citing other priorities when questioned'],
  },
  'Attrition Risk Behavior': {
    what_it_means: 'Signals suggest team engagement or stability may be at risk. BPO attrition is expensive — typically 50-200% of annual salary per departing agent — and leading indicators appear 4-8 weeks before someone resigns.',
    what_good_looks_like: 'Regular 1:1s that go beyond performance to include career and wellbeing. Clear recognition practices. Visibility into who\'s disengaged before they disengage.',
    what_to_watch: ['Drop in recognition-related check-in notes', 'Longer response times to your messages', 'Agents going quiet in team settings they were previously engaged in'],
  },
  'Coaching Deficit': {
    what_it_means: 'Coaching frequency or quality has dropped below what\'s needed for your team\'s current performance level. In BPO, structured coaching directly correlates with AHT, QA scores, and CSAT improvements.',
    what_good_looks_like: '2+ formal coaching sessions per agent per month. Specific, behaviorally-grounded feedback tied to call recordings or metric snapshots. A coaching log that shows progression over time.',
    what_to_watch: ['No coaching sessions in 7+ days', 'QA scores plateauing or declining', 'Agents not self-correcting without direct instruction'],
  },
  'Metric Myopia': {
    what_it_means: 'You\'re focused on a narrow set of metrics while longer-cycle indicators (CSAT trends, agent development, quality scores) are drifting. Metric myopia in BPO creates short-term wins that mask structural underperformance.',
    what_good_looks_like: 'A balanced scorecard that\'s reviewed weekly — including both leading indicators (coaching done, escalations resolved) and lagging indicators (CSAT, AHT, attrition). ',
    what_to_watch: ['CSAT declining while AHT improves', 'Quality scores not trending alongside efficiency gains', 'Development goals going untouched while operational goals dominate'],
  },
};

export default function PatternDetailDrawer({ pattern, open, onClose, onOpenAtreus }) {
  const [aiDecision, setAiDecision] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  if (!pattern) return null;

  const style = BUCKET_STYLES[pattern.bucket] || BUCKET_STYLES['Execution'];
  const BucketIcon = style.icon;
  const elab = PATTERN_ELABORATIONS[pattern.name] || null;

  const generateDecisionSupport = async () => {
    if (aiDecision) return;
    setLoadingAi(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a BPO leadership coach. A manager has the following leadership pattern showing up in their data:

Pattern: ${pattern.name} (${pattern.bucket})
Status: ${pattern.status}
What's happening: ${pattern.tagline}
What's at stake: ${pattern.whatsAtStake}
Evidence signals: ${pattern.evidence.join('; ')}

Generate 3 specific, concrete decisions this manager could make THIS WEEK to address this pattern. Each decision should be:
- Actionable in the next 5 working days
- Specific to BPO operations
- Framed as a decision, not a task

Return a JSON object with this shape:
{
  "decisions": [
    { "decision": "string (the decision, starting with 'Decide to...' or 'Choose to...')", "rationale": "string (1 sentence why)", "effort": "low|medium|high" }
  ],
  "one_liner": "string (one bold framing sentence about what's really at stake here)"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            decisions: { type: 'array', items: { type: 'object', properties: { decision: { type: 'string' }, rationale: { type: 'string' }, effort: { type: 'string' } } } },
            one_liner: { type: 'string' }
          }
        }
      });
      setAiDecision(result);
    } catch (e) {
      console.error('Decision support error', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const effortColors = {
    low:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high:   'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto p-0">
        {/* Accent bar */}
        <div className={`h-1 ${pattern.status === 'Persistent' ? 'bg-red-500' : pattern.status === 'Active' ? 'bg-orange-400' : 'bg-yellow-400'}`} />

        <div className="px-5 pt-5 pb-8 space-y-5">
          {/* Header */}
          <SheetHeader className="pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${style.bg} border ${style.border}`}>
                  <BucketIcon className={`w-4 h-4 ${style.text}`} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">{pattern.bucket}</p>
                  <SheetTitle className="text-lg font-bold text-gray-900 leading-tight">{pattern.name}</SheetTitle>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 border flex-shrink-0 ${STATUS_STYLES[pattern.status] || ''}`}>
                {pattern.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 font-medium leading-snug mt-2">{pattern.tagline}</p>
          </SheetHeader>

          {/* Evidence — expandable */}
          <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setEvidenceExpanded(e => !e)}
            >
              <div className="flex items-center gap-2">
                <TrendingDown className={`w-3.5 h-3.5 ${style.text}`} />
                <p className="text-xs font-semibold text-gray-700">Evidence signals ({pattern.evidence.length})</p>
              </div>
              {evidenceExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {evidenceExpanded && (
              <div className="px-4 pb-3 space-y-2 border-t border-gray-100">
                {pattern.evidence.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 pt-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${style.text.replace('text-', 'bg-')} mt-1.5 flex-shrink-0`} />
                    <p className="text-xs text-gray-700 leading-relaxed">{e}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* What's at stake */}
          <div className="rounded-xl bg-white border border-gray-200 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">What's at stake</p>
            <p className="text-sm text-gray-800 leading-relaxed">{pattern.whatsAtStake}</p>
          </div>

          {/* BPO Context elaboration */}
          {elab && (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">What this means in BPO</p>
                <p className="text-xs text-slate-700 leading-relaxed">{elab.what_it_means}</p>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">What good looks like</p>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">{elab.what_good_looks_like}</p>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">What to watch for</p>
                </div>
                <div className="space-y-1.5">
                  {elab.what_to_watch.map((w, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800 leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KPI links */}
          {pattern.kpiLinks?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pattern.kpiLinks.map(kpi => (
                <span key={kpi} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[10px] font-medium text-gray-600">
                  {kpi}
                </span>
              ))}
            </div>
          )}

          {/* Decision Support section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#0202ff]" />
              <p className="text-sm font-semibold text-gray-900">Decision support</p>
            </div>

            {!aiDecision && !loadingAi && (
              <button
                onClick={generateDecisionSupport}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#0202ff]/30 bg-[#0202ff]/5 text-[#0202ff] text-sm font-medium hover:bg-[#0202ff]/10 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                What should I decide this week?
              </button>
            )}

            {loadingAi && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-[#0202ff]" />
                <p className="text-xs text-gray-500">Generating decision options…</p>
              </div>
            )}

            {aiDecision && (
              <div className="space-y-2">
                {aiDecision.one_liner && (
                  <div className="px-4 py-3 rounded-xl bg-[#0202ff]/5 border border-[#0202ff]/15">
                    <p className="text-xs font-semibold text-[#0202ff] leading-relaxed">{aiDecision.one_liner}</p>
                  </div>
                )}
                {(aiDecision.decisions || []).map((d, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900 leading-snug flex-1">{d.decision}</p>
                      {d.effort && (
                        <Badge variant="outline" className={`text-[9px] font-semibold px-1.5 py-0 flex-shrink-0 ${effortColors[d.effort] || ''}`}>
                          {d.effort}
                        </Badge>
                      )}
                    </div>
                    {d.rationale && <p className="text-[11px] text-gray-500 leading-relaxed">{d.rationale}</p>}
                  </div>
                ))}
                <button
                  onClick={() => setAiDecision(null)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Regenerate
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1 border-t border-border">
            <Button
              onClick={() => {
                onClose();
                if (onOpenAtreus) onOpenAtreus(`I'm looking at my ${pattern.name} pattern. ${pattern.tagline} Help me think through what to do about it.`);
              }}
              className="w-full text-white text-sm font-semibold gap-2"
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0101dd')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0202ff')}
            >
              <Brain className="w-3.5 h-3.5" />
              Ask Atreus about this pattern
            </Button>

            <Link to="/decision-journal" onClick={onClose}>
              <Button variant="outline" className="w-full text-sm gap-2 border-[#0202ff]/30 text-[#0202ff] hover:bg-blue-50">
                <FileText className="w-3.5 h-3.5" />
                Log a decision in your journal
                <ArrowRight className="w-3 h-3 ml-auto" />
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}