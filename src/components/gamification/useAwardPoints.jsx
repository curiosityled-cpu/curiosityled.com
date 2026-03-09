import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { showAchievementToast } from "./AchievementToast";

export const useAwardPoints = () => {
  const [isAwarding, setIsAwarding] = useState(false);

  const awardPoints = async (action, points, description) => {
    setIsAwarding(true);
    try {
      const response = await base44.functions.invoke('awardPoints', {
        action,
        points,
        description
      });

      if (response.data.success) {
        // Show achievement toast
        showAchievementToast('points', {
          points,
          action: description || action
        });

        // Check if user leveled up
        if (response.data.leveled_up) {
          setTimeout(() => {
            showAchievementToast('level_up', {
              level: response.data.new_level
            });
          }, 1000);
        }

        // Check if user earned a badge
        if (response.data.badge_earned) {
          setTimeout(() => {
            showAchievementToast('badge', {
              badgeName: response.data.badge_earned.name,
              description: response.data.badge_earned.description
            });
          }, response.data.leveled_up ? 2000 : 1000);
        }

        // Badge check is handled by the backend awardPoints function

        return { success: true, data: response.data };
      }

      return { success: false };
    } catch (error) {
      console.error("Error awarding points:", error);
      return { success: false, error };
    } finally {
      setIsAwarding(false);
    }
  };

  return { awardPoints, isAwarding };
};

// Point values for different actions
export const POINT_VALUES = {
  GOAL_COMPLETED: 100,
  GOAL_CREATED: 20,
  LEARNING_COMPLETED: 75,
  ASSESSMENT_COMPLETED: 200,
  COACHING_SESSION_ATTENDED: 150,
  PROFILE_COMPLETED: 50,
  JOURNEY_STARTED: 30,
  JOURNEY_COMPLETED: 300,
  ONBOARDING_MILESTONE: 50,
  FEEDBACK_PROVIDED: 25,
  RESOURCE_SHARED: 15
};