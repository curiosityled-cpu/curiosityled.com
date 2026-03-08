import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, Lock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function BadgeCollection({ userEmail = null }) {
  const { user } = useAuth();
  const targetEmail = userEmail || user?.email;
  const [achievement, setAchievement] = useState(null);
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, [targetEmail]);

  const loadBadges = async () => {
    if (!targetEmail) return;

    try {
      const [achievements, badges] = await Promise.all([
        base44.entities.UserAchievement.filter({ user_email: targetEmail }),
        base44.entities.Badge.filter({ is_active: true })
      ]);

      setAchievement(achievements.length > 0 ? achievements[0] : null);
      setAllBadges(badges);
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const earnedBadgeIds = new Set(achievement?.earned_badges?.map(b => b.badge_id) || []);

  const tierColors = {
    bronze: "from-amber-700 to-amber-900",
    silver: "from-gray-400 to-gray-600",
    gold: "from-yellow-400 to-yellow-600",
    platinum: "from-cyan-400 to-blue-600"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" />
          Badge Collection
          <UIBadge variant="outline" className="ml-auto">
            {earnedBadgeIds.size} / {allBadges.length}
          </UIBadge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          <TooltipProvider>
            {allBadges.map((badge) => {
              const isEarned = earnedBadgeIds.has(badge.id);
              const earnedBadge = achievement?.earned_badges?.find(b => b.badge_id === badge.id);

              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: isEarned ? 1.1 : 1.0 }}
                      className={`relative aspect-square rounded-lg flex flex-col items-center justify-center p-2 ${
                        isEarned 
                          ? `bg-gradient-to-br ${tierColors[badge.tier]} shadow-lg cursor-pointer` 
                          : 'bg-gray-100 border-2 border-dashed border-gray-300 opacity-50'
                      }`}
                    >
                      {isEarned ? (
                        <>
                          <span className="text-2xl mb-1">{badge.icon}</span>
                          <span className="text-[10px] text-white font-medium text-center leading-tight">
                            {badge.name}
                          </span>
                          {earnedBadge?.earned_date && (
                            <Sparkles className="absolute top-1 right-1 w-3 h-3 text-yellow-300" />
                          )}
                        </>
                      ) : (
                        <>
                          <Lock className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-500 text-center leading-tight">
                            {badge.name}
                          </span>
                        </>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-semibold">{badge.name}</p>
                      <p className="text-gray-600 mt-1">{badge.description}</p>
                      {isEarned && earnedBadge?.earned_date && (
                        <p className="text-green-600 mt-1">
                          Earned: {new Date(earnedBadge.earned_date).toLocaleDateString()}
                        </p>
                      )}
                      {!isEarned && (
                        <p className="text-orange-600 mt-1">+{badge.points_value} points</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}