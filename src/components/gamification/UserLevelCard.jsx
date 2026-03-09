import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Lock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

export default function UserLevelCard({ userEmail = null }) {
  const { user } = useAuth();
  const targetEmail = userEmail || user?.email;
  const [levelData, setLevelData] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [nextLevel, setNextLevel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLevelData();
  }, [targetEmail]);

  const loadLevelData = async () => {
    if (!targetEmail) return;

    try {
      const [userData, levels] = await Promise.all([
        base44.entities.User.filter({ email: targetEmail }),
        base44.entities.GamificationLevel.filter({ is_active: true }, 'level_order')
      ]);

      if (userData.length > 0) {
        const userInfo = userData[0];
        const currentLvl = levels.find(l => l.id === userInfo.current_level_id) || levels[0];
        const currentIndex = levels.findIndex(l => l.id === currentLvl?.id);
        const nextLvl = currentIndex >= 0 && currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;

        setCurrentLevel(currentLvl);
        setNextLevel(nextLvl);
        setLevelData({
          total_points: userInfo.total_points || 0,
          points_to_next_level: userInfo.points_to_next_level || (nextLvl?.points_threshold - (userInfo.total_points || 0))
        });
      }
    } catch (error) {
      console.error("Error loading level data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !currentLevel) return null;

  const progressPercent = nextLevel 
    ? Math.min(100, ((currentLevel.points_threshold - (levelData.points_to_next_level || 0)) / (nextLevel.points_threshold - currentLevel.points_threshold)) * 100)
    : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Your Level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg"
          >
            <span className="text-3xl font-bold text-white">{currentLevel.level_order}</span>
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-900">{currentLevel.level_name}</h3>
          <p className="text-sm text-gray-600 mt-1">{levelData.total_points.toLocaleString()} Total Points</p>
        </div>

        {nextLevel ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress to {nextLevel.level_name}</span>
              <span className="font-medium text-gray-900">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-center text-gray-500">
              {levelData.points_to_next_level.toLocaleString()} points needed
            </p>
          </div>
        ) : (
          <div className="text-center py-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
            <CheckCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="font-semibold text-yellow-900">Max Level Achieved!</p>
          </div>
        )}

        {currentLevel.unlocks && currentLevel.unlocks.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Current Perks:</p>
            <div className="space-y-1">
              {currentLevel.unlocks.map((unlock, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span>{unlock}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {nextLevel?.unlocks && nextLevel.unlocks.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Next Level Unlocks:</p>
            <div className="space-y-1">
              {nextLevel.unlocks.slice(0, 3).map((unlock, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3 text-gray-400" />
                  <span>{unlock}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}