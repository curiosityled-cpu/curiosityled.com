import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Trophy, Award, TrendingUp, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import AwardPointsToTeamModal from "./AwardPointsToTeamModal";

export default function TeamGamificationPanel() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, [user?.email]);

  const loadTeamData = async () => {
    if (!user?.subordinate_emails) return;

    try {
      const memberData = await Promise.all(
        user.subordinate_emails.map(async (email) => {
          const [userData, achievement] = await Promise.all([
            base44.entities.User.filter({ email }),
            base44.entities.UserAchievement.filter({ user_email: email })
          ]);

          return {
            user: userData[0],
            achievement: achievement[0] || null
          };
        })
      );

      setTeamMembers(memberData.filter(m => m.user));
    } catch (error) {
      console.error("Error loading team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAward = (member) => {
    setSelectedMember(member);
    setShowAwardModal(true);
  };

  if (loading) return null;

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Team Gamification
              </CardTitle>
              <Button onClick={() => setShowAwardModal(true)}>
                <Gift className="w-4 h-4 mr-2" />
                Award Points
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No team members found</p>
            ) : (
              <div className="space-y-3">
                {teamMembers.map(({ user: member, achievement }, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {member.full_name?.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{member.full_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          Level {achievement?.current_level || 1}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {achievement?.total_points?.toLocaleString() || 0} pts
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {achievement?.earned_badges?.length || 0} badges
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAward(member)}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Award
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Statistics */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Level</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamMembers.length > 0
                      ? (teamMembers.reduce((sum, m) => sum + (m.achievement?.current_level || 1), 0) / teamMembers.length).toFixed(1)
                      : 0}
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Points</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamMembers.reduce((sum, m) => sum + (m.achievement?.total_points || 0), 0).toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Badges</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamMembers.reduce((sum, m) => sum + (m.achievement?.earned_badges?.length || 0), 0)}
                  </p>
                </div>
                <Award className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AwardPointsToTeamModal
        open={showAwardModal}
        onOpenChange={setShowAwardModal}
        teamMembers={teamMembers}
        preselectedMember={selectedMember}
        onSuccess={loadTeamData}
      />
    </>
  );
}