import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

export default function PointsDisplay({ compact = false, showLevel = false }) {
  const { user } = useAuth();
  const [achievement, setAchievement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievement();
  }, [user?.email]);

  const loadAchievement = async () => {
    if (!user?.email) return;
    
    try {
      const achievements = await base44.entities.UserAchievement.filter({
        user_email: user.email
      });

      if (achievements.length > 0) {
        setAchievement(achievements[0]);
      } else {
        // Create initial achievement record
        const newAchievement = await base44.entities.UserAchievement.create({
          user_email: user.email,
          client_id: user.client_id,
          total_points: 0,
          current_level: 1,
          points_to_next_level: 500
        });
        setAchievement(newAchievement);
      }
    } catch (error) {
      console.error("Error loading achievement:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !achievement) return null;

  const progressPercentage = ((500 - achievement.points_to_next_level) / 500) * 100;

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-3 py-2 border border-blue-100 hover:shadow-md transition-all cursor-pointer">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-blue-900">{achievement.total_points}</span>
              <span className="text-gray-600">pts</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">Level {achievement.current_level}</span>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Level {achievement.current_level}</h3>
                  <p className="text-sm text-gray-600">{achievement.total_points.toLocaleString()} total points</p>
                </div>
              </div>
              
              {achievement.current_streak_days > 0 && (
                <div className="text-center bg-orange-50 rounded-lg px-3 py-2 border border-orange-200">
                  <div className="flex items-center gap-1 justify-center mb-1">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <span className="font-bold text-orange-900">{achievement.current_streak_days}</span>
                  </div>
                  <p className="text-xs text-orange-700">day streak</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress to Level {achievement.current_level + 1}</span>
                <span className="font-medium text-gray-900">{achievement.points_to_next_level} pts needed</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {achievement.recent_activities?.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 mb-2">Recent Activity</p>
                <div className="space-y-2">
                  {achievement.recent_activities.slice(0, 3).map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{activity.description}</span>
                      <span className="font-medium text-green-600">+{activity.points_earned}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Level {achievement.current_level}</h3>
              <p className="text-sm text-gray-600">{achievement.total_points.toLocaleString()} total points</p>
            </div>
          </div>
          
          {achievement.current_streak_days > 0 && (
            <div className="text-center bg-orange-50 rounded-lg px-3 py-2 border border-orange-200">
              <div className="flex items-center gap-1 justify-center mb-1">
                <Zap className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-orange-900">{achievement.current_streak_days}</span>
              </div>
              <p className="text-xs text-orange-700">day streak</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress to Level {achievement.current_level + 1}</span>
            <span className="font-medium text-gray-900">{achievement.points_to_next_level} pts needed</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {achievement.recent_activities?.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">Recent Activity</p>
            <div className="space-y-2">
              {achievement.recent_activities.slice(0, 3).map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{activity.description}</span>
                  <span className="font-medium text-green-600">+{activity.points_earned}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}