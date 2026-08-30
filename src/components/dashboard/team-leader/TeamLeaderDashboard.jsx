import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { 
  Users, Bell, AlertTriangle, TrendingUp, Target, BookOpen, 
  BarChart3, ArrowRight, Calendar, CheckCircle2, Clock, Loader2,
  UserPlus, MessageSquare, Award, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import SubNavMenu from "@/components/common/SubNavMenu";
import { toast } from "sonner";

// Reuse the User Level 1 components
import InsightsSummarySection from "../user/InsightsSummarySection";
import TeamQualificationsWidget from "./TeamQualificationsWidget";
import TeamCompetencyCoverageWidget from "../../analytics/TeamCompetencyCoverageWidget";

export default function TeamLeaderDashboard({ user, dashboardData, loading }) {
  const [teamStats, setTeamStats] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [exportingQuals, setExportingQuals] = useState(false);

  useEffect(() => {
    if (user?.email) {
      loadTeamData();
    }
  }, [user?.email]);

  const loadTeamData = async () => {
    setLoadingTeam(true);
    try {
      // Fetch team members (subordinates)
      const subordinateEmails = user?.subordinate_emails || [];
      
      // Get team assessments and progress
      const [assessments, goals, journeyEnrollments] = await Promise.all([
        base44.entities.Assessment.filter({ email: { $in: subordinateEmails } }, '-created_date', 20),
        base44.entities.Goal.filter({ created_by: { $in: subordinateEmails } }, '-created_date', 20),
        base44.entities.JourneyEnrollment.filter({ user_email: { $in: subordinateEmails } }, '-created_date', 20)
      ]);

      // Calculate team stats
      const avgScore = assessments.length > 0 
        ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / assessments.length)
        : 0;
      
      const goalsCompleted = goals.filter(g => g.status === 'completed').length;
      const goalsInProgress = goals.filter(g => g.status === 'active').length;
      
      const journeysInProgress = journeyEnrollments.filter(j => j.status === 'in_progress').length;
      const journeysCompleted = journeyEnrollments.filter(j => j.status === 'completed').length;

      // Find at-risk members (low scores or overdue items)
      const atRiskMembers = assessments.filter(a => (a.overall_pct || 0) < 60).length;

      setTeamStats({
        totalMembers: subordinateEmails.length,
        avgAssessmentScore: avgScore,
        goalsCompleted,
        goalsInProgress,
        journeysInProgress,
        journeysCompleted,
        atRiskMembers,
        assessmentsTaken: assessments.length
      });

      // Build action items for team
      const items = [];
      
      if (atRiskMembers > 0) {
        items.push({
          id: 'at-risk',
          type: 'alert',
          title: `${atRiskMembers} team member${atRiskMembers > 1 ? 's' : ''} need support`,
          description: 'Low assessment scores detected',
          priority: 'high',
          icon: AlertTriangle,
          link: createPageUrl('CommandCenter')
        });
      }

      const pendingAssessments = subordinateEmails.length - assessments.length;
      if (pendingAssessments > 0) {
        items.push({
          id: 'pending-assessments',
          type: 'reminder',
          title: `${pendingAssessments} team member${pendingAssessments > 1 ? 's' : ''} haven't taken assessment`,
          description: 'Send reminders to complete',
          priority: 'medium',
          icon: Clock,
          link: createPageUrl('CommandCenter')
        });
      }

      setActionItems(items);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleExportQualifications = async (format) => {
    setExportingQuals(true);
    try {
      const { data } = await base44.functions.invoke('exportTeamQualifications', {
        subordinate_emails: user?.subordinate_emails || [],
        format
      });
      
      const blob = new Blob([data], { 
        type: format === 'csv' ? 'text/csv' : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team_qualifications.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success(`Exported team qualifications as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export qualifications');
    } finally {
      setExportingQuals(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Task-Driven Section - Top */}
      <div className="space-y-6">
        {/* Quick Actions for Team Leader */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <SubNavMenu
            items={[
              { id: 'view-team', label: 'View Team', icon: Users },
              { id: 'team-goals', label: 'Team Goals', icon: Target },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'onboard', label: 'Onboard Member', icon: UserPlus }
            ]}
            activeId="view-team"
            onItemClick={(id) => {
              switch (id) {
                case 'view-team':
                  window.location.href = createPageUrl('CommandCenter');
                  break;
                case 'team-goals':
                  window.location.href = createPageUrl('Performance') + '?view=team';
                  break;
                case 'analytics':
                  window.location.href = createPageUrl('Insights');
                  break;
                case 'onboard':
                  window.location.href = createPageUrl('OnboardingPlanBuilder');
                  break;
              }
            }}
            variant="content"
            label="Quick Actions"
          />
        </motion.div>

        {/* Team Action Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Team Action Items</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">Items requiring your attention</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {loadingTeam ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : actionItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="p-4 bg-green-100 rounded-full mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Team is on track!</h3>
                  <p className="text-gray-500 text-sm">No urgent team items at the moment.</p>
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Progress Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Overview</h2>
            <p className="text-sm text-gray-500">Your team's development progress</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to={createPageUrl('CommandCenter')}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {loadingTeam ? '—' : teamStats?.totalMembers || 0}
                  </div>
                  <p className="text-sm font-medium text-gray-700">Team Members</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {teamStats?.atRiskMembers || 0} need attention
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('HRAssessmentDashboard')}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {loadingTeam ? '—' : teamStats?.avgAssessmentScore || 0}%
                  </div>
                  <p className="text-sm font-medium text-gray-700">Avg Assessment Score</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {teamStats?.assessmentsTaken || 0} completed
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('Performance')}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Target className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {loadingTeam ? '—' : teamStats?.goalsCompleted || 0}
                  </div>
                  <p className="text-sm font-medium text-gray-700">Goals Completed</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {teamStats?.goalsInProgress || 0} in progress
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('MyJourneys')}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {loadingTeam ? '—' : teamStats?.journeysInProgress || 0}
                  </div>
                  <p className="text-sm font-medium text-gray-700">Active Journeys</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {teamStats?.journeysCompleted || 0} completed
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </motion.div>

        {/* Team Qualifications Widget */}
        <div className="relative">
          <TeamQualificationsWidget subordinateEmails={user?.subordinate_emails || []} />
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportQualifications('csv')}
              disabled={exportingQuals}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportQualifications('pdf')}
              disabled={exportingQuals}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
          </div>
        </div>

        {/* Team Competency Coverage */}
        <TeamCompetencyCoverageWidget subordinateEmails={user?.subordinate_emails || []} />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gradient-to-br from-slate-50 to-blue-50 px-4 text-sm text-gray-500">
            Your Leadership Development
          </span>
        </div>
      </div>

      {/* Personal Leadership Insights */}
      <InsightsSummarySection user={user} dashboardData={dashboardData} />
    </div>
  );
}