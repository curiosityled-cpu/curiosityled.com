import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Target, 
  Award,
  Download,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

export default function OrgPerformance() {
  const [user, setUser] = useState(null);
  const [allGoals, setAllGoals] = useState([]);
  const [allKpis, setAllKpis] = useState([]);
  const [allOkrs, setAllOkrs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  useEffect(() => {
    loadOrgData();
  }, []);

  const loadOrgData = async () => {
    setIsLoading(true);
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    // Only admins should access this page
    if (currentUser.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const [goalsData, kpisData, okrsData, usersData] = await Promise.all([
      base44.entities.Goal.list("-updated_date"),
      base44.entities.KPI.list("-updated_date"),
      base44.entities.OKR.list("-updated_date"),
      base44.entities.User.list()
    ]);

    setAllGoals(goalsData);
    setAllKpis(kpisData);
    setAllOkrs(okrsData);
    setAllUsers(usersData);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto text-center py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only administrators can access organizational performance data.</p>
        </div>
      </div>
    );
  }

  // Calculate org-wide metrics
  const totalGoals = allGoals.length;
  const totalKpis = allKpis.length;
  const totalOkrs = allOkrs.length;
  const activeUsers = allUsers.filter(u => u.role === 'user').length;

  const avgKpiProgress = allKpis.length > 0
    ? allKpis.reduce((sum, kpi) => {
        const progress = kpi.target_value > 0 
          ? Math.min(100, (kpi.current_value / kpi.target_value) * 100)
          : 0;
        return sum + progress;
      }, 0) / allKpis.length
    : 0;

  const avgOkrProgress = allOkrs.length > 0
    ? allOkrs.reduce((sum, okr) => {
        const keyResults = okr.key_results || [];
        const okrProgress = keyResults.length > 0
          ? keyResults.reduce((krSum, kr) => {
              const krProgress = kr.target_value > 0 
                ? Math.min(100, (kr.current_value / kr.target_value) * 100)
                : 0;
              return krSum + krProgress;
            }, 0) / keyResults.length
          : 0;
        return sum + okrProgress;
      }, 0) / allOkrs.length
    : 0;

  // Group by user
  const userPerformance = allUsers
    .filter(u => u.role === 'user')
    .map(user => {
      const userGoals = allGoals.filter(g => g.user_email === user.email);
      const userKpis = allKpis.filter(k => k.user_email === user.email);
      const userOkrs = allOkrs.filter(o => o.user_email === user.email);

      const kpiProgress = userKpis.length > 0
        ? userKpis.reduce((sum, kpi) => {
            const progress = kpi.target_value > 0 
              ? Math.min(100, (kpi.current_value / kpi.target_value) * 100)
              : 0;
            return sum + progress;
          }, 0) / userKpis.length
        : 0;

      return {
        ...user,
        goalsCount: userGoals.length,
        kpisCount: userKpis.length,
        okrsCount: userOkrs.length,
        avgProgress: kpiProgress
      };
    })
    .sort((a, b) => b.avgProgress - a.avgProgress);

  // Status distribution
  const kpiStatusDistribution = allKpis.reduce((acc, kpi) => {
    acc[kpi.status] = (acc[kpi.status] || 0) + 1;
    return acc;
  }, {});

  const okrStatusDistribution = allOkrs.reduce((acc, okr) => {
    acc[okr.status] = (acc[okr.status] || 0) + 1;
    return acc;
  }, {});

  const handleExportData = () => {
    const csvData = userPerformance.map(user => ({
      Name: user.full_name,
      Email: user.email,
      Goals: user.goalsCount,
      KPIs: user.kpisCount,
      OKRs: user.okrsCount,
      'Avg Progress': `${Math.round(user.avgProgress)}%`
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Performance</h1>
            <p className="text-gray-600 mt-2">Company-wide performance metrics and insights</p>
          </div>
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{activeUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Team members</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Goals</span>
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalGoals}</div>
                <p className="text-xs text-gray-500 mt-1">Across organization</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Avg KPI Progress</span>
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{Math.round(avgKpiProgress)}%</div>
                <Progress value={avgKpiProgress} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Avg OKR Progress</span>
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{Math.round(avgOkrProgress)}%</div>
                <Progress value={avgOkrProgress} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">User Performance</TabsTrigger>
            <TabsTrigger value="kpis">KPI Insights</TabsTrigger>
            <TabsTrigger value="okrs">OKR Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userPerformance.map((user, index) => (
                    <motion.div
                      key={user.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{user.full_name}</h4>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Goals</p>
                          <p className="font-semibold">{user.goalsCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">KPIs</p>
                          <p className="font-semibold">{user.kpisCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">OKRs</p>
                          <p className="font-semibold">{user.okrsCount}</p>
                        </div>
                        <div className="w-32">
                          <Progress value={user.avgProgress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            {Math.round(user.avgProgress)}% avg
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kpis" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>KPI Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(kpiStatusDistribution).map(([status, count]) => {
                      const percentage = totalKpis > 0 ? Math.round((count / totalKpis) * 100) : 0;
                      const colors = {
                        on_track: 'bg-green-500',
                        at_risk: 'bg-yellow-500',
                        behind: 'bg-red-500',
                        achieved: 'bg-blue-500'
                      };

                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                            <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${colors[status]} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing KPIs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allKpis
                      .sort((a, b) => {
                        const aProgress = a.target_value > 0 ? (a.current_value / a.target_value) * 100 : 0;
                        const bProgress = b.target_value > 0 ? (b.current_value / b.target_value) * 100 : 0;
                        return bProgress - aProgress;
                      })
                      .slice(0, 5)
                      .map((kpi, index) => {
                        const progress = kpi.target_value > 0 
                          ? Math.min(100, Math.round((kpi.current_value / kpi.target_value) * 100))
                          : 0;

                        return (
                          <div key={kpi.id} className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{kpi.name}</p>
                              <Progress value={progress} className="h-1 mt-1" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{progress}%</span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="okrs" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>OKR Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(okrStatusDistribution).map(([status, count]) => {
                      const percentage = totalOkrs > 0 ? Math.round((count / totalOkrs) * 100) : 0;
                      const colors = {
                        on_track: 'bg-green-500',
                        at_risk: 'bg-yellow-500',
                        behind: 'bg-red-500',
                        achieved: 'bg-blue-500'
                      };

                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                            <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${colors[status]} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent OKRs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allOkrs.slice(0, 5).map((okr) => (
                      <div key={okr.id} className="p-3 border rounded-lg">
                        <h4 className="font-medium text-gray-900 text-sm">{okr.objective}</h4>
                        <p className="text-xs text-gray-600 mt-1">{okr.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {okr.key_results?.length || 0} Key Results
                          </Badge>
                          <Badge className="text-xs">
                            {okr.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}