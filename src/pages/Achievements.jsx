import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, TrendingUp, Target, BookOpen, BarChart3, Zap, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserLevelCard from "@/components/gamification/UserLevelCard";
import BadgeGallery from "@/components/gamification/BadgeGallery";
import LeaderboardWidget from "@/components/gamification/LeaderboardWidget";
import ActiveCompetitionsCard from "@/components/gamification/ActiveCompetitionsCard";
import PointHistoryTimeline from "@/components/gamification/PointHistoryTimeline";
import GivePointsModal from "@/components/gamification/GivePointsModal";
import LevelUpCelebration from "@/components/gamification/LevelUpCelebration";
import TeamGamificationPanel from "@/components/gamification/TeamGamificationPanel";
import { base44 } from "@/api/base44Client";
import { Progress } from "@/components/ui/progress";
import { useSearchParams } from "react-router-dom";

export default function AchievementsPage() {
  const { user, isManagerOfManagers } = useAuth();
  const [searchParams] = useSearchParams();
  const [achievement, setAchievement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGivePoints, setShowGivePoints] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  
  const defaultTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    loadData();
  }, [user?.email]);

  const loadData = async () => {
    if (!user?.email) return;

    try {
      const achievements = await base44.entities.UserAchievement.filter({
        user_email: user.email
      });

      if (achievements.length > 0) {
        setAchievement(achievements[0]);
      }
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = achievement?.stats || {
    goals_completed: 0,
    learning_completed: 0,
    assessments_taken: 0,
    coaching_sessions: 0
  };

  const statCards = [
    { label: "Goals Completed", value: stats.goals_completed, icon: Target, color: "text-green-600", bgColor: "bg-green-50" },
    { label: "Learning Completed", value: stats.learning_completed, icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-50" },
    { label: "Assessments Taken", value: stats.assessments_taken, icon: BarChart3, color: "text-purple-600", bgColor: "bg-purple-50" },
    { label: "Coaching Sessions", value: stats.coaching_sessions, icon: Zap, color: "text-orange-600", bgColor: "bg-orange-50" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600" />
              Achievements
            </h1>
            <p className="text-gray-600 mt-1">Track your progress and compete with peers</p>
          </div>
          <Button onClick={() => setShowGivePoints(true)}>
            <Gift className="w-4 h-4 mr-2" />
            Give Points
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {isManagerOfManagers && <TabsTrigger value="team">Team</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <UserLevelCard />
              <LeaderboardWidget />
              <ActiveCompetitionsCard />
            </div>
            <BadgeGallery />
          </TabsContent>

          <TabsContent value="badges">
            <BadgeGallery />
          </TabsContent>

          <TabsContent value="leaderboard">
            <LeaderboardWidget maxDisplay={20} />
          </TabsContent>

          <TabsContent value="history">
            <PointHistoryTimeline />
          </TabsContent>

          {isManagerOfManagers && (
            <TabsContent value="team">
              <TeamGamificationPanel />
            </TabsContent>
          )}
        </Tabs>

        <GivePointsModal 
          open={showGivePoints} 
          onOpenChange={setShowGivePoints}
        />

        <LevelUpCelebration
          open={showLevelUp}
          onOpenChange={setShowLevelUp}
          levelData={levelUpData}
        />
      </div>
    </div>
  );
}