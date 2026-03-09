import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Map,
  Search,
  Filter,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  TrendingUp,
  BarChart3,
  FileText
} from "lucide-react";
import AssignOnboardingPlanModal from "@/components/assignment/AssignOnboardingPlanModal";
import AssignJourneyModal from "@/components/assignment/AssignJourneyModal";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";

export default function TeamJourneysView() {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAssignOnboardingModal, setShowAssignOnboardingModal] = useState(false);
  const [showAssignJourneyModal, setShowAssignJourneyModal] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [user]);

  const loadTeamData = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get team members (subordinates)
      const subordinateEmails = user.subordinate_emails || [];
      
      // Get all journeys
      let allJourneys = [];
      try {
        allJourneys = await base44.entities.LearningJourney.list('-created_date');
      } catch (e) {
        console.warn('Could not load journeys:', e);
      }

      // Get all enrollments for team members
      let allEnrollments = [];
      try {
        allEnrollments = await base44.entities.JourneyEnrollment.list('-enrolled_date');
        if (subordinateEmails.length > 0) {
          allEnrollments = allEnrollments.filter(e => subordinateEmails.includes(e.user_email));
        }
      } catch (e) {
        console.warn('Could not load enrollments:', e);
      }

      // Get team member details
      let members = [];
      if (subordinateEmails.length > 0) {
        try {
          members = await base44.entities.User.filter({ email: { $in: subordinateEmails } });
        } catch (e) {
          console.warn('Could not load team members:', e);
        }
      }

      setTeamMembers(members);
      setJourneys(allJourneys);
      setEnrollments(allEnrollments);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamMemberProgress = (memberEmail) => {
    const memberEnrollments = enrollments.filter(e => e.user_email === memberEmail);
    const totalEnrollments = memberEnrollments.length;
    const completedEnrollments = memberEnrollments.filter(e => e.status === 'completed').length;
    const inProgressEnrollments = memberEnrollments.filter(e => e.status === 'in_progress').length;
    const avgProgress = totalEnrollments > 0 
      ? Math.round(memberEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / totalEnrollments)
      : 0;

    return { totalEnrollments, completedEnrollments, inProgressEnrollments, avgProgress };
  };

  const getJourneyStats = () => {
    const totalEnrollments = enrollments.length;
    const completedCount = enrollments.filter(e => e.status === 'completed').length;
    const inProgressCount = enrollments.filter(e => e.status === 'in_progress').length;
    const notStartedCount = enrollments.filter(e => e.status === 'not_started' || !e.status).length;
    const avgCompletion = totalEnrollments > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / totalEnrollments)
      : 0;

    return { totalEnrollments, completedCount, inProgressCount, notStartedCount, avgCompletion };
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = !searchTerm || 
      member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    
    const progress = getTeamMemberProgress(member.email);
    if (statusFilter === "completed") return matchesSearch && progress.completedEnrollments > 0;
    if (statusFilter === "in_progress") return matchesSearch && progress.inProgressEnrollments > 0;
    if (statusFilter === "not_started") return matchesSearch && progress.totalEnrollments === 0;
    
    return matchesSearch;
  });

  const stats = getJourneyStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
                <p className="text-sm text-gray-500">Team Members</p>
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
                <p className="text-2xl font-bold">{stats.completedCount}</p>
                <p className="text-sm text-gray-500">Completed</p>
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
                <p className="text-2xl font-bold">{stats.inProgressCount}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgCompletion}%</p>
                <p className="text-sm text-gray-500">Avg Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: '#0202ff' }} />
              Team Experience Progress
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-center">Experiences Enrolled</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">In Progress</TableHead>
                  <TableHead>Avg Progress</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member, idx) => {
                  const progress = getTeamMemberProgress(member.email);
                  return (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                            {member.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{progress.totalEnrollments}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-800">{progress.completedEnrollments}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-amber-100 text-amber-800">{progress.inProgressEnrollments}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress.avgProgress} className="h-2 w-24" />
                          <span className="text-sm font-medium">{progress.avgProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {teamMembers.length === 0 
                  ? "No team members found. Add subordinates to your profile to see their progress."
                  : "No team members match your filters."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Quick Actions</h3>
              <p className="text-sm text-gray-600">Create and assign learning resources</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowAssignOnboardingModal(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Assign Onboarding Plan
              </Button>
              <Button
                onClick={() => setShowAssignJourneyModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Map className="w-4 h-4 mr-2" />
                Assign Experience
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AssignOnboardingPlanModal
        isOpen={showAssignOnboardingModal}
        onClose={() => setShowAssignOnboardingModal(false)}
        onSuccess={loadTeamData}
      />

      <AssignJourneyModal
        isOpen={showAssignJourneyModal}
        onClose={() => setShowAssignJourneyModal(false)}
        onSuccess={loadTeamData}
      />
    </div>
  );
}