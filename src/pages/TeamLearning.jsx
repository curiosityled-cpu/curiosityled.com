import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, BookOpen, TrendingUp, CheckCircle2, Clock, Award, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";

export default function TeamLearning() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [learnerProgress, setLearnerProgress] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.subordinate_emails || user.subordinate_emails.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [members, assigned, progress] = await Promise.all([
        base44.entities.User.filter({ email: { $in: user.subordinate_emails } }),
        base44.entities.AssignedLearning.filter({ user_email: { $in: user.subordinate_emails } }),
        base44.entities.LearnerProgress.filter({ user_email: { $in: user.subordinate_emails } })
      ]);

      setTeamMembers(members || []);
      setAssignedLearning(assigned || []);
      setLearnerProgress(progress || []);
    } catch (error) {
      console.error('Error loading team learning data:', error);
      toast.error('Failed to load team learning data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      not_started: { label: 'Not Started', className: 'bg-gray-100 text-gray-800' },
      assigned: { label: 'Assigned', className: 'bg-blue-100 text-blue-800' },
      started: { label: 'Started', className: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' }
    };
    const config = statusConfig[status] || statusConfig.not_started;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getMemberStats = (memberEmail) => {
    const memberAssignments = assignedLearning.filter(a => a.user_email === memberEmail);
    const memberProgressRecords = learnerProgress.filter(p => p.user_email === memberEmail);

    const assigned = memberAssignments.length;
    const completed = memberAssignments.filter(a => a.status === 'completed').length;
    const inProgress = memberAssignments.filter(a => a.status === 'in_progress' || a.status === 'started').length;
    const avgProgress = memberProgressRecords.length > 0
      ? Math.round(memberProgressRecords.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / memberProgressRecords.length)
      : 0;

    return { assigned, completed, inProgress, avgProgress };
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter !== "all") {
      const memberAssignments = assignedLearning.filter(a => a.user_email === member.email);
      if (statusFilter === "completed") {
        return memberAssignments.some(a => a.status === 'completed');
      } else if (statusFilter === "in_progress") {
        return memberAssignments.some(a => a.status === 'in_progress' || a.status === 'started');
      } else if (statusFilter === "not_started") {
        return memberAssignments.some(a => a.status === 'assigned' || a.status === 'not_started');
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading team learning data...</p>
        </div>
      </div>
    );
  }

  if (!user?.subordinate_emails || user.subordinate_emails.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Team Members</h3>
          <p className="text-gray-600">
            You don't have any direct reports assigned yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Team Members</p>
            <p className="text-3xl font-bold text-gray-900">{teamMembers.length}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Assignments</p>
            <p className="text-3xl font-bold text-gray-900">{assignedLearning.length}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">In Progress</p>
            <p className="text-3xl font-bold text-gray-900">
              {assignedLearning.filter(a => a.status === 'in_progress' || a.status === 'started').length}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-gray-900">
              {assignedLearning.filter(a => a.status === 'completed').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Members List */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Team Members Found</h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== "all"
                  ? 'Try adjusting your search or filters'
                  : 'Your direct reports will appear here'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map((member, index) => {
            const stats = getMemberStats(member.email);
            const memberAssignments = assignedLearning.filter(a => a.user_email === member.email);

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{member.full_name}</CardTitle>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                      <Badge variant="outline">{member.app_role}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
                        <p className="text-xs text-gray-600">Assigned</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                        <p className="text-xs text-gray-600">In Progress</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{stats.avgProgress}%</p>
                        <p className="text-xs text-gray-600">Avg Progress</p>
                      </div>
                    </div>

                    {/* Assignments List */}
                    {memberAssignments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-700">Recent Assignments:</h4>
                        {memberAssignments.slice(0, 3).map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{assignment.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(assignment.status)}
                                {assignment.due_date && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Clock className="w-3 h-3" />
                                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {memberAssignments.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{memberAssignments.length - 3} more assignments
                          </p>
                        )}
                      </div>
                    )}

                    {memberAssignments.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No learning assignments yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}