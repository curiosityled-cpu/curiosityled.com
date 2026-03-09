import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowLeft,
  BookOpen,
  User,
  Calendar,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { format, subDays, isAfter, isBefore, addMonths, startOfDay, addDays } from "date-fns";
import { createPageUrl } from "@/utils";

export default function JourneyDetails() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [sortField, setSortField] = useState('enrolled_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [dateRange, setDateRange] = useState('all');

  // Metrics
  const [metrics, setMetrics] = useState({
    totalEnrolled: 0,
    completionRate: 0,
    avgTimeToComplete: 0,
    activelearners: 0
  });

  const [moduleCompletion, setModuleCompletion] = useState([]);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    if (user) {
      loadJourneyDetails();
    }
  }, [user]);

  useEffect(() => {
    if (journey && enrollments.length > 0) {
      calculateTrendData();
    }
  }, [dateRange, journey, enrollments]);

  const loadJourneyDetails = async () => {
    setLoading(true);
    try {
      // Get journeyId from URL
      const urlParams = new URLSearchParams(window.location.search);
      const journeyId = urlParams.get('journeyId');

      if (!journeyId) {
        console.error('No journey ID provided');
        navigate(createPageUrl('JourneyAnalytics'));
        return;
      }

      // Load journey data
      const [journeyData, allEnrollments, users] = await Promise.all([
        base44.entities.LearningJourney.filter({ id: journeyId }),
        base44.entities.JourneyEnrollment.filter({ journey_id: journeyId }),
        base44.entities.User.list()
      ]);

      if (!journeyData || journeyData.length === 0) {
        console.error('Journey not found');
        navigate(createPageUrl('JourneyAnalytics'));
        return;
      }

      setJourney(journeyData[0]);
      setEnrollments(allEnrollments);
      setAllUsers(users);

      // Calculate metrics
      const totalEnrolled = allEnrollments.length;
      const completed = allEnrollments.filter(e => e.status === 'completed').length;
      const active = allEnrollments.filter(e => e.status === 'in_progress').length;
      const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0;

      // Calculate average time to complete
      const completedWithDates = allEnrollments.filter(e => 
        e.status === 'completed' && e.enrolled_date && e.completed_date
      );
      const avgDays = completedWithDates.length > 0
        ? Math.round(
            completedWithDates.reduce((sum, e) => {
              const start = new Date(e.enrolled_date);
              const end = new Date(e.completed_date);
              return sum + Math.floor((end - start) / (1000 * 60 * 60 * 24));
            }, 0) / completedWithDates.length
          )
        : 0;

      setMetrics({
        totalEnrolled,
        completionRate,
        avgTimeToComplete: avgDays,
        activeLearners: active
      });

      // Calculate module completion
      if (journeyData[0].content_structure && journeyData[0].content_structure.length > 0) {
        const moduleStats = journeyData[0].content_structure.map(module => {
          const completedCount = allEnrollments.filter(e => {
            if (!e.content_progress) return false;
            const moduleProgress = e.content_progress.find(p => p.learning_resource_id === module.learning_resource_id);
            return moduleProgress && moduleProgress.status === 'completed';
          }).length;

          return {
            title: module.title || `Module ${module.order || 'N/A'}`,
            completionRate: totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0,
            completedCount,
            totalCount: totalEnrolled
          };
        });

        setModuleCompletion(moduleStats);
      }

    } catch (error) {
      console.error('Error loading journey details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrendData = () => {
    const cutoffDate = dateRange === '3months' ? subDays(new Date(), 90) :
                       dateRange === '6months' ? subDays(new Date(), 180) :
                       dateRange === '12months' ? subDays(new Date(), 365) :
                       new Date(0);
    const endDate = startOfDay(addDays(new Date(), 1));

    const dataPoints = [];
    let currentDate = startOfDay(cutoffDate);

    while (isBefore(currentDate, endDate)) {
      const monthStart = currentDate;
      const monthEnd = startOfDay(addMonths(currentDate, 1));
      
      const monthEnrollments = enrollments.filter(e => {
        const enrolledDate = new Date(e.enrolled_date);
        return isAfter(enrolledDate, monthStart) && isBefore(enrolledDate, monthEnd);
      });

      const monthCompletions = enrollments.filter(e => {
        if (!e.completed_date) return false;
        const completedDate = new Date(e.completed_date);
        return isAfter(completedDate, monthStart) && isBefore(completedDate, monthEnd);
      });

      dataPoints.push({
        month: format(currentDate, 'MMM yy'),
        enrollments: monthEnrollments.length,
        completions: monthCompletions.length
      });

      currentDate = monthEnd;
    }

    setTrendData(dataPoints);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedEnrollments = () => {
    const sorted = [...enrollments].sort((a, b) => {
      let aVal, bVal;

      switch(sortField) {
        case 'name':
          const aUser = allUsers.find(u => u.email === a.user_email);
          const bUser = allUsers.find(u => u.email === b.user_email);
          aVal = aUser?.full_name || '';
          bVal = bUser?.full_name || '';
          break;
        case 'email':
          aVal = a.user_email || '';
          bVal = b.user_email || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'progress':
          aVal = a.completion_percentage || 0;
          bVal = b.completion_percentage || 0;
          break;
        case 'enrolled_date':
          aVal = new Date(a.enrolled_date || 0);
          bVal = new Date(b.enrolled_date || 0);
          break;
        case 'completed_date':
          aVal = new Date(a.completed_date || 0);
          bVal = new Date(b.completed_date || 0);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const handleUserClick = (enrollment) => {
    setSelectedUser(enrollment);
    setShowUserDetail(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'not_started': 'bg-gray-100 text-gray-800',
      'dropped': 'bg-red-100 text-red-800'
    };
    return styles[status] || styles['not_started'];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Journey Not Found</h2>
          <p className="text-gray-600 mb-4">The journey you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate(createPageUrl('JourneyAnalytics'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Journey Analytics
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('JourneyAnalytics'))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Journey Analytics
          </Button>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{journey.title}</h1>
                  <Badge className={
                    journey.status === 'published' ? 'bg-green-100 text-green-800' :
                    journey.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {journey.status}
                  </Badge>
                  <Badge variant="outline">
                    {journey.type === 'curriculum' ? 'Curriculum' : 'Learning Path'}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{journey.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Created by {journey.author_email}</span>
                  </div>
                  {journey.estimated_duration_days && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{journey.estimated_duration_days} days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalEnrolled}</p>
                <p className="text-sm text-gray-600 mt-1">Total Enrolled</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{metrics.completionRate}%</p>
                <p className="text-sm text-gray-600 mt-1">Completion Rate</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{metrics.avgTimeToComplete}</p>
                <p className="text-sm text-gray-600 mt-1">Avg Days to Complete</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{metrics.activeLearners}</p>
                <p className="text-sm text-gray-600 mt-1">Active Learners</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Module Completion Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Module Completion Rates</CardTitle>
                <p className="text-sm text-gray-600">Completion rate for each resource in this journey</p>
              </CardHeader>
              <CardContent>
                {moduleCompletion.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={moduleCompletion}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="title" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="completionRate" fill="#3b82f6" name="Completion %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No module data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Enrollment & Completion Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Enrollment & Completion Trend</CardTitle>
                    <p className="text-sm text-gray-600">Monthly enrollments and completions</p>
                  </div>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3months">3 Months</SelectItem>
                      <SelectItem value="6months">6 Months</SelectItem>
                      <SelectItem value="12months">12 Months</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="enrollments" stroke="#3b82f6" strokeWidth={2} name="Enrollments" />
                    <Line type="monotone" dataKey="completions" stroke="#10b981" strokeWidth={2} name="Completions" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Learner Progress Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Learner Progress</CardTitle>
              <p className="text-sm text-gray-600">Detailed progress for each enrolled learner</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                        <div className="flex items-center gap-1">
                          Email
                          {sortField === 'email' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1">
                          Status
                          {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('progress')}>
                        <div className="flex items-center gap-1">
                          Progress
                          {sortField === 'progress' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('enrolled_date')}>
                        <div className="flex items-center gap-1">
                          Enrolled
                          {sortField === 'enrolled_date' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('completed_date')}>
                        <div className="flex items-center gap-1">
                          Completed
                          {sortField === 'completed_date' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedEnrollments().map((enrollment) => {
                      const learner = allUsers.find(u => u.email === enrollment.user_email);
                      return (
                        <TableRow 
                          key={enrollment.id} 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleUserClick(enrollment)}
                        >
                          <TableCell className="font-medium">
                            {learner?.full_name || 'Unknown User'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {enrollment.user_email}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(enrollment.status)}>
                              {enrollment.status?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={enrollment.completion_percentage || 0} className="w-24 h-2" />
                              <span className="text-sm font-medium">{enrollment.completion_percentage || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {enrollment.enrolled_date ? format(new Date(enrollment.enrolled_date), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {enrollment.completed_date ? format(new Date(enrollment.completed_date), 'MMM d, yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Learner Progress Detail</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {allUsers.find(u => u.email === selectedUser.user_email)?.full_name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedUser.user_email}</p>
                </div>
                <div className="ml-auto">
                  <Badge className={getStatusBadge(selectedUser.status)}>
                    {selectedUser.status?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedUser.completion_percentage || 0}%</p>
                  <p className="text-sm text-gray-600">Overall Progress</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedUser.enrolled_date ? format(new Date(selectedUser.enrolled_date), 'MMM d, yyyy') : '-'}
                  </p>
                  <p className="text-sm text-gray-600">Enrolled Date</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedUser.completed_date ? format(new Date(selectedUser.completed_date), 'MMM d, yyyy') : '-'}
                  </p>
                  <p className="text-sm text-gray-600">Completed Date</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Module Progress</h4>
                <div className="space-y-3">
                  {journey.content_structure && journey.content_structure.map((module, idx) => {
                    const moduleProgress = selectedUser.content_progress?.find(
                      p => p.learning_resource_id === module.learning_resource_id
                    );
                    const isCompleted = moduleProgress?.status === 'completed';
                    const isInProgress = moduleProgress?.status === 'in_progress';

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : isInProgress ? (
                            <Clock className="w-5 h-5 text-blue-600" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{module.title || `Module ${module.order || idx + 1}`}</p>
                            {moduleProgress?.completed_date && (
                              <p className="text-xs text-gray-600">
                                Completed: {format(new Date(moduleProgress.completed_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={
                          isCompleted ? 'bg-green-100 text-green-800' :
                          isInProgress ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}