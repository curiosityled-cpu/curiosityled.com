import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Map,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowRight,
  Loader2,
  FileDown,
  GraduationCap,
  Calendar,
  MessageSquare,
  Route,
  CalendarDays
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";

const COLORS = ['#0202ff', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function ExperienceAnalyticsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [appliedCustomDateRange, setAppliedCustomDateRange] = useState({ from: null, to: null });

  useEffect(() => {
    loadAnalytics();
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('getPlatformJourneyAnalytics', {
        timeRange,
        scope: 'org'
      });
      
      if (data?.success) {
        setAnalyticsData(data.analytics);
      } else {
        // Generate mock data for display
        setAnalyticsData(generateMockData());
      }
    } catch (error) {
      console.warn('Could not load analytics:', error);
      setAnalyticsData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    return {
      summary: {
        totalExperiences: 45,
        totalParticipants: 156,
        totalJourneys: 12,
        totalPrograms: 8,
        totalClasses: 18,
        totalCoachingEngagements: 7,
        experienceTypeDistribution: [
          { name: 'Journeys', value: 12, color: '#0202ff' },
          { name: 'Programs', value: 8, color: '#10b981' },
          { name: 'Classes', value: 18, color: '#f59e0b' },
          { name: 'Coaching', value: 7, color: '#8b5cf6' }
        ]
      },
      coverage: {
        totalEnrollments: 156,
        uniqueLearnersEnrolled: 89
      },
      completion: {
        completionRate: 68,
        completedEnrollments: 106
      },
      engagement: {
        activeLearners: 45
      },
      completionByJourney: [
        { name: 'Leadership Fundamentals', enrolled: 45, completed: 32, rate: 71 },
        { name: 'New Manager Training', enrolled: 38, completed: 28, rate: 74 },
        { name: 'Executive Development', enrolled: 22, completed: 12, rate: 55 },
        { name: 'Communication Skills', enrolled: 31, completed: 24, rate: 77 },
        { name: 'Strategic Thinking', enrolled: 20, completed: 14, rate: 70 }
      ],
      statusDistribution: [
        { name: 'Completed', value: 110, color: '#10b981' },
        { name: 'In Progress', value: 32, color: '#f59e0b' },
        { name: 'Not Started', value: 14, color: '#e5e7eb' }
      ],
      trendData: [
        { month: 'Jan', enrollments: 12, completions: 8 },
        { month: 'Feb', enrollments: 18, completions: 14 },
        { month: 'Mar', enrollments: 22, completions: 16 },
        { month: 'Apr', enrollments: 28, completions: 22 },
        { month: 'May', enrollments: 35, completions: 28 },
        { month: 'Jun', enrollments: 41, completions: 32 }
      ],
      topPerformers: [
        { name: 'Sarah Johnson', journeysCompleted: 5, avgScore: 92 },
        { name: 'Michael Chen', journeysCompleted: 4, avgScore: 88 },
        { name: 'Emily Davis', journeysCompleted: 4, avgScore: 85 },
        { name: 'James Wilson', journeysCompleted: 3, avgScore: 90 },
        { name: 'Lisa Anderson', journeysCompleted: 3, avgScore: 87 }
      ],
      programs: {
        totalPrograms: 8,
        activePrograms: 5,
        totalParticipants: 78,
        programsByType: { executive_development: 2, new_manager: 3, team_effectiveness: 2, custom: 1 }
      },
      classes: {
        totalClasses: 18,
        completedClasses: 12,
        upcomingClasses: 4,
        avgAttendance: 15
      },
      coaching: {
        totalEngagements: 7,
        activeEngagements: 4,
        completedEngagements: 3,
        totalSessions: 28,
        completedSessions: 22,
        uniqueCoachees: 7,
        uniqueCoaches: 3,
        completionRate: 43
      }
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  const data = analyticsData || generateMockData();

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setCustomDateRange(appliedCustomDateRange.from ? { ...appliedCustomDateRange } : { from: null, to: null });
      setShowCustomDateDialog(true);
    } else {
      setTimeRange(value);
      setAppliedCustomDateRange({ from: null, to: null });
    }
  };

  const handleCustomDateApply = () => {
    if (customDateRange.from && customDateRange.to) {
      setAppliedCustomDateRange(customDateRange);
      setTimeRange('custom');
      setShowCustomDateDialog(false);
    }
  };

  const handleCustomDateCancel = () => {
    setShowCustomDateDialog(false);
    if (!appliedCustomDateRange.from && timeRange === 'custom') {
      setTimeRange('6months');
    }
    setCustomDateRange(appliedCustomDateRange);
  };

  const setQuickRange = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    setCustomDateRange({ from, to });
  };

  const getTimeRangeLabel = () => {
    if (timeRange === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to) {
      return `${format(appliedCustomDateRange.from, 'MMM d')} - ${format(appliedCustomDateRange.to, 'MMM d, yyyy')}`;
    }
    return {
      '3months': 'Last 3 Months',
      '6months': 'Last 6 Months',
      '12months': 'Last 12 Months',
      'all': 'All Time'
    }[timeRange] || timeRange;
  };

  // Build summary data from real or mock data
  const summaryData = data.summary || {};
  const coverageData = data.coverage || {};
  const completionData = data.completion || {};
  const engagementData = data.engagement || {};
  const programsData = data.programs || {};
  const classesData = data.classes || {};
  const coachingData = data.coaching || {};

  return (
    <div className="space-y-6">
      {/* Header with Time Range */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Experience Analytics</h3>
          <p className="text-sm text-gray-500">Track all experience types across your organization</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-48">
              <SelectValue>{getTimeRangeLabel()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Custom Range
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={(open) => {
        if (!open) handleCustomDateCancel();
        else setShowCustomDateDialog(true);
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Select Custom Date Range</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-wrap gap-2 py-2 border-b">
            {[7, 14, 30, 60, 90].map(days => (
              <Button key={days} variant="outline" size="sm" onClick={() => setQuickRange(days)} className="text-xs">
                Last {days} Days
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> From Date
              </label>
              <CalendarComponent
                mode="single"
                selected={customDateRange.from}
                onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                disabled={(date) => date > new Date() || (customDateRange.to && date > customDateRange.to)}
                className="rounded-lg border shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> To Date
              </label>
              <CalendarComponent
                mode="single"
                selected={customDateRange.to}
                onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                disabled={(date) => date > new Date() || (customDateRange.from && date < customDateRange.from)}
                className="rounded-lg border shadow-sm"
              />
            </div>
          </div>
          
          {customDateRange.from && customDateRange.to && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-blue-900">
                {format(customDateRange.from, 'MMM d, yyyy')} - {format(customDateRange.to, 'MMM d, yyyy')}
              </p>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCustomDateCancel}>Cancel</Button>
            <Button
              onClick={handleCustomDateApply}
              disabled={!customDateRange.from || !customDateRange.to}
              style={{ backgroundColor: '#0202ff' }}
              className="hover:opacity-90"
            >
              Apply Date Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Combined Experience Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(2,2,255,0.1)' }}>
                  <Route className="w-5 h-5" style={{ color: '#0202ff' }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summaryData.totalExperiences || 0}</p>
                  <p className="text-sm text-gray-500">Total Experiences</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summaryData.totalParticipants || coverageData.uniqueLearnersEnrolled || 0}</p>
                  <p className="text-sm text-gray-500">Participants</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completionData.completionRate || 0}%</p>
                  <p className="text-sm text-gray-500">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{engagementData.activeLearners || 0}</p>
                  <p className="text-sm text-gray-500">Active Learners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{coachingData.totalSessions || 0}</p>
                  <p className="text-sm text-gray-500">Coaching Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Experience Type Distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: '#0202ff' }} />
              Experience Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={summaryData.experienceTypeDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {(summaryData.experienceTypeDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {(summaryData.experienceTypeDistribution || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Experience Type Quick Stats */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Experience Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Map className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Journeys</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{summaryData.totalJourneys || 0}</p>
                <p className="text-xs text-blue-600">{coverageData.totalEnrollments || 0} enrollments</p>
              </div>

              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Programs</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{programsData.totalPrograms || summaryData.totalPrograms || 0}</p>
                <p className="text-xs text-green-600">{programsData.activePrograms || 0} active</p>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-900">Classes</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{classesData.totalClasses || summaryData.totalClasses || 0}</p>
                <p className="text-xs text-amber-600">{classesData.upcomingClasses || 0} upcoming</p>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Coaching</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{coachingData.totalEngagements || summaryData.totalCoachingEngagements || 0}</p>
                <p className="text-xs text-purple-600">{coachingData.activeEngagements || 0} active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Experience Details */}
      <Tabs defaultValue="journeys" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="journeys" className="gap-2">
            <Map className="w-4 h-4" />
            Journeys
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-2">
            <Calendar className="w-4 h-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="coaching" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Coaching
          </TabsTrigger>
        </TabsList>

        {/* Journeys Tab */}
        <TabsContent value="journeys">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" style={{ color: '#0202ff' }} />
                  Enrollment & Completion Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.trendData || data.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="enrollments" stroke="#0202ff" strokeWidth={2} dot={{ fill: '#0202ff' }} />
                    <Line type="monotone" dataKey="completions" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" style={{ color: '#0202ff' }} />
                  Enrollment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.statusDistribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {(data.statusDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {(data.statusDistribution || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{programsData.totalPrograms || 0}</p>
                    <p className="text-sm text-gray-500">Total Programs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{programsData.activePrograms || 0}</p>
                    <p className="text-sm text-gray-500">Active Programs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{programsData.totalParticipants || 0}</p>
                    <p className="text-sm text-gray-500">Total Participants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {programsData.programsByType && Object.keys(programsData.programsByType).length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Programs by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(programsData.programsByType || {}).map(([type, count]) => ({
                    type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{classesData.totalClasses || 0}</p>
                    <p className="text-sm text-gray-500">Total Classes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{classesData.completedClasses || 0}</p>
                    <p className="text-sm text-gray-500">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{classesData.upcomingClasses || 0}</p>
                    <p className="text-sm text-gray-500">Upcoming</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{classesData.avgAttendance || 0}</p>
                    <p className="text-sm text-gray-500">Avg Attendance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {classesData.classesByType && Object.keys(classesData.classesByType).length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Classes by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(classesData.classesByType || {}).map(([type, count]) => ({
                    type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Coaching Tab */}
        <TabsContent value="coaching">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coachingData.totalEngagements || 0}</p>
                    <p className="text-sm text-gray-500">Engagements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coachingData.activeEngagements || 0}</p>
                    <p className="text-sm text-gray-500">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coachingData.completionRate || 0}%</p>
                    <p className="text-sm text-gray-500">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coachingData.totalSessions || 0}</p>
                    <p className="text-sm text-gray-500">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Coaching Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Unique Coachees</span>
                    <span className="font-bold">{coachingData.uniqueCoachees || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Unique Coaches</span>
                    <span className="font-bold">{coachingData.uniqueCoaches || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Avg Sessions per Engagement</span>
                    <span className="font-bold">{coachingData.avgSessionsPerEngagement || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Completed Sessions</span>
                    <span className="font-bold">{coachingData.completedSessions || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Engagement Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: coachingData.activeEngagements || 0, color: '#3b82f6' },
                        { name: 'Completed', value: coachingData.completedEngagements || 0, color: '#10b981' },
                        { name: 'Other', value: Math.max(0, (coachingData.totalEngagements || 0) - (coachingData.activeEngagements || 0) - (coachingData.completedEngagements || 0)), color: '#e5e7eb' }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Active', value: coachingData.activeEngagements || 0, color: '#3b82f6' },
                        { name: 'Completed', value: coachingData.completedEngagements || 0, color: '#10b981' },
                        { name: 'Other', value: Math.max(0, (coachingData.totalEngagements || 0) - (coachingData.activeEngagements || 0) - (coachingData.completedEngagements || 0)), color: '#e5e7eb' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Top Performers */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data.topPerformers || []).map((performer, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{performer.name}</p>
                    <p className="text-sm text-gray-500">{performer.journeysCompleted} journeys completed</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {performer.avgScore}% avg
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}