import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, Users, TrendingUp, Award, 
  Filter, Download, RefreshCw, Eye,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import PageHeader from "@/components/common/PageHeader";
import { createPageUrl } from "@/utils";

function LeadershipIndexAnalytics() {
  const [submissions, setSubmissions] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [submissionsData, competenciesData] = await Promise.all([
        base44.entities.AssessmentSubmission.list('-submission_date'),
        base44.entities.Competency.filter({ is_platform_default: true })
      ]);

      setSubmissions(submissionsData);
      setCompetencies(competenciesData);
      calculateStats(submissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const completed = data.filter(s => s.status === 'scored' || s.status === 'submitted');
    
    const avgProficiency = completed.reduce((sum, s) => 
      sum + (s.proficiency_scores?.overall_proficiency || 0), 0
    ) / (completed.length || 1);

    const bySector = completed.reduce((acc, s) => {
      acc[s.sector] = (acc[s.sector] || 0) + 1;
      return acc;
    }, {});

    const byLevel = completed.reduce((acc, s) => {
      acc[s.leadership_level] = (acc[s.leadership_level] || 0) + 1;
      return acc;
    }, {});

    const archetypes = completed.reduce((acc, s) => {
      const archetype = s.leadership_style_profile?.primary_style;
      if (archetype) {
        acc[archetype] = (acc[archetype] || 0) + 1;
      }
      return acc;
    }, {});

    setStats({
      total: data.length,
      completed: completed.length,
      avgProficiency,
      bySector,
      byLevel,
      archetypes
    });
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesLevel = filterLevel === 'all' || s.leadership_level === filterLevel;
    const matchesSector = filterSector === 'all' || s.sector === filterSector;
    return matchesLevel && matchesSector;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExportCSV = () => {
    const csvData = [
      ['Leadership Index Assessment Analytics'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Statistics'],
      ['Total Assessments', stats?.total || 0],
      ['Completed', stats?.completed || 0],
      ['Average Proficiency', stats?.avgProficiency?.toFixed(2) || 'N/A'],
      [''],
      ['By Sector'],
      ...Object.entries(stats?.bySector || {}).map(([sector, count]) => [sector, count]),
      [''],
      ['By Leadership Level'],
      ...Object.entries(stats?.byLevel || {}).map(([level, count]) => [level, count]),
      [''],
      ['Top Archetypes'],
      ...Object.entries(stats?.archetypes || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([archetype, count]) => [archetype, count])
    ];

    const csvContent = csvData.map(row => 
      Array.isArray(row) ? row.join(',') : row
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leadership-index-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('CSV exported successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 animate-pulse mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Leadership Index Analytics"
          subtitle="Comprehensive insights into organizational leadership capabilities"
          badges={[
            { text: 'Admin View', className: "bg-white text-purple-600" },
            { text: `${stats?.completed || 0} Completed`, className: "bg-white text-green-600" }
          ]}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          loadingRefresh={refreshing}
          headerColor="#9333EA"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Assessments</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total || 0}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.completed || 0}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Avg Proficiency</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.avgProficiency?.toFixed(2) || '0.00'}
                </p>
                <Progress value={(stats?.avgProficiency || 0) * 25} className="h-1 mt-2" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Sectors</p>
                <p className="text-3xl font-bold text-gray-900">
                  {Object.keys(stats?.bySector || {}).length}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Sector Distribution */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Distribution by Sector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats?.bySector || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([sector, count]) => {
                    const percentage = ((count / stats.completed) * 100).toFixed(1);
                    return (
                      <div key={sector}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{sector}</span>
                          <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Leadership Level Distribution */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Distribution by Leadership Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats?.byLevel || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([level, count]) => {
                    const percentage = ((count / stats.completed) * 100).toFixed(1);
                    return (
                      <div key={level}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {level.replace(/Level \d \(/g, 'L').replace(/\)/g, '')}
                          </span>
                          <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Archetypes */}
        <Card className="border-0 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Leadership Archetypes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats?.archetypes || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([archetype, count], idx) => (
                  <motion.div
                    key={archetype}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4"
                  >
                    <p className="text-sm font-semibold text-purple-900 mb-1">{archetype}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-purple-700">{count}</p>
                      <Badge className="bg-purple-100 text-purple-800">
                        {((count / stats.completed) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </motion.div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leadership Levels</SelectItem>
                    <SelectItem value="Level 1 (Leading Self)">Level 1</SelectItem>
                    <SelectItem value="Level 2 (Leading Others)">Level 2</SelectItem>
                    <SelectItem value="Level 3 (Leading Managers)">Level 3</SelectItem>
                    <SelectItem value="Level 4 (Leading Functions)">Level 4</SelectItem>
                    <SelectItem value="Level 5 (Leading Organizations)">Level 5</SelectItem>
                    <SelectItem value="HiPo Individual Contributor">HiPo IC</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterSector} onValueChange={setFilterSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Corporate/Private">Corporate/Private</SelectItem>
                    <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recent Submissions ({filteredSubmissions.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredSubmissions.slice(0, 20).map((submission, idx) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium text-gray-900">{submission.user_email}</p>
                        <Badge variant="outline" className="text-xs">
                          {submission.leadership_level?.replace(/Level \d \(/g, 'L').replace(/\)/g, '')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {submission.sector}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          Proficiency: {submission.proficiency_scores?.overall_proficiency?.toFixed(2) || 'N/A'}
                        </span>
                        {submission.leadership_style_profile?.primary_style && (
                          <span className="text-purple-600">
                            {submission.leadership_style_profile.primary_style}
                          </span>
                        )}
                        <span className="text-gray-400">
                          {new Date(submission.submission_date || submission.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge className={
                      submission.status === 'scored' ? 'bg-green-100 text-green-800' :
                      submission.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {submission.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuthProtection(LeadershipIndexAnalytics, {
  checkAccess: (user) => {
    const allowedRoles = ['Admin Level 2', 'Platform Admin', 'Super Administrator', 'Analyst'];
    if (allowedRoles.includes(user.app_role)) return true;
    
    // Check for addon permission
    if (user.addon_permissions?.includes('leadership_index.view_analytics')) return true;
    
    return false;
  }
});