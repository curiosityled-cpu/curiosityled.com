import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Map, TrendingUp, AlertCircle, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calculateReadinessScore } from "@/components/lib/careerPathReadiness";

export default function TeamCareerPaths() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamAssessments, setTeamAssessments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [careerPaths, setCareerPaths] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

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
      const [members, assessments, rolesData, paths] = await Promise.all([
        base44.entities.User.filter({ email: { $in: user.subordinate_emails } }),
        base44.entities.Assessment.filter({ email: { $in: user.subordinate_emails } }),
        base44.entities.Role.list(),
        base44.entities.CareerPath.list()
      ]);

      setTeamMembers(members || []);
      setTeamAssessments(assessments || []);
      setRoles(rolesData || []);
      setCareerPaths(paths || []);
    } catch (error) {
      console.error('Error loading team career data:', error);
      toast.error('Failed to load team career data');
    } finally {
      setLoading(false);
    }
  };

  const getMemberAssessment = (memberEmail) => {
    const assessments = teamAssessments.filter(a => a.email === memberEmail);
    return assessments.length > 0 ? assessments[0] : null;
  };

  const getMemberReadiness = (memberEmail) => {
    const assessment = getMemberAssessment(memberEmail);
    if (!assessment) return null;

    // Get the user's current role (assuming stored in User entity)
    const member = teamMembers.find(m => m.email === memberEmail);
    const currentRoleTitle = member?.current_role;
    const currentRole = roles.find(r => r.title === currentRoleTitle);

    if (!currentRole) return null;

    // Find potential next roles based on career paths
    const nextPaths = careerPaths.filter(p => p.from_role_id === currentRole.id);
    
    if (nextPaths.length === 0) return null;

    // Calculate readiness for the first potential next role
    const nextRole = roles.find(r => r.id === nextPaths[0].to_role_id);
    if (!nextRole) return null;

    const readiness = calculateReadinessScore(assessment, nextRole);
    return {
      ...readiness,
      targetRole: nextRole,
      currentRole
    };
  };

  const filteredMembers = teamMembers.filter(member =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading team career paths...</p>
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
      {/* Privacy Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Privacy Protected:</strong> You can only view career paths for direct reports who have chosen to share them with you.
          Career path exploration is private by default.
        </AlertDescription>
      </Alert>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Team Members List */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Team Members Found</h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try adjusting your search' : 'Your direct reports will appear here'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map((member, index) => {
            const assessment = getMemberAssessment(member.email);
            const readiness = getMemberReadiness(member.email);
            const hasSharedCareerPath = member.share_career_path_with_manager === true;

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
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{member.full_name}</CardTitle>
                          {hasSharedCareerPath ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Shared
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 text-xs">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        {member.current_role && (
                          <p className="text-sm text-gray-500 mt-1">Current: {member.current_role}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!hasSharedCareerPath ? (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">
                          This team member hasn't shared their career path exploration with you yet.
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Team members can enable sharing in their Profile settings.
                        </p>
                      </div>
                    ) : !assessment ? (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">
                          No assessment data available for {member.full_name}
                        </p>
                      </div>
                    ) : readiness ? (
                      <div className="space-y-4">
                        {/* Readiness Overview */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Career Path Readiness</p>
                            <p className="text-lg font-bold text-gray-900">
                              {readiness.currentRole?.title} → {readiness.targetRole?.title}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-blue-600">
                              {readiness.readiness_score}%
                            </p>
                            <p className="text-xs text-gray-600">Ready</p>
                          </div>
                        </div>

                        {/* Gap Areas */}
                        {readiness.gap_areas && readiness.gap_areas.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Development Areas:</p>
                            <div className="space-y-1">
                              {readiness.gap_areas.slice(0, 3).map((gap, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-orange-50 rounded">
                                  <span className="text-gray-700">{gap.name}</span>
                                  <Badge className="bg-orange-100 text-orange-800">
                                    Gap: {gap.gap_score}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strong Areas */}
                        {readiness.strong_areas && readiness.strong_areas.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Strengths:</p>
                            <div className="flex flex-wrap gap-2">
                              {readiness.strong_areas.slice(0, 3).map((strength, idx) => (
                                <Badge key={idx} className="bg-green-100 text-green-800 text-xs">
                                  {strength.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <Map className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">
                          No active career path exploration
                        </p>
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