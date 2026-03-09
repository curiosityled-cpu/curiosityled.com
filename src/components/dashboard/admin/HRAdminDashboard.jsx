import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { 
  Users, Shield, AlertTriangle, TrendingUp, Target, BookOpen, 
  BarChart3, ArrowRight, Settings, Zap, FileText, Brain,
  UserPlus, Palette, Building2, CheckCircle2, Clock, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useClient } from "@/components/contexts/ClientContext";
import { useCompetencies } from "@/components/contexts/CompetencyContext";

export default function HRAdminDashboard({ user, loading }) {
  const { client: currentClient } = useClient();
  const { selectedCompetencies, competenciesConfigured } = useCompetencies();
  const [orgStats, setOrgStats] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadOrgStats();
  }, []);

  const loadOrgStats = async () => {
    setLoadingStats(true);
    try {
      const [usersData, assessments, programs, onboardingPlans] = await Promise.all([
        base44.functions.invoke('listAllUsers'),
        base44.entities.Assessment.list('-created_date', 100),
        base44.entities.Program.list(),
        base44.entities.OnboardingPlan.filter({ status: { $in: ['assigned', 'in_progress'] } })
      ]);

      const allUsers = usersData?.data?.users || [];
      
      // Calculate stats
      const totalUsers = allUsers.length;
      const newUsersThisMonth = allUsers.filter(u => {
        const created = new Date(u.created_date);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length;

      const assessmentCompletion = totalUsers > 0
        ? Math.round((assessments.length / totalUsers) * 100)
        : 0;

      const avgScore = assessments.length > 0
        ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / assessments.length)
        : 0;

      const activePrograms = programs.filter(p => p.status === 'active').length;
      const activeOnboarding = onboardingPlans.length;

      setOrgStats({
        totalUsers,
        newUsersThisMonth,
        assessmentCompletion,
        avgScore,
        activePrograms,
        totalPrograms: programs.length,
        activeOnboarding
      });

      // Build action items
      const items = [];

      if (!competenciesConfigured) {
        items.push({
          id: 'configure-competencies',
          type: 'setup',
          title: 'Configure Core Competencies',
          description: 'Set up the competency framework for your organization',
          priority: 'high',
          icon: Brain,
          action: 'configure-competencies'
        });
      }

      if (assessmentCompletion < 50) {
        items.push({
          id: 'low-assessment',
          type: 'alert',
          title: `Only ${assessmentCompletion}% assessment completion`,
          description: 'Consider sending reminders to complete assessments',
          priority: 'medium',
          icon: AlertTriangle,
          link: createPageUrl('HRAssessmentDashboard')
        });
      }

      if (activeOnboarding > 0) {
        items.push({
          id: 'active-onboarding',
          type: 'info',
          title: `${activeOnboarding} active onboarding plans`,
          description: 'Review progress of new team members',
          priority: 'low',
          icon: UserPlus,
          link: createPageUrl('OnboardingPlanBuilder')
        });
      }

      setActionItems(items);
    } catch (error) {
      console.error('Error loading org stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const quickActions = [
    { label: 'Manage Users', icon: Users, link: createPageUrl('UserManagement'), color: 'blue' },
    { label: 'Assessments', icon: BarChart3, link: createPageUrl('HRAssessmentDashboard'), color: 'green' },
    { label: 'Learning Library', icon: BookOpen, link: createPageUrl('LearningLibrary'), color: 'purple' },
    { label: 'Reports', icon: FileText, link: createPageUrl('ReportBuilder'), color: 'amber' },
    { label: 'Onboarding', icon: UserPlus, link: createPageUrl('OnboardingPlanBuilder'), color: 'pink' },
    { label: 'Automations', icon: Zap, link: createPageUrl('Automations'), color: 'yellow' }
  ];

  return (
    <div className="space-y-8">
      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.link}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardContent className="p-4 text-center">
                      <div className={`p-2 rounded-lg bg-${action.color}-100 inline-flex mb-2`}>
                        <Icon className={`w-5 h-5 text-${action.color}-600`} />
                      </div>
                      <p className="text-sm font-medium text-gray-700">{action.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Action Required
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {actionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className={`p-2 rounded-lg ${
                        item.priority === 'high' ? 'bg-red-100' : 
                        item.priority === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          item.priority === 'high' ? 'text-red-600' : 
                          item.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      {item.link && (
                        <Link to={item.link}>
                          <Button size="sm" variant="outline">
                            View <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Organization Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Organization Health</h2>
          <p className="text-sm text-gray-500">Key metrics for {currentClient?.name || 'your organization'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                {orgStats?.newUsersThisMonth > 0 && (
                  <Badge className="bg-green-100 text-green-700">
                    +{orgStats.newUsersThisMonth} this month
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : orgStats?.totalUsers || 0}
              </div>
              <p className="text-sm text-gray-600">Total Users</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : orgStats?.avgScore || 0}%
              </div>
              <p className="text-sm text-gray-600">Avg Assessment Score</p>
              <Progress value={orgStats?.avgScore || 0} className="h-1.5 mt-2" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : orgStats?.activePrograms || 0}
              </div>
              <p className="text-sm text-gray-600">Active Programs</p>
              <p className="text-xs text-gray-500 mt-1">
                {orgStats?.totalPrograms || 0} total
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : orgStats?.assessmentCompletion || 0}%
              </div>
              <p className="text-sm text-gray-600">Assessment Completion</p>
              <Progress value={orgStats?.assessmentCompletion || 0} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Management Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Competency Configuration */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                Core Competencies
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold">{selectedCompetencies.length}</span>
                <Badge className={competenciesConfigured ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                  {competenciesConfigured ? 'Configured' : 'Setup Required'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mb-3">Selected competencies for your framework</p>
              <Link to={createPageUrl('CareerPathCreator')}>
                <Button variant="outline" className="w-full" size="sm">
                  <Settings className="w-3 h-3 mr-2" />
                  Configure
                </Button>
              </Link>
            </CardContent>
          </Card>




        </div>
      </motion.div>
    </div>
  );
}