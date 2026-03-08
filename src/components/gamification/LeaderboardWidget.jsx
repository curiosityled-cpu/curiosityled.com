import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LeaderboardWidget({ scope = "organization", maxDisplay = 5 }) {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [user?.client_id]);

  const loadLeaderboard = async () => {
    if (!user?.client_id) return;

    try {
      const achievements = await base44.entities.UserAchievement.filter({
        client_id: user.client_id
      }, '-total_points', maxDisplay + 5);

      const leaderData = await Promise.all(
        achievements.map(async (achievement, index) => {
          const users = await base44.entities.User.filter({ email: achievement.user_email });
          return {
            ...achievement,
            user_name: users[0]?.full_name || achievement.user_email,
            rank: index + 1,
            is_current_user: achievement.user_email === user.email
          };
        })
      );

      setLeaders(leaderData.slice(0, maxDisplay));
      
      const currentUserData = leaderData.find(l => l.is_current_user);
      if (currentUserData) {
        setUserRank(currentUserData.rank);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="text-xs font-bold text-gray-500">#{rank}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Leaderboard
            {userRank && (
              <span className="text-sm font-normal text-gray-500">
                (You're #{userRank})
              </span>
            )}
          </CardTitle>
          <Link to={createPageUrl("Achievements") + "?tab=leaderboard"}>
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-gray-500">Loading...</div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No data yet</div>
        ) : (
          <div className="space-y-2">
            {leaders.map((leader) => (
              <motion.div
                key={leader.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  leader.is_current_user 
                    ? 'bg-blue-50 border-2 border-blue-300' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 w-6 flex justify-center">
                  {getRankIcon(leader.rank)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    leader.is_current_user ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {leader.user_name}
                    {leader.is_current_user && (
                      <span className="ml-1 text-xs text-blue-600">(You)</span>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-blue-900">
                    {leader.total_points.toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}