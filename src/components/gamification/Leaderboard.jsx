import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, TrendingUp, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

export default function Leaderboard({ scope = "organization" }) {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [activeTab, setActiveTab] = useState("all_time");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab, user?.client_id]);

  const loadLeaderboard = async () => {
    if (!user?.client_id) return;

    setLoading(true);
    try {
      let achievements = await base44.entities.UserAchievement.filter({
        client_id: user.client_id
      }, '-total_points', 10);

      // Get user details for each achievement
      const leaderData = await Promise.all(
        achievements.map(async (achievement) => {
          const users = await base44.entities.User.filter({ email: achievement.user_email });
          return {
            ...achievement,
            user_name: users[0]?.full_name || achievement.user_email,
            is_current_user: achievement.user_email === user.email
          };
        })
      );

      setLeaders(leaderData);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <Award className="w-4 h-4 text-gray-400" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all_time">All Time</TabsTrigger>
            <TabsTrigger value="this_month">This Month</TabsTrigger>
            <TabsTrigger value="this_week">This Week</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : leaders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data yet</div>
            ) : (
              leaders.map((leader, index) => (
                <motion.div
                  key={leader.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    leader.is_current_user 
                      ? 'bg-blue-50 border-2 border-blue-300' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${leader.is_current_user ? 'text-blue-900' : 'text-gray-900'}`}>
                      {leader.user_name}
                      {leader.is_current_user && (
                        <span className="ml-2 text-xs text-blue-600">(You)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Level {leader.current_level}</span>
                      {leader.current_streak_days > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-orange-600">{leader.current_streak_days}🔥</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-lg text-blue-900">
                      {leader.total_points.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">points</p>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}