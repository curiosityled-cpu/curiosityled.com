import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";

export default function TeamExperiences() {
  const { user, hasPermission, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamJourneys, setTeamJourneys] = useState([]);
  const [teamEnrollments, setTeamEnrollments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user]);

  const loadData = async () => {
    if (!user?.email || !user?.subordinate_emails) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [users, journeys, enrollments] = await Promise.all([
        base44.entities.User.filter({ 
          email: { $in: user.subordinate_emails } 
        }).catch(() => []),
        base44.entities.LearningJourney.filter({
          assigned_to_emails: { $elemMatch: { $in: user.subordinate_emails } }
        }).catch(() => []),
        base44.entities.JourneyEnrollment.filter({
          user_email: { $in: user.subordinate_emails }
        }, '-enrolled_date').catch(() => [])
      ]);

      setTeamMembers(users || []);
      setTeamJourneys(journeys || []);
      setTeamEnrollments(enrollments || []);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team experiences');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const csvData = [
        ['Team Experiences Report'],
        ['Generated:', new Date().toLocaleString()],
        ['Team Leader:', user.full_name],
        [''],
        ['Team Member', 'Enrolled Journeys', 'In Progress', 'Completed', 'Overall Progress'],
        ...teamMembers.map(member => {
          const memberEnrollments = teamEnrollments.filter(e => e.user_email === member.email);
          const completed = memberEnrollments.filter(e => e.status === 'completed').length;
          const inProgress = memberEnrollments.filter(e => e.status === 'in_progress').length;
          const avgProgress = memberEnrollments.length > 0
            ? Math.round(memberEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / memberEnrollments.length)
            : 0;
          
          return [
            member.full_name,
            memberEnrollments.length,
            inProgress,
            completed,
            `${avgProgress}%`
          ];
        })
      ];

      const csvContent = csvData.map(row => 
        Array.isArray(row) ? row.join(',') : row
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-experiences-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading team experiences...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasPermission('experiences.view_team')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Access Denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredMembers = teamMembers.filter(member =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Team Development"
          subtitle="Monitor direct reports' learning experiences and progress"
          badges={[
            { text: `${teamMembers.length} Team Members`, className: "bg-white text-blue-600" },
            { text: `${teamJourneys.length} Active Journeys`, className: "bg-white text-green-600" }
          ]}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          loadingRefresh={loading}
          loadingExportCSV={exporting}
          headerColor="#0201ff"
        />

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Team Members Progress */}
        <div className="space-y-4">
          {filteredMembers.map((member) => {
            const memberEnrollments = teamEnrollments.filter(e => e.user_email === member.email);
            const completed = memberEnrollments.filter(e => e.status === 'completed').length;
            const inProgress = memberEnrollments.filter(e => e.status === 'in_progress').length;
            const notStarted = memberEnrollments.filter(e => e.status === 'not_started').length;
            const avgProgress = memberEnrollments.length > 0
              ? Math.round(memberEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / memberEnrollments.length)
              : 0;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{memberEnrollments.length}</p>
                        <p className="text-xs text-gray-600">Total Enrolled</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{inProgress}</p>
                        <p className="text-xs text-gray-600">In Progress</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{completed}</p>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">{avgProgress}%</p>
                        <p className="text-xs text-gray-600">Avg Progress</p>
                      </div>
                    </div>

                    {memberEnrollments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-700">Active Journeys:</h4>
                        {memberEnrollments.slice(0, 3).map((enrollment) => {
                          const journey = teamJourneys.find(j => j.id === enrollment.journey_id);
                          if (!journey) return null;
                          
                          return (
                            <div key={enrollment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-700 truncate flex-1">{journey.title}</span>
                              <Badge className={`ml-2 text-xs ${
                                enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                enrollment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {enrollment.completion_percentage}%
                              </Badge>
                            </div>
                          );
                        })}
                        {memberEnrollments.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{memberEnrollments.length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {teamMembers.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Team Members</h3>
              <p className="text-gray-600">
                You don't have any direct reports assigned yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}