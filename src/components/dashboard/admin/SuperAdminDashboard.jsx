import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { 
  Users, Shield, AlertTriangle, TrendingUp, Target, BookOpen, 
  BarChart3, ArrowRight, Settings, Zap, FileText, Brain,
  UserPlus, Palette, CreditCard, Building2, CheckCircle2, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useClient } from "@/components/contexts/ClientContext";

export default function SuperAdminDashboard({ user, loading }) {
  const { client: currentClient } = useClient();
  const [orgStats, setOrgStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadOrgStats();
  }, []);

  const loadOrgStats = async () => {
    setLoadingStats(true);
    try {
      const [usersData, assessments, programs, goals] = await Promise.all([
        base44.functions.invoke('listAllUsers'),
        base44.entities.Assessment.list('-created_date', 100),
        base44.entities.Program.list(),
        base44.entities.Goal.list('-created_date', 50)
      ]);

      const allUsers = usersData?.data?.users || [];
      const clientUsers = allUsers.filter(u => u.client_id === user?.client_id);
      
      // Calculate metrics
      const totalUsers = clientUsers.length;
      const activeUsers = clientUsers.filter(u => {
        const lastActivity = new Date(u.updated_date || u.created_date);
        return (new Date() - lastActivity) < 30 * 24 * 60 * 60 * 1000;
      }).length;

      const clientAssessments = assessments.filter(a => 
        clientUsers.some(u => u.email === a.email)
      );
      const avgScore = clientAssessments.length > 0
        ? Math.round(clientAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / clientAssessments.length)
        : 0;

      const clientPrograms = programs.filter(p => p.client_id === user?.client_id);
      const activePrograms = clientPrograms.filter(p => p.status === 'active').length;

      const clientGoals = goals.filter(g => 
        clientUsers.some(u => u.email === g.created_by)
      );
      const completedGoals = clientGoals.filter(g => g.status === 'completed').length;

      setOrgStats({
        totalUsers,
        activeUsers,
        avgScore,
        totalPrograms: clientPrograms.length,
        activePrograms,
        totalGoals: clientGoals.length,
        completedGoals,
        assessmentCompletion: totalUsers > 0 
          ? Math.round((clientAssessments.length / totalUsers) * 100) 
          : 0
      });

      // Recent activity
      setRecentActivity([
        { type: 'user', count: allUsers.filter(u => {
          const created = new Date(u.created_date);
          return (new Date() - created) < 7 * 24 * 60 * 60 * 1000;
        }).length, label: 'new users this week' },
        { type: 'assessment', count: clientAssessments.filter(a => {
          const created = new Date(a.created_date);
          return (new Date() - created) < 7 * 24 * 60 * 60 * 1000;
        }).length, label: 'assessments this week' }
      ]);
    } catch (error) {
      console.error('Error loading org stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const managementLinks = [
    { label: 'User Management', icon: Users, link: createPageUrl('UserManagement'), description: 'Manage all users' },
    { label: 'Programs & Cohorts', icon: Target, link: createPageUrl('CommandCenter'), description: 'Manage programs' },
    { label: 'Assessments', icon: BarChart3, link: createPageUrl('HRAssessmentDashboard'), description: 'Assessment dashboard' },
    { label: 'Analytics', icon: TrendingUp, link: createPageUrl('OrgPerformance'), description: 'Org analytics' },
    { label: 'Branding', icon: Palette, link: createPageUrl('WhiteLabel'), description: 'Customize branding' },
  ];

  return (
    <div className="space-y-8">
      {/* Organization Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-2 border-purple-200 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentClient?.name || 'Organization'} Administration
                  </h2>
                  <p className="text-gray-600">Full administrative access to your organization</p>
                </div>
              </div>
              <Badge className="bg-purple-600 text-white px-3 py-1">
                Super Administrator
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '—' : orgStats?.totalUsers || 0}
              </div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-xs text-green-600 mt-1">
                {orgStats?.activeUsers || 0} active (30d)
              </p>
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
                {loadingStats ? '—' : orgStats?.completedGoals || 0}
              </div>
              <p className="text-sm text-gray-600">Goals Completed</p>
              <p className="text-xs text-gray-500 mt-1">
                {orgStats?.totalGoals || 0} total
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Management Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Organization Management</h2>
          <p className="text-sm text-gray-500">Quick access to administrative functions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managementLinks.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} to={item.link}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.03 }}
                >
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Icon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.label}</p>
                            <p className="text-sm text-gray-500">{item.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && recentActivity.some(a => a.count > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex gap-6">
                  {recentActivity.map((activity, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-bold text-blue-700">{activity.count}</span>
                      <span className="text-blue-600 ml-1">{activity.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}