import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Award } from "lucide-react";
import { toast } from "sonner";

export const showAchievementToast = (type, data) => {
  const achievements = {
    points: {
      icon: Sparkles,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      title: "Points Earned!",
      message: `+${data.points} points for ${data.action}`
    },
    badge: {
      icon: Award,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      title: "New Badge Unlocked!",
      message: `${data.badgeName} - ${data.description}`
    },
    level_up: {
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      title: "Level Up!",
      message: `You've reached Level ${data.level}! 🎉`
    },
    streak: {
      icon: Sparkles,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      title: "Streak Milestone!",
      message: `${data.days} days in a row! Keep it going! 🔥`
    }
  };

  const config = achievements[type] || achievements.points;
  const Icon = config.icon;

  toast.custom((t) => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={`${config.bgColor} border-2 border-${config.color.replace('text-', '')} rounded-lg shadow-lg p-4 max-w-md`}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.color} bg-white rounded-full p-2`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className={`font-bold ${config.color}`}>{config.title}</h4>
          <p className="text-sm text-gray-700 mt-1">{config.message}</p>
        </div>
      </div>
    </motion.div>
  ), {
    duration: 5000,
    position: 'top-right'
  });
};