import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  Brain,
  TrendingUp,
  Users,
  AlertTriangle,
  Award,
  Filter,
  Loader2,
  Search,
  Eye,
  UserPlus,
  CheckCircle,
  Clock
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import AssignAssessmentModal from "@/components/assignment/AssignAssessmentModal";

const COLORS = {
  expert: '#10b981',
  proficient: '#3b82f6',
  developing: '#f59e0b',
  atRisk: '#ef4444'
};

export default function OrgAssessmentsView() {
  const { user, appRole } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const [filters, setFilters] = useState({
    department: 'all',
    status: 'all',
    scoreRange: 'all'
  });

  const canAssign = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'].includes(appRole);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentsData, usersData] = await Promise.all([
        base44.entities.Assessment.list('-created_date'),
        base44.entities.User.list()
      ]);
      setAssessments(assessmentsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichedAssessments = useMemo(() => {
    return assessments.map(assessment => {
      const assessmentUser = users.find(u => u.email === assessment.email);
      return {
        ...assessment,
        user_name: assessmentUser?.full_name || assessment.email,
        department: assessmentUser?.department || 'Unknown',
        status: assessment.submission_ts ? 'completed' : 'pending'
      };
    });
  }, [assessments, users]);

  const filteredAssessments = useMemo(() => {
    let filtered = enrichedAssessments;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.user_name.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term)
      );
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(a => a.department === filters.department);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(a => a.status === filters.status);
    }

    if (filters.scoreRange !== 'all') {
      filtered = filtered.filter(a => {
        if (!a.overall_pct) return filters.scoreRange === 'none';
        if (filters.scoreRange === 'high') return a.overall_pct >= 85;
        if (filters.scoreRange === 'medium') return a.overall_pct >= 70 && a.overall_pct < 85;
        if (filters.scoreRange === 'low') return a.overall_pct >= 55 && a.overall_pct < 70;
        if (filters.scoreRange === 'at_risk') return a.overall_pct < 55;
        return true;
      });
    }

    return filtered;
  }, [enrichedAssessments, searchTerm, filters]);

  const metrics = useMemo(() => {
    const completed = enrichedAssessments.filter(a => a.status === 'completed');
    const validScores = completed.filter(a => a.overall_pct != null);

    return {
      totalDeployed: enrichedAssessments.length,
      completionRate: enrichedAssessments.length > 0
        ? Math.round((completed.length / enrichedAssessments.length) * 100)
        : 0,
      avgOverallScore: validScores.length > 0
        ? Math.round(validScores.reduce((sum, a) => sum + a.overall_pct, 0) / validScores.length)
        : 0,
      avgSIScore: validScores.length > 0
        ? Math.round(validScores.reduce((sum, a) => sum + (a.si_pct || 0), 0) / validScores.length)
        : 0,
      pendingCount: enrichedAssessments.filter(a => a.status === 'pending').length,
      highPerformers: validScores.filter(a => a.overall_pct >= 85).length,
      atRisk: validScores.filter(a => a.overall_pct < 55).length
    };
  }, [enrichedAssessments]);

  const scoreDistribution = useMemo(() => {
    const completed = enrichedAssessments.filter(a => a.overall_pct != null);
    return [
      { name: 'Expert (85%+)', count: completed.filter(a => a.overall_pct >= 85).length, fill: COLORS.expert },
      { name: 'Proficient (70-84%)', count: completed.filter(a => a.overall_pct >= 70 && a.overall_pct < 85).length, fill: COLORS.proficient },
      { name: 'Developing (55-69%)', count: completed.filter(a => a.overall_pct >= 55 && a.overall_pct < 70).length, fill: COLORS.developing },
      { name: 'At Risk (<55%)', count: completed.filter(a => a.overall_pct < 55).length, fill: COLORS.atRisk }
    ];
  }, [enrichedAssessments]);

  const competencyAverages = useMemo(() => {
    const completed = enrichedAssessments.filter(a => a.overall_pct != null);
    if (completed.length === 0) return [];

    return [
      { name: 'SI', score: Math.round(completed.reduce((sum, a) => sum + (a.si_pct || 0), 0) / completed.length), target: 80 },
      { name: 'DM', score: Math.round(completed.reduce((sum, a) => sum + (a.dm_pct || 0), 0) / completed.length), target: 80 },
      { name: 'Comm', score: Math.round(completed.reduce((sum, a) => sum + (a.comm_pct || 0), 0) / completed.length), target: 80 },
      { name: 'RM', score: Math.round(completed.reduce((sum, a) => sum + (a.rm_pct || 0), 0) / completed.length), target: 80 },
      { name: 'SM', score: Math.round(completed.reduce((sum, a) => sum + (a.sm_pct || 0), 0) / completed.length), target: 80 },
      { name: 'PM', score: Math.round(completed.reduce((sum, a) => sum + (a.pm_pct || 0), 0) / completed.length), target: 80 }
    ];
  }, [enrichedAssessments]);

  const radarData = useMemo(() => {
    if (competencyAverages.length === 0) return [];
    return [
      { competency: 'SI', current: competencyAverages[0]?.score || 0, target: 80 },
      { competency: 'Decision Making', current: competencyAverages[1]?.score || 0, target: 80 },
      { competency: 'Communication', current: competencyAverages[2]?.score || 0, target: 80 },
      { competency: 'Resource Mgmt', current: competencyAverages[3]?.score || 0, target: 80 },
      { competency: 'Stakeholder Mgmt', current: competencyAverages[4]?.score || 0, target: 80 },
      { competency: 'Performance Mgmt', current: competencyAverages[5]?.score || 0, target: 80 }
    ];
  }, [competencyAverages]);

  const getScoreBadge = (score) => {
    if (!score) return { label: 'Pending', color: 'bg-gray-100 text-gray-800' };
    if (score >= 85) return { label: 'Expert', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { label: 'Proficient', color: 'bg-blue-100 text-blue-800' };
    if (score >= 55) return { label: 'Developing', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'At Risk', color: 'bg-red-100 text-red-800' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metrics.totalDeployed}</p>
            <p className="text-xs text-gray-600">Total Deployed</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metrics.completionRate}%</p>
            <p className="text-xs text-gray-600">Completion Rate</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <Brain className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metrics.avgOverallScore}%</p>
            <p className="text-xs text-gray-600">Avg Score</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metrics.avgSIScore}%</p>
            <p className="text-xs text-gray-600">Avg SI Score</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metrics.pendingCount}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <Award className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metrics.highPerformers}</p>
            <p className="text-xs text-gray-600">High Performers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{metrics.atRisk}</p>
            <p className="text-xs text-gray-600">At Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Organizational Competency Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="competency" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="Current" dataKey="current" stroke="#0202ff" fill="#0202ff" fillOpacity={0.5} />
                <Radar name="Target" dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0} strokeDasharray="5 5" />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${name}: ${count}`}
                  outerRadius={80}
                  dataKey="count"
                >
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Average Scores by Competency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={competencyAverages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#0202ff" name="Current Score" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#10b981" fillOpacity={0.3} name="Target" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: '#0202ff' }} />
              All Assessments ({filteredAssessments.length})
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              <Select value={filters.department} onValueChange={(v) => setFilters({...filters, department: v})}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.scoreRange} onValueChange={(v) => setFilters({...filters, scoreRange: v})}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="high">High (≥85%)</SelectItem>
                  <SelectItem value="medium">Medium (70-84%)</SelectItem>
                  <SelectItem value="low">Low (55-69%)</SelectItem>
                  <SelectItem value="at_risk">At Risk (&lt;55%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Overall</TableHead>
                  <TableHead className="text-right">SI</TableHead>
                  <TableHead>Archetype</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssessments.slice(0, 50).map(assessment => {
                  const badge = getScoreBadge(assessment.overall_pct);
                  return (
                    <TableRow key={assessment.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{assessment.user_name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{assessment.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{assessment.department}</Badge>
                      </TableCell>
                      <TableCell>
                        {assessment.status === 'completed' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {assessment.overall_pct ? `${assessment.overall_pct}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-600">
                        {assessment.si_pct ? `${assessment.si_pct}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {assessment.archetype_label ? (
                          <Badge variant="outline" className="text-xs">{assessment.archetype_label}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {assessment.submission_ts
                          ? format(new Date(assessment.submission_ts), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`${createPageUrl('AssessmentDetails')}?assessmentId=${assessment.id}`)}
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>

          {filteredAssessments.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No assessments match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action */}
      {canAssign && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Deploy Assessments</h3>
                <p className="text-sm text-gray-600">Send assessment invitations across your organization</p>
              </div>
              <Button onClick={() => setShowAssignModal(true)} className="bg-green-600 hover:bg-green-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Assessments
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AssignAssessmentModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={loadData}
      />
    </div>
  );
}