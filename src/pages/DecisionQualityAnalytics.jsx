/**
 * DecisionQualityAnalytics — Uses real linked_competencies from DQ audits
 * to surface development opportunities and allow creating Goals.
 * Route: /decision-analytics
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Brain, TrendingUp, AlertCircle, CheckCircle, Target, Plus, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// Friendly label for each DQ gap dimension
const GAP_LABELS = {
  frame:        'Problem Framing',
  alternatives: 'Evaluating Alternatives',
  information:  'Evidence Quality',
  tradeoffs:    'Making Trade-offs Explicit',
  reasoning:    'Pre-Mortem / Logic Testing',
  commitment:   'Execution Commitment',
};

function CompetencyGapCard({ competencyName, competencyId, gapDimensions, decisionCount, onCreateGoal, isCreating }) {
  return (
    <Card className="border-2 border-amber-200 bg-amber-50">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">{competencyName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Surfaced in {decisionCount} decision audit{decisionCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 border-[#0202ff]/30 text-[#0202ff] flex-shrink-0"
            onClick={() => onCreateGoal(competencyId, competencyName)}
            disabled={isCreating}
          >
            <Plus className="w-3 h-3 mr-1" />
            {isCreating ? 'Adding…' : 'Add to Goals'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {gapDimensions.map(dim => (
            <Badge key={dim} variant="outline" className="text-[10px] border-amber-300 text-amber-700">
              {GAP_LABELS[dim] || dim}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StrengthCard({ title, description, metric, total }) {
  return (
    <Card className="border-2 border-emerald-200 bg-emerald-50">
      <CardContent className="pt-4 space-y-1">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <p className="text-lg font-bold text-emerald-700 pl-6">{metric} of {total}</p>
      </CardContent>
    </Card>
  );
}

export default function DecisionQualityAnalytics() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [creatingGoalFor, setCreatingGoalFor] = useState(null);

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['dq-analytics', user?.email],
    queryFn: () => base44.entities.DecisionJournal.filter(
      { user_email: user.email },
      '-created_date',
      100
    ),
    enabled: !!user?.email,
  });

  // Check which competency goals already exist for this user
  const { data: existingGoals = [] } = useQuery({
    queryKey: ['dq-goals', user?.email],
    queryFn: () => base44.entities.Goal.filter(
      { created_by: user.email, status: 'active' },
      '-created_date',
      50
    ),
    enabled: !!user?.email,
  });

  // Aggregate linked_competencies from all decisions that went through the audit
  const competencyGapMap = {}; // competency_id → { name, id, gapDimensions: Set, decisionCount }
  for (const d of decisions) {
    if (!d.linked_competencies || d.linked_competencies.length === 0) continue;
    for (const lc of d.linked_competencies) {
      const key = lc.competency_id;
      if (!competencyGapMap[key]) {
        competencyGapMap[key] = {
          id: lc.competency_id,
          name: lc.competency_name,
          gapDimensions: new Set(),
          decisionCount: 0,
        };
      }
      competencyGapMap[key].gapDimensions.add(lc.dq_gap);
      competencyGapMap[key].decisionCount++;
    }
  }

  // Sort by frequency
  const topCompetencyGaps = Object.values(competencyGapMap)
    .map(c => ({ ...c, gapDimensions: Array.from(c.gapDimensions) }))
    .sort((a, b) => b.decisionCount - a.decisionCount);

  const auditedDecisions = decisions.filter(d => d.dqi_completeness !== undefined && d.dqi_completeness > 0);
  const avgDQI = auditedDecisions.length > 0
    ? (auditedDecisions.reduce((sum, d) => sum + (d.dqi_completeness || 0), 0) / auditedDecisions.length).toFixed(1)
    : 0;

  const patterns = {
    total: decisions.length,
    audited: auditedDecisions.length,
    completed: decisions.filter(d => d.status === 'completed').length,
    avgDQI,
    strongFraming: decisions.filter(d => d.decision_text && d.decision_scope).length,
    strongCommitment: decisions.filter(d => d.next_step && d.review_trigger).length,
    withOutcome: decisions.filter(d => d.outcome).length,
    reviewsWithProcess: decisions.filter(d => d.process_quality_still_sound !== undefined).length,
  };

  const goalCompetencyIds = new Set(
    existingGoals.flatMap(g => g.linked_competency_ids || [])
  );

  const handleCreateGoal = async (competencyId, competencyName) => {
    setCreatingGoalFor(competencyId);
    try {
      // Use real ID if it looks like a DB ID (not a snake_case synthetic key)
      const isRealId = competencyId.length > 20; // DB IDs are long strings
      await base44.entities.Goal.create({
        title: `Develop ${competencyName} through deliberate decision practice`,
        description: `Identified as a recurring development opportunity across ${competencyGapMap[competencyId]?.decisionCount || 1} decision audit${(competencyGapMap[competencyId]?.decisionCount || 1) !== 1 ? 's' : ''}. Gaps: ${(competencyGapMap[competencyId]?.gapDimensions || []).map(g => GAP_LABELS[g] || g).join(', ')}.`,
        goal_type: 'standard',
        linked_competency_ids: isRealId ? [competencyId] : [],
        status: 'active',
        visibility: 'private',
      });
      queryClient.invalidateQueries({ queryKey: ['dq-goals', user?.email] });
      toast.success(`Goal created for ${competencyName}`);
    } catch {
      toast.error('Failed to create goal');
    } finally {
      setCreatingGoalFor(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/decision-journal" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3 h-3" /> Back to Decision Journal
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Decision Quality Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Audit patterns mapped to your leadership competency development</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Decisions', value: patterns.total },
          { label: 'Audited', value: patterns.audited },
          { label: 'Outcomes Logged', value: patterns.withOutcome },
          { label: 'Avg DQI', value: `${patterns.avgDQI}/5` },
        ].map(({ label, value }) => (
          <Card key={label} className="border border-border">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Competency gap section — driven by real linked_competencies data */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-foreground">Development Opportunities</h2>
          <Badge variant="outline" className="text-xs ml-auto">From audit data</Badge>
        </div>

        {topCompetencyGaps.length === 0 ? (
          <Card className="border border-dashed border-border">
            <CardContent className="py-8 text-center">
              <Target className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No audit data yet. Run a Decision Audit on any committed decision to generate competency insights.
              </p>
              <Link to="/decision-journal" className="text-xs text-[#0202ff] mt-2 inline-block hover:underline">
                → Go to Decision Journal
              </Link>
            </CardContent>
          </Card>
        ) : (
          topCompetencyGaps.map(gap => {
            const alreadyHasGoal = goalCompetencyIds.has(gap.id);
            return (
              <div key={gap.id} className="relative">
                <CompetencyGapCard
                  competencyName={gap.name}
                  competencyId={gap.id}
                  gapDimensions={gap.gapDimensions}
                  decisionCount={gap.decisionCount}
                  onCreateGoal={handleCreateGoal}
                  isCreating={creatingGoalFor === gap.id}
                />
                {alreadyHasGoal && (
                  <div className="absolute top-3 right-3">
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                      <CheckCircle className="w-2.5 h-2.5 mr-1" /> Goal active
                    </Badge>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Strengths */}
      {patterns.audited > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-foreground">Decision Strengths</h2>
          </div>
          {patterns.strongFraming > 0 && (
            <StrengthCard
              title="Strong Framing"
              description="Clear decision scope and boundaries defined"
              metric={patterns.strongFraming}
              total={patterns.total}
            />
          )}
          {patterns.strongCommitment > 0 && (
            <StrengthCard
              title="Execution Focus"
              description="Clear next steps and review triggers documented"
              metric={patterns.strongCommitment}
              total={patterns.total}
            />
          )}
        </div>
      )}

      {/* Review discipline */}
      {patterns.completed > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-foreground">Review Discipline</h2>
          </div>
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-4 space-y-1">
              <p className="text-sm font-semibold text-blue-900">
                {patterns.reviewsWithProcess} of {patterns.completed} reviews evaluated for process quality
              </p>
              <p className="text-xs text-blue-700">
                High review discipline signals you're learning from decisions, not just outcomes — this is a leading indicator of judgment development.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Link to Goals */}
      {topCompetencyGaps.length > 0 && (
        <Card className="border-2 border-[#0202ff]/20 bg-[#0202ff]/5">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start gap-2">
              <Brain className="w-5 h-5 text-[#0202ff] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">These gaps feed your development plan</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Goals you create here will appear in your Goals dashboard linked to the specific competency.
                  After 3+ audits, patterns become reliable enough to share with a coach or manager.
                </p>
                <Link
                  to="/my-performance"
                  className="text-xs font-medium text-[#0202ff] hover:text-[#0101dd] mt-2 inline-block"
                >
                  → View your Goals dashboard
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}