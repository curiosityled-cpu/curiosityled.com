import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Target, CheckCircle2 } from 'lucide-react';

export default function EngagementOutcomesView() {
  const [engagements, setEngagements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eng, sess] = await Promise.all([
        base44.entities.CoachingEngagement.filter({}, '-created_date'),
        base44.entities.CoachingSession.filter({ status: 'completed' }, '-scheduled_date'),
      ]);
      setEngagements(eng);
      setSessions(sess);
    } catch (e) {
      console.error('Error loading outcomes:', e);
    } finally {
      setLoading(false);
    }
  };

  const getEngagementOutcomes = (engagementId) => {
    const engSessions = sessions.filter(s => s.engagement_id === engagementId);
    const total = engSessions.length;
    let actionItems = 0;
    let completedActions = 0;
    engSessions.forEach(s => {
      (s.action_items || []).forEach(a => {
        actionItems++;
        if (a.status === 'completed') completedActions++;
      });
    });
    const avgProgress = total > 0
      ? Math.round(engSessions.reduce((sum, s) => sum + (s.progress_rating || 0), 0) / total * 20)
      : null;
    const avgEngagement = total > 0
      ? Math.round(engSessions.reduce((sum, s) => sum + (s.engagement_rating || 0), 0) / total * 20)
      : null;
    const followThrough = actionItems > 0 ? Math.round((completedActions / actionItems) * 100) : null;
    return { total, avgProgress, avgEngagement, followThrough, completedActions, actionItems };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (engagements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No engagements to measure yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {engagements.map(eng => {
        const o = getEngagementOutcomes(eng.id);
        return (
          <Card key={eng.id}>
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground">{eng.title}</p>
                  <p className="text-xs text-muted-foreground">{eng.coachee_email}</p>
                </div>
                <Badge variant="outline">{eng.status}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric
                  icon={CheckCircle2}
                  label="Sessions"
                  value={o.total}
                  sub="completed"
                />
                <Metric
                  icon={TrendingUp}
                  label="Avg Progress"
                  value={o.avgProgress != null ? `${o.avgProgress}%` : '—'}
                  sub={o.avgProgress != null ? 'across sessions' : 'no ratings'}
                />
                <Metric
                  icon={Target}
                  label="Engagement"
                  value={o.avgEngagement != null ? `${o.avgEngagement}%` : '—'}
                  sub={o.avgEngagement != null ? 'across sessions' : 'no ratings'}
                />
                <Metric
                  icon={CheckCircle2}
                  label="Follow-through"
                  value={o.followThrough != null ? `${o.followThrough}%` : '—'}
                  sub={`${o.completedActions}/${o.actionItems} actions`}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <span className="text-lg font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}