import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, GraduationCap, Award, Calendar, 
  Target, AlertTriangle, CheckCircle, Clock, Download,
  MessageSquare, BookOpen, BarChart3, Check
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ProgramAnalytics() {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [certificates, setCertificates] = useState([]);
  
  const [analytics, setAnalytics] = useState({
    overview: {},
    classMetrics: [],
    coachingMetrics: [],
    certificateMetrics: [],
    participantProgress: [],
    riskAnalysis: []
  });

  useEffect(() => {
    loadData();
  }, [timeRange, customStartDate, customEndDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [programsData, classesData, engagementsData, sessionsData, certificatesData] = await Promise.all([
        base44.entities.Program.filter({ manager_emails: { $in: [user.email] } }),
        base44.entities.Class.filter({ facilitator_email: user.email }),
        base44.entities.CoachingEngagement.filter({ coach_email: user.email }),
        base44.entities.CoachingSession.filter({ coach_email: user.email }),
        base44.entities.Certificate.filter({ issued_by_email: user.email })
      ]);

      setPrograms(programsData);
      setClasses(classesData);
      setEngagements(engagementsData);
      setSessions(sessionsData);
      setCertificates(certificatesData);

      calculateAnalytics(programsData, classesData, engagementsData, sessionsData, certificatesData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (programsData, classesData, engagementsData, sessionsData, certificatesData) => {
    const now = new Date();
    let startDate;
    
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      startDate = customStartDate;
    } else if (timeRange === 'all') {
      startDate = subMonths(now, 60); // 5 years back for "all time"
    } else {
      const months = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
      startDate = subMonths(now, months);
    }

    // Overview metrics
    const totalParticipants = new Set([
      ...programsData.flatMap(p => p.participant_emails || []),
      ...classesData.flatMap(c => c.enrolled_emails || [])
    ]).size;

    const completedSessions = sessionsData.filter(s => s.status === 'completed').length;
    const totalSessions = sessionsData.length;
    const sessionCompletionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const activeEngagements = engagementsData.filter(e => e.status === 'active').length;
    const atRiskEngagements = engagementsData.filter(e => e.risk_level === 'high').length;

    const completedClasses = classesData.filter(c => c.status === 'completed').length;

    // Monthly trends
    const monthRange = eachMonthOfInterval({ start: startDate, end: now });
    
    const classMetrics = monthRange.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthClasses = classesData.filter(c => {
        const date = new Date(c.scheduled_date);
        return date >= monthStart && date <= monthEnd;
      });

      const totalEnrolled = monthClasses.reduce((sum, c) => sum + (c.enrolled_emails?.length || 0), 0);
      const totalAttended = monthClasses.reduce((sum, c) => {
        const presentCount = c.attendance_records?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
        return sum + presentCount;
      }, 0);

      return {
        month: format(month, 'MMM'),
        classes: monthClasses.length,
        enrolled: totalEnrolled,
        attended: totalAttended,
        attendanceRate: totalEnrolled > 0 ? Math.round((totalAttended / totalEnrolled) * 100) : 0
      };
    });

    const coachingMetrics = monthRange.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthSessions = sessionsData.filter(s => {
        const date = new Date(s.scheduled_date);
        return date >= monthStart && date <= monthEnd;
      });

      const completed = monthSessions.filter(s => s.status === 'completed').length;
      const cancelled = monthSessions.filter(s => s.status === 'cancelled' || s.status === 'no_show').length;

      return {
        month: format(month, 'MMM'),
        scheduled: monthSessions.length,
        completed,
        cancelled,
        completionRate: monthSessions.length > 0 ? Math.round((completed / monthSessions.length) * 100) : 0
      };
    });

    const certificateMetrics = monthRange.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthCerts = certificatesData.filter(c => {
        const date = new Date(c.issued_date);
        return date >= monthStart && date <= monthEnd;
      });

      return {
        month: format(month, 'MMM'),
        issued: monthCerts.length,
        classCompletion: monthCerts.filter(c => c.certificate_type === 'class_completion').length,
        programCompletion: monthCerts.filter(c => c.certificate_type === 'program_completion').length,
        coachingCompletion: monthCerts.filter(c => c.certificate_type === 'coaching_completion').length
      };
    });

    // Engagement risk analysis
    const riskAnalysis = [
      { name: 'Low Risk', value: engagementsData.filter(e => e.risk_level === 'low').length, color: '#10B981' },
      { name: 'Medium Risk', value: engagementsData.filter(e => e.risk_level === 'medium').length, color: '#F59E0B' },
      { name: 'High Risk', value: engagementsData.filter(e => e.risk_level === 'high').length, color: '#EF4444' }
    ];

    // Engagement type distribution
    const engagementTypes = {};
    engagementsData.forEach(e => {
      engagementTypes[e.engagement_type] = (engagementTypes[e.engagement_type] || 0) + 1;
    });
    const participantProgress = Object.entries(engagementTypes).map(([type, count], i) => ({
      name: type.replace(/_/g, ' '),
      value: count,
      color: COLORS[i % COLORS.length]
    }));

    setAnalytics({
      overview: {
        totalPrograms: programsData.length,
        totalParticipants,
        totalClasses: classesData.length,
        completedClasses,
        totalEngagements: engagementsData.length,
        activeEngagements,
        atRiskEngagements,
        totalSessions,
        completedSessions,
        sessionCompletionRate,
        totalCertificates: certificatesData.length
      },
      classMetrics,
      coachingMetrics,
      certificateMetrics,
      participantProgress,
      riskAnalysis
    });
  };

  const exportToCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Programs', analytics.overview.totalPrograms],
      ['Total Participants', analytics.overview.totalParticipants],
      ['Total Classes', analytics.overview.totalClasses],
      ['Completed Classes', analytics.overview.completedClasses],
      ['Total Engagements', analytics.overview.totalEngagements],
      ['Active Engagements', analytics.overview.activeEngagements],
      ['At-Risk Engagements', analytics.overview.atRiskEngagements],
      ['Total Sessions', analytics.overview.totalSessions],
      ['Completed Sessions', analytics.overview.completedSessions],
      ['Session Completion Rate', `${analytics.overview.sessionCompletionRate}%`],
      ['Total Certificates', analytics.overview.totalCertificates]
    ];

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `program-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Date range options and helpers
  const dateRangeOptions = [
    { id: '3months', label: 'Last 3 Months' },
    { id: '6months', label: 'Last 6 Months' },
    { id: '12months', label: 'Last 12 Months' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom Range', icon: Calendar }
  ];

  const getDateRangeLabel = () => {
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return `${format(customStartDate, 'MMM d, yyyy')} - ${format(customEndDate, 'MMM d, yyyy')}`;
    }
    const option = dateRangeOptions.find(o => o.id === timeRange);
    return option?.label || 'Last 6 Months';
  };

  const renderDateRangeDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[160px] justify-between">
          {getDateRangeLabel()}
          <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {dateRangeOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => {
              if (option.id === 'custom') {
                setShowCustomRange(true);
              } else {
                setTimeRange(option.id);
              }
            }}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {option.icon && <Calendar className="w-4 h-4" />}
              {option.label}
            </span>
            {timeRange === option.id && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderCustomDateRangeDialog = () => (
    <Dialog open={showCustomRange} onOpenChange={setShowCustomRange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Custom Date Range</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <CalendarComponent
              mode="single"
              selected={customStartDate}
              onSelect={setCustomStartDate}
              className="rounded-md border"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <CalendarComponent
              mode="single"
              selected={customEndDate}
              onSelect={setCustomEndDate}
              className="rounded-md border"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowCustomRange(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              if (customStartDate && customEndDate) {
                setTimeRange('custom');
                setShowCustomRange(false);
              }
            }}
            disabled={!customStartDate || !customEndDate}
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Program Analytics</h2>
          <p className="text-gray-600">Track performance across your programs and coaching</p>
        </div>
        <div className="flex gap-2">
          {renderDateRangeDropdown()}
          {hasPermission('reports.program.download') && (
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>
      
      {renderCustomDateRangeDialog()}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{analytics.overview.totalPrograms}</div>
            <div className="text-xs text-gray-600">Programs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <div className="text-2xl font-bold">{analytics.overview.totalParticipants}</div>
            <div className="text-xs text-gray-600">Participants</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <GraduationCap className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{analytics.overview.completedClasses}/{analytics.overview.totalClasses}</div>
            <div className="text-xs text-gray-600">Classes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{analytics.overview.activeEngagements}</div>
            <div className="text-xs text-gray-600">Active Coaching</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
            <div className="text-2xl font-bold">{analytics.overview.sessionCompletionRate}%</div>
            <div className="text-xs text-gray-600">Session Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-amber-600" />
            <div className="text-2xl font-bold">{analytics.overview.totalCertificates}</div>
            <div className="text-xs text-gray-600">Certificates</div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Alert */}
      {analytics.overview.atRiskEngagements > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-700">
                  {analytics.overview.atRiskEngagements} coaching engagement{analytics.overview.atRiskEngagements > 1 ? 's' : ''} at high risk
                </p>
                <p className="text-sm text-gray-600">Review these engagements to prevent churn</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Attendance Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Class Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.classMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="enrolled" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Enrolled" />
                <Area type="monotone" dataKey="attended" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Attended" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Coaching Session Completion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coaching Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.coachingMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
                <Bar dataKey="cancelled" fill="#EF4444" name="Cancelled/No-Show" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Certificate Issuance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Certificates Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.certificateMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="issued" stroke="#F59E0B" strokeWidth={2} name="Total Issued" />
                <Line type="monotone" dataKey="classCompletion" stroke="#3B82F6" name="Class" />
                <Line type="monotone" dataKey="programCompletion" stroke="#8B5CF6" name="Program" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Engagement Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.riskAnalysis}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analytics.riskAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Types */}
      {analytics.participantProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coaching Engagement Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.participantProgress} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6">
                  {analytics.participantProgress.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}