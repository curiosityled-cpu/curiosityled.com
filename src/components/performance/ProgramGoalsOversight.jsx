import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Target, Search, Filter, Users, CheckCircle, Clock, AlertTriangle, 
  Eye, MessageSquare, ThumbsUp, MoreVertical, Calendar, TrendingUp,
  ChevronRight, Loader2, FileText, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProgramGoalsOversight({ user, refreshTrigger }) {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [goals, setGoals] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  
  // Filters
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [selectedCohort, setSelectedCohort] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal state
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState("table"); // table or kanban

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load programs managed by this user
      const allPrograms = await base44.entities.Program.list();
      const managedPrograms = allPrograms.filter(p => 
        p.manager_emails?.includes(user.email) || 
        p.primary_manager_email === user.email ||
        p.program_manager_email === user.email
      );
      setPrograms(managedPrograms);

      // Get program IDs
      const programIds = managedPrograms.map(p => p.id);
      
      // Load cohorts for these programs
      const allCohorts = await base44.entities.Cohort.list();
      const programCohorts = allCohorts.filter(c => programIds.includes(c.program_id));
      setCohorts(programCohorts);

      // Load goals linked to these programs
      const allGoals = await base44.entities.Goal.list();
      const programGoals = allGoals.filter(g => 
        programIds.includes(g.program_id) || 
        g.coach_email === user.email
      );
      setGoals(programGoals);

      // Get unique participant emails from programs and cohorts
      const participantEmails = new Set();
      managedPrograms.forEach(p => {
        p.participant_emails?.forEach(e => participantEmails.add(e));
      });
      programCohorts.forEach(c => {
        c.participant_emails?.forEach(e => participantEmails.add(e));
      });

      // Load participant details
      if (participantEmails.size > 0) {
        const allUsers = await base44.entities.User.list();
        const programParticipants = allUsers.filter(u => participantEmails.has(u.email));
        setParticipants(programParticipants);
      }
    } catch (error) {
      console.error("Error loading program goals data:", error);
      toast.error("Failed to load program goals");
    } finally {
      setLoading(false);
    }
  };

  // Filter goals
  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      const matchesProgram = selectedProgram === "all" || goal.program_id === selectedProgram;
      const matchesStatus = selectedStatus === "all" || goal.status === selectedStatus;
      const matchesSearch = !searchTerm || 
        goal.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by cohort if selected
      let matchesCohort = selectedCohort === "all";
      if (selectedCohort !== "all") {
        const cohort = cohorts.find(c => c.id === selectedCohort);
        if (cohort) {
          matchesCohort = cohort.participant_emails?.includes(goal.created_by);
        }
      }
      
      return matchesProgram && matchesStatus && matchesSearch && matchesCohort;
    });
  }, [goals, selectedProgram, selectedCohort, selectedStatus, searchTerm, cohorts]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredGoals.length;
    const completed = filteredGoals.filter(g => g.status === 'archived' || g.progress === 100).length;
    const active = filteredGoals.filter(g => g.status === 'active').length;
    const atRisk = filteredGoals.filter(g => {
      if (!g.timeframe_end) return false;
      const dueDate = new Date(g.timeframe_end);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7 && daysUntilDue > 0 && g.progress < 80;
    }).length;
    const overdue = filteredGoals.filter(g => {
      if (!g.timeframe_end) return false;
      return new Date(g.timeframe_end) < new Date() && g.status !== 'archived';
    }).length;
    
    return { total, completed, active, atRisk, overdue };
  }, [filteredGoals]);

  // Get participant name by email
  const getParticipantName = (email) => {
    const participant = participants.find(p => p.email === email);
    return participant?.full_name || email;
  };

  // Get program name by ID
  const getProgramName = (programId) => {
    const program = programs.find(p => p.id === programId);
    return program?.name || "N/A";
  };

  // Handle goal approval
  const handleApproveGoal = async (goal) => {
    if (!hasPermission('program_goals.approve')) {
      toast.error("You don't have permission to approve goals");
      return;
    }
    
    setSubmitting(true);
    try {
      await base44.entities.Goal.update(goal.id, {
        status: 'active',
        metadata: {
          ...goal.metadata,
          approved_by: user.email,
          approved_at: new Date().toISOString()
        }
      });
      toast.success("Goal approved successfully");
      loadData();
    } catch (error) {
      console.error("Error approving goal:", error);
      toast.error("Failed to approve goal");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle adding comment
  const handleAddComment = async () => {
    if (!comment.trim() || !selectedGoal) return;
    
    setSubmitting(true);
    try {
      const existingComments = selectedGoal.metadata?.comments || [];
      await base44.entities.Goal.update(selectedGoal.id, {
        metadata: {
          ...selectedGoal.metadata,
          comments: [
            ...existingComments,
            {
              text: comment,
              author_email: user.email,
              author_name: user.full_name,
              created_at: new Date().toISOString()
            }
          ]
        }
      });
      toast.success("Comment added successfully");
      setComment("");
      setShowGoalModal(false);
      loadData();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (goal) => {
    if (goal.status === 'archived' || goal.progress === 100) {
      return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    }
    if (goal.status === 'draft') {
      return <Badge className="bg-gray-100 text-gray-700">Draft</Badge>;
    }
    
    // Check if overdue
    if (goal.timeframe_end && new Date(goal.timeframe_end) < new Date()) {
      return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
    }
    
    // Check if at risk
    if (goal.timeframe_end) {
      const dueDate = new Date(goal.timeframe_end);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 7 && goal.progress < 80) {
        return <Badge className="bg-amber-100 text-amber-700">At Risk</Badge>;
      }
    }
    
    return <Badge className="bg-blue-100 text-blue-700">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Programs Found</h3>
          <p className="text-gray-500">You are not currently managing any programs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
                <p className="text-xs text-gray-500">Total Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.completed}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.active}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.atRisk}</p>
                <p className="text-xs text-gray-500">At Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.overdue}</p>
                <p className="text-xs text-gray-500">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search goals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map(program => (
                  <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedCohort} onValueChange={setSelectedCohort}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Cohorts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {cohorts.map(cohort => (
                  <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Goals Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Program Goals</CardTitle>
              <CardDescription>
                {filteredGoals.length} goals across {programs.length} programs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGoals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No goals found matching your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredGoals.map((goal) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">{goal.title}</h4>
                          {getStatusBadge(goal)}
                        </div>
                        
                        <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                          {goal.description || "No description"}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {getParticipantName(goal.created_by)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {getProgramName(goal.program_id)}
                          </span>
                          {goal.timeframe_end && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {format(new Date(goal.timeframe_end), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <Progress value={goal.progress || 0} className="h-2 flex-1" />
                            <span className="text-xs font-medium text-gray-600">{goal.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setShowGoalModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {goal.status === 'draft' && hasPermission('program_goals.approve') && (
                              <DropdownMenuItem onClick={() => handleApproveGoal(goal)}>
                                <ThumbsUp className="w-4 h-4 mr-2" />
                                Approve Goal
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setSelectedGoal(goal);
                              setShowGoalModal(true);
                            }}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Add Comment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Goal Detail Modal */}
      <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGoal?.title}</DialogTitle>
            <DialogDescription>
              Goal details and feedback
            </DialogDescription>
          </DialogHeader>
          
          {selectedGoal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Participant</p>
                  <p className="font-medium">{getParticipantName(selectedGoal.created_by)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Program</p>
                  <p className="font-medium">{getProgramName(selectedGoal.program_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedGoal)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Progress</p>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedGoal.progress || 0} className="h-2 flex-1" />
                    <span className="text-sm font-medium">{selectedGoal.progress || 0}%</span>
                  </div>
                </div>
              </div>
              
              {selectedGoal.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-sm">{selectedGoal.description}</p>
                </div>
              )}
              
              {/* Comments Section */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Comments</p>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                  {(selectedGoal.metadata?.comments || []).length === 0 ? (
                    <p className="text-sm text-gray-400">No comments yet</p>
                  ) : (
                    selectedGoal.metadata.comments.map((c, i) => (
                      <div key={i} className="bg-gray-50 rounded p-2">
                        <p className="text-sm">{c.text}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {c.author_name} • {format(new Date(c.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                
                {hasPermission('program_goals.comment') && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={!comment.trim() || submitting}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}