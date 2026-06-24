/**
 * DecisionQualityAnalytics — Patterns dashboard showing manager's audit patterns
 * Links to competency development opportunities
 * Route: /decision-analytics
 */
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Brain, TrendingUp, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

function PatternCard({ title, description, metric, competencies, status }) {
  const statusColor = {
    gap: 'bg-amber-50 border-amber-200',
    strength: 'bg-emerald-50 border-emerald-200',
  }[status];

  const Icon = status === 'gap' ? AlertCircle : CheckCircle;

  return (
    <Card className={`border-2 ${statusColor}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-2">
          <Icon className={`w-5 h-5 flex-shrink-0 ${status === 'gap' ? 'text-amber-600' : 'text-emerald-600'}`} />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <div className="text-lg font-bold text-foreground">{metric}</div>
        {competencies && competencies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {competencies.map(comp => (
              <Badge key={comp} variant="outline" className="text-xs">
                {comp}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DecisionQualityAnalytics() {
  const { user } = useAuth();

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['dq-analytics', user?.email],
    queryFn: async () => {
      const results = await base44.entities.DecisionJournal.filter(
        { user_email: user.email },
        '-created_date',
        50
      );
      return results;
    },
    enabled: !!user?.email,
  });

  // Compute patterns
  const patterns = {
    totalDecisions: decisions.length,
    completedDecisions: decisions.filter(d => d.status === 'completed').length,
    avgDQI: decisions.length > 0 
      ? (decisions.reduce((sum, d) => sum + (d.dqi_completeness || 0), 0) / decisions.length).toFixed(1)
      : 0,
    
    // Gap patterns
    lacksAlternatives: decisions.filter(d => !d.structured_alternatives || d.structured_alternatives.length < 2).length,
    lacksExplicitTradeoffs: decisions.filter(d => !d.primary_value || !d.tradeoffs_accepted || d.tradeoffs_accepted.length === 0).length,
    lacksPremortem: decisions.filter(d => !d.failure_mode).length,
    
    // Strength patterns
    strongFraming: decisions.filter(d => d.decision_text && d.decision_scope).length,
    strongCommitment: decisions.filter(d => d.next_step && d.review_trigger).length,
    
    // Review discipline
    reviewsCompleted: decisions.filter(d => d.status === 'completed' && d.process_quality_still_sound !== undefined).length,
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
        <h1 className="text-2xl font-bold text-foreground">Decision Quality Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Your audit patterns and development opportunities</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total Decisions</p>
            <p className="text-2xl font-bold text-foreground">{patterns.totalDecisions}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Completed Reviews</p>
            <p className="text-2xl font-bold text-foreground">{patterns.completedDecisions}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Avg DQI</p>
            <p className="text-2xl font-bold text-foreground">{patterns.avgDQI}/5</p>
          </CardContent>
        </Card>
      </div>

      {/* Development Gaps */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-foreground">Development Opportunities</h2>
        </div>
        
        <PatternCard
          title="Limited Alternatives"
          description={`${patterns.lacksAlternatives} decisions without 2+ distinct alternatives documented`}
          metric={`${patterns.lacksAlternatives} of ${patterns.totalDecisions}`}
          competencies={['Decision Making', 'Strategic Thinking']}
          status="gap"
        />
        
        <PatternCard
          title="Hidden Trade-offs"
          description={`${patterns.lacksExplicitTradeoffs} decisions with unclear or undocumented trade-offs`}
          metric={`${patterns.lacksExplicitTradeoffs} of ${patterns.totalDecisions}`}
          competencies={['Judgment', 'Resource Management']}
          status="gap"
        />
        
        <PatternCard
          title="Weak Pre-mortem Analysis"
          description={`${patterns.lacksPremortem} decisions without documented failure modes`}
          metric={`${patterns.lacksPremortem} of ${patterns.totalDecisions}`}
          competencies={['Problem Solving', 'Risk Awareness']}
          status="gap"
        />
      </div>

      {/* Strengths */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-foreground">Decision Strengths</h2>
        </div>
        
        <PatternCard
          title="Strong Framing"
          description="Clear decision scope and boundaries defined"
          metric={`${patterns.strongFraming} of ${patterns.totalDecisions}`}
          status="strength"
        />
        
        <PatternCard
          title="Execution Focus"
          description="Clear next steps and review triggers documented"
          metric={`${patterns.strongCommitment} of ${patterns.totalDecisions}`}
          competencies={['Execution Discipline', 'Accountability']}
          status="strength"
        />
      </div>

      {/* Review Discipline */}
      {patterns.completedDecisions > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-foreground">Review Discipline</h2>
          </div>
          
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <p className="text-sm font-semibold text-blue-900">
                {patterns.reviewsCompleted} of {patterns.completedDecisions} reviews evaluated for process quality
              </p>
              <p className="text-xs text-blue-700 mt-2">
                High review discipline shows you're learning from decisions, not just outcomes.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Call to Action */}
      <Card className="border-2 border-[#0202ff]/20 bg-[#0202ff]/5">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start gap-2">
            <Brain className="w-5 h-5 text-[#0202ff] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Next Steps</p>
              <p className="text-xs text-muted-foreground mt-1">
                Review your development opportunities above. Each one links to a specific decision audit step.
              </p>
              <Link 
                to="/decision-journal"
                className="text-xs font-medium text-[#0202ff] hover:text-[#0101dd] mt-2 inline-block"
              >
                → View Decision Journal
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}