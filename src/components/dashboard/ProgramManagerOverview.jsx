import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Calendar, Award, BookOpen, Target, 
  AlertTriangle, CheckCircle, Clock, ArrowRight,
  GraduationCap, MessageSquare, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProgramManagerOverview() {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    programs: 0,
    cohorts: 0,
    classes: 0,
    upcomingClasses: 0,
    engagements: 0,
    activeEngagements: 0,
    sessions: 0,
    upcomingSessions: 0,
    certificates: 0,
    certificatesThisMonth: 0,
    atRiskEngagements: 0,
    totalParticipants: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingItems, setUpcomingItems] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [programs, cohorts, classes, engagements, sessions, certificates] = await Promise.all([
        base44.entities.Program.filter({ manager_emails: { $in: [user.email] } }),
        base44.entities.Cohort.filter({ 
          $or: [
            { facilitator_emails: { $in: [user.email] } },
            { primary_facilitator_email: user.email },
            { manager_email: user.email }
          ]
        }),
        base44.entities.Class.filter({ facilitator_email: user.email }),
        base44.entities.CoachingEngagement.filter({ coach_email: user.email }),
        base44.entities.CoachingSession.filter({ coach_email: user.email }),
        base44.entities.Certificate.filter({ issued_by_email: user.email })
      ]);

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const nextWeek = addDays(now, 7);

      const upcomingClasses = classes.filter(c => 
        c.scheduled_date && isAfter(new Date(c.scheduled_date), now) && isBefore(new Date(c.scheduled_date), nextWeek)
      );
      const upcomingSessions = sessions.filter(s => 
        s.scheduled_date && isAfter(new Date(s.scheduled_date), now) && ['scheduled', 'confirmed'].includes(s.status)
      );
      const certificatesThisMonth = certificates.filter(c => {
        const issued = new Date(c.issued_date);
        return issued.getMonth() === thisMonth && issued.getFullYear() === thisYear;
      });
      const atRiskEngagements = engagements.filter(e => e.risk_level === 'high');
      const totalParticipants = new Set([
        ...programs.flatMap(p => p.participant_emails || []),
        ...cohorts.flatMap(c => c.participant_emails || []),
        ...classes.flatMap(c => c.enrolled_emails || [])
      ]).size;

      setStats({
        programs: programs.length,
        cohorts: cohorts.length,
        classes: classes.length,
        upcomingClasses: upcomingClasses.length,
        engagements: engagements.length,
        activeEngagements: engagements.filter(e => e.status === 'active').length,
        sessions: sessions.length,
        upcomingSessions: upcomingSessions.length,
        certificates: certificates.length,
        certificatesThisMonth: certificatesThisMonth.length,
        atRiskEngagements: atRiskEngagements.length,
        totalParticipants
      });

      const upcoming = [
        ...upcomingClasses.map(c => ({
          type: 'class',
          title: c.title,
          date: c.scheduled_date,
          icon: GraduationCap,
          color: 'blue'
        })),
        ...upcomingSessions.slice(0, 5).map(s => ({
          type: 'session',
          title: s.title || 'Coaching Session',
          subtitle: s.coachee_email,
          date: s.scheduled_date,
          icon: MessageSquare,
          color: 'purple'
        }))
      ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

      setUpcomingItems(upcoming);

      const activity = [
        ...certificates.slice(0, 3).map(c => ({
          type: 'certificate',
          title: `Certificate issued to ${c.user_name || c.user_email}`,
          date: c.issued_date,
          icon: Award,
          color: 'amber'
        })),
        ...sessions.filter(s => s.status === 'completed').slice(0, 3).map(s => ({
          type: 'session',
          title: `Completed session with ${s.coachee_email}`,
          date: s.actual_end_time || s.scheduled_date,
          icon: CheckCircle,
          color: 'green'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      setRecentActivity(activity);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, subValue, color, onClick }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={onClick ? "cursor-pointer" : ""}
      onClick={onClick}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
              <Icon className={`w-6 h-6 text-${color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-gray-600">{label}</p>
              {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
          icon={BookOpen} 
          label="Programs" 
          value={stats.programs}
          color="blue"
        />
        <StatCard 
          icon={Users} 
          label="Cohorts" 
          value={stats.cohorts}
          color="indigo"
        />
        <StatCard 
          icon={GraduationCap} 
          label="Classes" 
          value={stats.classes}
          subValue={`${stats.upcomingClasses} upcoming`}
          color="purple"
        />
        <StatCard 
          icon={MessageSquare} 
          label="Engagements" 
          value={stats.engagements}
          subValue={`${stats.activeEngagements} active`}
          color="green"
        />
        <StatCard 
          icon={Award} 
          label="Certificates" 
          value={stats.certificates}
          subValue={`${stats.certificatesThisMonth} this month`}
          color="amber"
        />
        <StatCard 
          icon={Target} 
          label="Participants" 
          value={stats.totalParticipants}
          color="cyan"
        />
      </div>

      {/* Alert: At-Risk Engagements */}
      {stats.atRiskEngagements > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-700">
                  {stats.atRiskEngagements} coaching engagement{stats.atRiskEngagements > 1 ? 's' : ''} flagged as at-risk
                </p>
                <p className="text-sm text-gray-600">Review and take action to support these coachees</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" asChild>
                <Link to={createPageUrl('ProgramManagerPortal')}>
                  Review <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No upcoming items</p>
            ) : (
              <div className="space-y-3">
                {upcomingItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full bg-${item.color}-100 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${item.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        {item.subtitle && <p className="text-sm text-gray-500">{item.subtitle}</p>}
                        <p className="text-xs text-gray-400">
                          {format(new Date(item.date), 'EEE, MMM d @ h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full bg-${item.color}-100 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${item.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(item.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link to={createPageUrl('ExperienceManagement') + '#programs'}>
                <GraduationCap className="w-6 h-6 mb-2" />
                Manage Programs
              </Link>
            </Button>
            {hasPermission('coaching.sessions.schedule') && (
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to={createPageUrl('ExperienceManagement') + '?subtab=coaching#programs'}>
                  <MessageSquare className="w-6 h-6 mb-2" />
                  Coaching Sessions
                </Link>
              </Button>
            )}
            {hasPermission('certificates.issue') && (
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to={createPageUrl('ExperienceManagement') + '#requests'}>
                  <Target className="w-6 h-6 mb-2" />
                  View Requests
                </Link>
              </Button>
            )}
            {hasPermission('journeys.create') && (
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to={createPageUrl('JourneyBuilder')}>
                  <BookOpen className="w-6 h-6 mb-2" />
                  Create Journey
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}