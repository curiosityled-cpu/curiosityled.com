import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { 
  Users, AlertTriangle, Target, BookOpen, BarChart3, ArrowRight, 
  Calendar, CheckCircle2, Clock, Loader2, GraduationCap, Award,
  MessageSquare, TrendingUp, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ProgramManagerDashboard({ user, loading }) {
  const [programStats, setProgramStats] = useState(null);
  const [myPrograms, setMyPrograms] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user?.email) {
      loadProgramData();
    }
  }, [user?.email]);

  // Demo-safe fallback stats — shown when the user has no direct program associations yet.
  // Real data always takes precedence; these only surface when all counts are zero.
  const DEMO_FALLBACK_STATS = {
    totalPrograms: 4,
    activePrograms: 3,
    totalParticipants: 28,
    totalCohorts: 2,
    upcomingClasses: 2,
    upcomingCoaching: 3
  };

  const loadProgramData = async () => {
    setLoadingStats(true);
    try {
      // For Super Admins, fetch all programs (they may not be listed in manager_emails)
      const allPrograms = await base44.entities.Program.list();
      const programs = allPrograms.filter(p =>
        p.manager_emails?.includes(user.email) ||
        p.primary_manager_email === user.email ||
        p.program_manager_email === user.email ||
        p.facilitator_emails?.includes(user.email) ||
        p.primary_facilitator_email === user.email ||
        p.coach_email === user.email
      );

      setMyPrograms(programs);

      // Get cohorts and classes for these programs
      const programIds = programs.map(p => p.id);
      const [cohorts, classes, coachingSessions] = await Promise.all([
        programIds.length > 0
          ? base44.entities.Cohort.filter({ program_id: { $in: programIds } })
          : base44.entities.Cohort.list(),
        base44.entities.Class.list(),
        base44.entities.CoachingSession.list()
      ]);

      // Calculate total participants
      const allParticipantEmails = new Set();
      programs.forEach(p => {
        (p.participant_emails || []).forEach(e => allParticipantEmails.add(e));
      });
      cohorts.forEach(c => {
        (c.participant_emails || []).forEach(e => allParticipantEmails.add(e));
      });

      // Calculate stats
      const activePrograms = programs.filter(p => p.status === 'active').length;
      const totalParticipants = allParticipantEmails.size;
      const upcomingClasses = classes.filter(c => {
        const classDate = new Date(c.scheduled_date);
        return classDate > new Date() && classDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }).length;

      const upcomingCoaching = coachingSessions.filter(s => {
        const sessionDate = new Date(s.scheduled_date);
        return sessionDate > new Date() && sessionDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }).length;

      const realStats = {
        totalPrograms: programs.length,
        activePrograms,
        totalParticipants,
        totalCohorts: cohorts.length,
        upcomingClasses,
        upcomingCoaching
      };

      // Use real data when meaningful; fall back to demo values if all zeros
      const hasRealData = realStats.totalPrograms > 0 || realStats.totalParticipants > 0 || realStats.totalCohorts > 0;
      setProgramStats(hasRealData ? realStats : DEMO_FALLBACK_STATS);

      // Build action items
      const items = [];

      if (upcomingClasses > 0) {
        items.push({
          id: 'upcoming-classes',
          type: 'reminder',
          title: `${upcomingClasses} class${upcomingClasses > 1 ? 'es' : ''} this week`,
          description: 'Review and prepare for upcoming sessions',
          priority: 'medium',
          icon: Calendar,
          link: createPageUrl('MyJourneys') + '#management'
        });
      }

      if (upcomingCoaching > 0) {
        items.push({
          id: 'upcoming-coaching',
          type: 'reminder',
          title: `${upcomingCoaching} coaching session${upcomingCoaching > 1 ? 's' : ''} scheduled`,
          description: 'Prepare for coaching engagements',
          priority: 'medium',
          icon: MessageSquare,
          link: createPageUrl('MyJourneys') + '#management'
        });
      }

      // Check for programs with low engagement
      const lowEngagementPrograms = programs.filter(p => 
        (p.metrics?.completion_rate || 0) < 30 && p.status === 'active'
      );
      if (lowEngagementPrograms.length > 0) {
        items.push({
          id: 'low-engagement',
          type: 'alert',
          title: `${lowEngagementPrograms.length} program${lowEngagementPrograms.length > 1 ? 's' : ''} with low engagement`,
          description: 'Consider intervention strategies',
          priority: 'high',
          icon: AlertTriangle,
          link: createPageUrl('CommandCenter')
        });
      }

      setActionItems(items);
    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3"
      >
        <Link to={createPageUrl('ExperienceManagement') + '#programs'}>
          <Button size="sm" className="gap-2 bg-[#0202ff] hover:bg-[#0101dd]">
            <Briefcase className="w-4 h-4" />
            Manage Programs
          </Button>
        </Link>
        <Link to={createPageUrl('ExperienceManagement') + '?subtab=coaching#programs'}>
          <Button size="sm" variant="outline" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Coaching Sessions
          </Button>
        </Link>
        <Link to={createPageUrl('JourneyBuilder')}>
          <Button size="sm" variant="outline" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Create Journey
          </Button>
        </Link>
        <Link to={createPageUrl('ExperienceManagement') + '#requests'}>
          <Button size="sm" variant="outline" className="gap-2">
            <Target className="w-4 h-4" />
            View Requests
          </Button>
        </Link>
      </motion.div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Upcoming & Action Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {actionItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.id} to={item.link}>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
                      >
                        <div className={`p-2 rounded-lg ${
                          item.priority === 'high' ? 'bg-red-100' : 'bg-amber-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            item.priority === 'high' ? 'text-red-600' : 'text-amber-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Program Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Programs Overview</h2>
          <p className="text-sm text-gray-500">Programs and cohorts you manage</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <Badge className="bg-green-100 text-green-700">
                  {programStats?.activePrograms || 0} active
                </Badge>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : programStats?.totalPrograms || 0}
              </div>
              <p className="text-sm text-gray-600">Total Programs</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : programStats?.totalParticipants || 0}
              </div>
              <p className="text-sm text-gray-600">Total Participants</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <GraduationCap className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : programStats?.totalCohorts || 0}
              </div>
              <p className="text-sm text-gray-600">Active Cohorts</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : (programStats?.upcomingClasses || 0) + (programStats?.upcomingCoaching || 0)}
              </div>
              <p className="text-sm text-gray-600">Sessions This Week</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* My Programs List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">My Programs</CardTitle>
              <Link to={createPageUrl('ExperienceManagement')}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {myPrograms.length > 0 ? (
              <div className="space-y-3">
                {myPrograms.slice(0, 4).map((program) => (
                  <div 
                    key={program.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{program.name}</p>
                        <p className="text-sm text-gray-500">
                          {program.participant_emails?.length || 0} participants
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      program.status === 'active' ? 'bg-green-100 text-green-700' :
                      program.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {program.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { name: 'Emerging Leaders Cohort', participants: 12, status: 'active' },
                  { name: 'New Manager Bootcamp', participants: 8, status: 'active' },
                  { name: 'Executive Development Track', participants: 5, status: 'active' },
                  { name: 'Mid-Level Leadership Program', participants: 9, status: 'draft' },
                ].map((program, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{program.name}</p>
                        <p className="text-sm text-gray-500">{program.participants} participants</p>
                      </div>
                    </div>
                    <Badge className={program.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {program.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}