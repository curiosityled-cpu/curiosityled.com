import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Award, Download, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";

export default function FullLeaderboard() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [timeFilter, setTimeFilter] = useState("all_time");
  const [scopeFilter, setScopeFilter] = useState("organization");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    loadLeaderboard();
  }, [timeFilter, scopeFilter, user?.client_id, page]);

  const loadLeaderboard = async () => {
    if (!user?.client_id) return;

    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      
      const achievements = await base44.entities.UserAchievement.filter({
        client_id: user.client_id
      }, '-total_points', pageSize, skip);

      const leaderData = await Promise.all(
        achievements.map(async (achievement, index) => {
          const users = await base44.entities.User.filter({ email: achievement.user_email });
          return {
            ...achievement,
            user_name: users[0]?.full_name || achievement.user_email,
            rank: skip + index + 1,
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

  const handleExport = () => {
    try {
      const csvContent = [
        ['Rank', 'Name', 'Level', 'Points', 'Badges', 'Streak'].join(','),
        ...leaders.map(l => [
          l.rank,
          l.user_name,
          l.current_level,
          l.total_points,
          l.earned_badges?.length || 0,
          l.current_streak_days
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leaderboard-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Leaderboard exported successfully");
    } catch (error) {
      toast.error("Failed to export leaderboard");
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600" />
              Leaderboard
            </h1>
            <p className="text-gray-600 mt-1">See how you rank against your peers</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                </SelectContent>
              </Select>

              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="team">My Team</SelectItem>
                  <SelectItem value="cohort">My Cohort</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : leaders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No leaderboard data yet</div>
            ) : (
              <div className="space-y-2">
                {leaders.map((leader) => (
                  <motion.div
                    key={leader.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-4 p-4 rounded-lg ${
                      leader.is_current_user 
                        ? 'bg-blue-50 border-2 border-blue-300' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 flex justify-center">
                      {getRankIcon(leader.rank)}
                    </div>
                    
                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div className="md:col-span-2">
                        <p className={`font-medium truncate ${
                          leader.is_current_user ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {leader.user_name}
                          {leader.is_current_user && (
                            <span className="ml-2 text-xs text-blue-600">(You)</span>
                          )}
                        </p>
                      </div>

                      <div className="text-sm text-gray-600">
                        Level {leader.current_level}
                      </div>

                      <div className="text-sm text-gray-600">
                        {leader.earned_badges?.length || 0} badges
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-900">
                          {leader.total_points.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">points</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {leaders.length >= pageSize && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">Page {page}</span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={leaders.length < pageSize}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}