import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  terminated: 'bg-red-100 text-red-700',
};

const RISK_STYLES = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const ENGAGEMENT_TYPE_LABELS = {
  '1on1_coaching': '1:1 Coaching',
  'team_effectiveness': 'Team Effectiveness',
  'leadership_development': 'Leadership Development',
  'career_coaching': 'Career Coaching',
  'performance_improvement': 'Performance Improvement',
  'executive_coaching': 'Executive Coaching',
};

export default function MyCoacheesView({ onSelect }) {
  const { user } = useAuth();
  const [engagements, setEngagements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) loadData();
  }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eng, sess] = await Promise.all([
        base44.entities.CoachingEngagement.filter({ coach_email: user.email }, '-created_date'),
        base44.entities.CoachingSession.filter({ coach_email: user.email }, '-scheduled_date'),
      ]);
      setEngagements(eng);
      setSessions(sess);
    } catch (e) {
      console.error('Error loading coachees:', e);
    } finally {
      setLoading(false);
    }
  };

  const getNextSession = (engagementId) => {
    return sessions.find(s =>
      s.engagement_id === engagementId &&
      s.status === 'scheduled' &&
      new Date(s.scheduled_date) > new Date()
    );
  };

  const getOverdueActions = (engagementId) => {
    const engSessions = sessions.filter(s => s.engagement_id === engagementId);
    let count = 0;
    engSessions.forEach(s => {
      (s.action_items || []).forEach(a => {
        if (a.status === 'pending' || a.status === 'in_progress') {
          if (a.due_date && new Date(a.due_date) < new Date()) count++;
        }
      });
    });
    return count;
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
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No coaching engagements yet. Create one from the Development Manager to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {engagements.map(eng => {
        const nextSession = getNextSession(eng.id);
        const overdue = getOverdueActions(eng.id);
        return (
          <button
            key={eng.id}
            onClick={() => onSelect(eng.id, 'prep')}
            className="w-full text-left"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground truncate">
                        {eng.coachee_email || 'Team engagement'}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {ENGAGEMENT_TYPE_LABELS[eng.engagement_type] || eng.engagement_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{eng.title}</p>
                    {nextSession && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Next: {format(new Date(nextSession.scheduled_date), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs ${STATUS_STYLES[eng.status] || STATUS_STYLES.pending}`}>
                      {eng.status}
                    </Badge>
                    {eng.risk_level && eng.risk_level !== 'low' && (
                      <Badge className={`text-xs ${RISK_STYLES[eng.risk_level]}`}>
                        {eng.risk_level} risk
                      </Badge>
                    )}
                    {overdue > 0 && (
                      <Badge className="text-xs bg-red-100 text-red-700">
                        {overdue} overdue
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}