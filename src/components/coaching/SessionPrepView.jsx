import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Activity, Target, FileText, ClipboardCheck, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import CoachReflectionPanel from '@/components/coaching/CoachReflectionPanel';
import CoachMessageThread from '@/components/coaching/CoachMessageThread';

export default function SessionPrepView({ engagementId, onSelect }) {
  const { user } = useAuth();
  const [engagement, setEngagement] = useState(null);
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (engagementId) loadEngagement();
  }, [engagementId]);

  const loadEngagement = async () => {
    setLoading(true);
    try {
      const eng = await base44.entities.CoachingEngagement.get(engagementId);
      setEngagement(eng);
      if (eng?.coachee_email) {
        const res = await base44.functions.invoke('getCoacheeBrief', { coachee_email: eng.coachee_email });
        setBrief(res?.data?.brief || res?.brief);
      }
    } catch (e) {
      console.error('Error loading engagement:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!engagementId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Select a coachee from My Coachees to view their session prep brief.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Engagement not found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Engagement header */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{engagement.title}</h2>
              <p className="text-sm text-muted-foreground">{engagement.coachee_email}</p>
            </div>
            <Badge variant="outline">{engagement.status}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Prep brief sections */}
      {brief && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Pulse */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0202ff]" /> Recent Pulse
              </CardTitle>
            </CardHeader>
            <CardContent>
              {brief.pulse ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data points (14d)</span>
                    <span className="font-medium">{brief.pulse.data_points}</span>
                  </div>
                  {[
                    ['Energy', brief.pulse.avg_energy],
                    ['Confidence', brief.pulse.avg_confidence],
                    ['Load', brief.pulse.avg_load],
                    ['Growth', brief.pulse.avg_growth],
                  ].map(([label, val]) => val != null && (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{val}/5</span>
                    </div>
                  ))}
                  {brief.trends && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {['energy_trend', 'confidence_trend', 'resilience_trend'].map(k => brief.trends[k] && brief.trends[k] !== 'insufficient_data' && (
                        <Badge key={k} variant="outline" className="text-xs">
                          {k.replace('_trend', '')}: {brief.trends[k]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent check-in data.</p>
              )}
            </CardContent>
          </Card>

          {/* Goals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-[#0202ff]" /> Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {brief.goals?.length > 0 ? (
                <div className="space-y-2">
                  {brief.goals.map(g => (
                    <div key={g.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{g.title}</span>
                      <Badge variant="outline" className="text-xs ml-2">{g.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active goals.</p>
              )}
            </CardContent>
          </Card>

          {/* Decisions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0202ff]" /> Recent Decisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {brief.decisions?.length > 0 ? (
                <div className="space-y-2">
                  {brief.decisions.map(d => (
                    <div key={d.id} className="text-sm">
                      <p className="truncate text-foreground">{d.decision_text}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(d.created_date), 'MMM d')}
                        </span>
                        {d.confidence && (
                          <Badge variant="outline" className="text-xs">{d.confidence} confidence</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent decisions logged.</p>
              )}
            </CardContent>
          </Card>

          {/* Last Session */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#0202ff]" /> Last Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              {brief.last_session ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{brief.last_session.title || 'Session'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(brief.last_session.scheduled_date), 'MMM d, yyyy')}
                  </p>
                  {brief.last_session.session_notes && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {brief.last_session.session_notes}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {brief.last_session.progress_rating && (
                      <Badge variant="outline" className="text-xs">
                        Progress: {brief.last_session.progress_rating}/5
                      </Badge>
                    )}
                    {brief.last_session.engagement_rating && (
                      <Badge variant="outline" className="text-xs">
                        Engagement: {brief.last_session.engagement_rating}/5
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confidential notes */}
      <CoachReflectionPanel engagementId={engagementId} coachEmail={user?.email} />

      {/* Message thread */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Message Coachee
        </h3>
        <CoachMessageThread engagementId={engagementId} coacheeEmail={engagement.coachee_email} />
      </div>
    </div>
  );
}