import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Brain, Plus, Search, MoreHorizontal, Edit, Trash2, Users, Eye,
  Loader2, CheckCircle, Clock, Play, Pause, Copy, Send, BarChart3,
  FileText, TrendingUp, AlertTriangle, Award, Target, Filter, ClipboardList
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-slate-100 text-slate-800'
};

const COLORS = {
  atRisk: '#ef4444',
  developing: '#f59e0b',
  proficient: '#3b82f6',
  expert: '#10b981'
};

export default function AssessmentManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assessments');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Data states
  const [customAssessments, setCustomAssessments] = useState([]);
  const [assessmentSubmissions, setAssessmentSubmissions] = useState([]);
  const [leadershipAssessments, setLeadershipAssessments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [cohorts, setCohorts] = useState([]);

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assignmentType, setAssignmentType] = useState('individual');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customAssessmentsData, submissionsData, leadershipData, usersData, cohortsData] = await Promise.all([
        base44.entities.CustomAssessment.list('-created_date'),
        base44.entities.AssessmentSubmission.list(),
        base44.entities.Assessment.list(),
        base44.entities.User.list(),
        base44.entities.Cohort.list()
      ]);

      setCustomAssessments(customAssessmentsData || []);
      setAssessmentSubmissions(submissionsData || []);
      setLeadershipAssessments(leadershipData || []);
      setAllUsers(usersData || []);
      setCohorts(cohortsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  // Get all assessments visible to this program manager (all in their client)
  const myCreatedAssessments = useMemo(() => {
    return customAssessments;
  }, [customAssessments]);

  // Get submissions for assessments I created
  const myAssessmentSubmissions = useMemo(() => {
    const myAssessmentIds = new Set(myCreatedAssessments.map(a => a.id));
    return assessmentSubmissions.filter(s => myAssessmentIds.has(s.assessment_id));
  }, [assessmentSubmissions, myCreatedAssessments]);

  // Analytics for my assessments
  const analytics = useMemo(() => {
    const totalAssessments = myCreatedAssessments.length;
    const publishedCount = myCreatedAssessments.filter(a => a.status === 'published').length;
    const totalSubmissions = myAssessmentSubmissions.length;
    const completedSubmissions = myAssessmentSubmissions.filter(s => s.status === 'completed' || s.status === 'graded').length;
    const avgScore = totalSubmissions > 0
      ? Math.round(myAssessmentSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / totalSubmissions)
      : 0;
    const passRate = totalSubmissions > 0
      ? Math.round((myAssessmentSubmissions.filter(s => s.passed).length / totalSubmissions) * 100)
      : 0;

    return {
      totalAssessments,
      publishedCount,
      totalSubmissions,
      completedSubmissions,
      avgScore,
      passRate
    };
  }, [myCreatedAssessments, myAssessmentSubmissions]);

  // Chart data for analytics
  const chartData = useMemo(() => {
    // Score distribution
    const scoreDistribution = [
      { name: 'Failed (<70%)', value: myAssessmentSubmissions.filter(s => (s.percentage || 0) < 70).length, color: COLORS.atRisk },
      { name: 'Passing (70-84%)', value: myAssessmentSubmissions.filter(s => (s.percentage || 0) >= 70 && (s.percentage || 0) < 85).length, color: COLORS.proficient },
      { name: 'Excellent (85%+)', value: myAssessmentSubmissions.filter(s => (s.percentage || 0) >= 85).length, color: COLORS.expert }
    ];

    // Submissions by assessment
    const submissionsByAssessment = myCreatedAssessments.map(assessment => {
      const submissions = myAssessmentSubmissions.filter(s => s.assessment_id === assessment.id);
      return {
        name: assessment.title?.substring(0, 20) || 'Untitled',
        submissions: submissions.length,
        avgScore: submissions.length > 0
          ? Math.round(submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length)
          : 0
      };
    });

    return { scoreDistribution, submissionsByAssessment };
  }, [myCreatedAssessments, myAssessmentSubmissions]);

  const filteredAssessments = myCreatedAssessments.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (assessment, newStatus) => {
    try {
      await base44.entities.CustomAssessment.update(assessment.id, { status: newStatus });
      toast.success(`Assessment ${newStatus}`);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDuplicate = async (assessment) => {
    try {
      const { id, created_date, updated_date, created_by, ...assessmentData } = assessment;
      await base44.entities.CustomAssessment.create({
        ...assessmentData,
        title: `${assessment.title} (Copy)`,
        status: 'draft'
      });
      toast.success('Assessment duplicated');
      loadData();
    } catch (error) {
      console.error('Error duplicating assessment:', error);
      toast.error('Failed to duplicate');
    }
  };

  const handleDelete = async (assessment) => {
    if (!confirm(`Delete "${assessment.title}"? This cannot be undone.`)) return;

    try {
      await base44.entities.CustomAssessment.delete(assessment.id);
      toast.success('Assessment deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast.error('Failed to delete assessment');
    }
  };

  const openAssignModal = (assessment) => {
    setSelectedAssessment(assessment);
    setAssignmentType('individual');
    setSelectedUsers([]);
    setSelectedCohort('');
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedAssessment) return;
    
    setAssigning(true);
    try {
      let targetEmails = [];
      
      if (assignmentType === 'individual') {
        targetEmails = selectedUsers;
      } else if (assignmentType === 'cohort' && selectedCohort) {
        const cohort = cohorts.find(c => c.id === selectedCohort);
        targetEmails = cohort?.participant_emails || [];
      }

      if (targetEmails.length === 0) {
        toast.error('Please select at least one recipient');
        return;
      }

      // Update the assessment with assigned user emails
      const existingAssigned = selectedAssessment.assigned_user_emails || [];
      const newAssigned = [...new Set([...existingAssigned, ...targetEmails])];
      await base44.entities.CustomAssessment.update(selectedAssessment.id, {
        assigned_user_emails: newAssigned
      });

      // Create notifications for each user
      for (const email of targetEmails) {
        await base44.entities.Notification.create({
          user_email: email,
          type: 'assessment_due',
          title: `New Assessment: ${selectedAssessment.title}`,
          message: `You have been assigned a new assessment: ${selectedAssessment.title}. Please complete it at your earliest convenience.`,
          related_entity_type: 'CustomAssessment',
          related_entity_id: selectedAssessment.id,
          priority: 'medium',
          status: 'pending'
        });
      }

      toast.success(`Assessment assigned to ${targetEmails.length} participant(s)`);
      setShowAssignModal(false);
    } catch (error) {
      console.error('Error assigning assessment:', error);
      toast.error('Failed to assign assessment');
    } finally {
      setAssigning(false);
    }
  };

  const toggleUserSelection = (email) => {
    setSelectedUsers(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Management</h2>
          <p className="text-gray-600">Create, launch, and track custom assessments and quizzes</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link to={createPageUrl('CustomAssessmentBuilder')}>
            <Plus className="w-4 h-4 mr-2" />New Assessment
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.totalAssessments}</p>
              <p className="text-sm text-gray-600">Assessments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.publishedCount}</p>
              <p className="text-sm text-gray-600">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.totalSubmissions}</p>
              <p className="text-sm text-gray-600">Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.completedSubmissions}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.avgScore}%</p>
              <p className="text-sm text-gray-600">Avg Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.passRate}%</p>
              <p className="text-sm text-gray-600">Pass Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assessments" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            My Assessments
            <Badge variant="secondary" className="ml-1">{myCreatedAssessments.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2">
            <FileText className="w-4 h-4" />
            Submissions
            <Badge variant="secondary" className="ml-1">{myAssessmentSubmissions.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* My Assessments Tab */}
        <TabsContent value="assessments" className="mt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assessments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredAssessments.map((assessment) => {
                const submissions = myAssessmentSubmissions.filter(s => s.assessment_id === assessment.id);
                const completedCount = submissions.filter(s => s.status === 'completed' || s.status === 'graded').length;
                const avgScore = submissions.length > 0
                  ? Math.round(submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length)
                  : 0;

                return (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{assessment.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {assessment.type === 'quiz' ? 'Quiz' : assessment.type === 'knowledge_check' ? 'Knowledge Check' : 'Assessment'}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`${createPageUrl('CustomAssessmentBuilder')}?id=${assessment.id}`}>
                                  <Edit className="w-4 h-4 mr-2" />Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(assessment)}>
                                <Copy className="w-4 h-4 mr-2" />Duplicate
                              </DropdownMenuItem>
                              {assessment.status === 'published' && (
                                <DropdownMenuItem onClick={() => openAssignModal(assessment)}>
                                  <Send className="w-4 h-4 mr-2" />Assign
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {assessment.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(assessment, 'published')}>
                                  <Play className="w-4 h-4 mr-2" />Publish
                                </DropdownMenuItem>
                              )}
                              {assessment.status === 'published' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(assessment, 'archived')}>
                                  <Pause className="w-4 h-4 mr-2" />Archive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(assessment)}>
                                <Trash2 className="w-4 h-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                          <Badge className={STATUS_COLORS[assessment.status || 'draft']}>
                          {assessment.status || 'draft'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                          {assessment.visibility === 'public' ? 'Public' : 'Private'}
                          </Badge>
                          </div>

                          {assessment.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{assessment.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              <span>{assessment.config?.questions?.length || 0} questions</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{submissions.length} submissions</span>
                            </div>
                          </div>

                          {submissions.length > 0 && (
                            <div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Avg Score</span>
                                <span>{avgScore}%</span>
                              </div>
                              <Progress value={avgScore} className="h-2" />
                              <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>{completedCount} completed</span>
                                <span>Pass: {assessment.passing_score_percentage || 70}%</span>
                              </div>
                            </div>
                          )}

                          {assessment.status === 'published' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => openAssignModal(assessment)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Assign to Participants
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredAssessments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No assessments found</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to={createPageUrl('CustomAssessmentBuilder')}>Create Your First Assessment</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Score Distribution</CardTitle>
                <CardDescription>Performance breakdown across all submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {myAssessmentSubmissions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartData.scoreDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {chartData.scoreDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    No submission data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submissions by Assessment */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Submissions by Assessment</CardTitle>
                <CardDescription>Completion and average scores per assessment</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.submissionsByAssessment.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData.submissionsByAssessment}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="submissions" fill="#3b82f6" name="Submissions" />
                      <Bar dataKey="avgScore" fill="#10b981" name="Avg Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    No assessment data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">All Submissions</CardTitle>
              <CardDescription>Submissions for assessments you created</CardDescription>
            </CardHeader>
            <CardContent>
              {myAssessmentSubmissions.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Passed</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myAssessmentSubmissions.map((submission) => {
                        const assessment = myCreatedAssessments.find(a => a.id === submission.assessment_id);
                        const participant = allUsers.find(u => u.email === submission.user_email);
                        
                        return (
                          <TableRow key={submission.id}>
                            <TableCell className="font-medium">
                              {participant?.full_name || submission.user_email}
                            </TableCell>
                            <TableCell>{assessment?.title || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{submission.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`font-semibold ${(submission.percentage || 0) >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                {submission.percentage || 0}%
                              </span>
                            </TableCell>
                            <TableCell>
                              {submission.passed ? (
                                <Badge className="bg-green-100 text-green-800">Passed</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">Failed</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {submission.submission_date 
                                ? format(new Date(submission.submission_date), 'MMM d, yyyy')
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No submissions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assignment Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Assessment</DialogTitle>
            <DialogDescription>
              Send "{selectedAssessment?.title}" to participants
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Assignment Type</label>
              <Select value={assignmentType} onValueChange={setAssignmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Users</SelectItem>
                  <SelectItem value="cohort">Cohort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignmentType === 'individual' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select Users ({selectedUsers.length} selected)</label>
                <ScrollArea className="h-64 border rounded-lg p-2">
                  <div className="space-y-2">
                    {allUsers.map((u) => (
                      <div 
                        key={u.id} 
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => toggleUserSelection(u.email)}
                      >
                        <Checkbox checked={selectedUsers.includes(u.email)} />
                        <div>
                          <p className="font-medium text-sm">{u.full_name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {assignmentType === 'cohort' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select Cohort</label>
                <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort.participant_emails?.length || 0} participants)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning} className="bg-blue-600 hover:bg-blue-700">
              {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Assign Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}