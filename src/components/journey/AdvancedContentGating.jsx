import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Clock, Target, CheckCircle, AlertCircle } from "lucide-react";

export default function AdvancedContentGating({ resource, enrollment, previousResource }) {
  const isLocked = () => {
    if (!resource.unlock_condition || resource.unlock_condition === "immediate") {
      return false;
    }

    if (resource.unlock_condition === "time_based") {
      const enrolledDate = new Date(enrollment.enrolled_date);
      const daysSinceEnrollment = Math.floor((new Date() - enrolledDate) / (1000 * 60 * 60 * 24));
      return daysSinceEnrollment < (resource.unlock_after_days || 0);
    }

    if (resource.unlock_condition === "score_based" && previousResource) {
      const prevProgress = enrollment.content_progress?.find(
        p => p.learning_resource_id === previousResource.learning_resource_id
      );
      return !prevProgress || (prevProgress.score || 0) < (resource.required_score_percentage || 0);
    }

    if (resource.unlock_condition === "sequential" && previousResource) {
      const prevProgress = enrollment.content_progress?.find(
        p => p.learning_resource_id === previousResource.learning_resource_id
      );
      return prevProgress?.status !== "completed";
    }

    return false;
  };

  const getUnlockMessage = () => {
    if (resource.unlock_condition === "time_based") {
      const enrolledDate = new Date(enrollment.enrolled_date);
      const daysSinceEnrollment = Math.floor((new Date() - enrolledDate) / (1000 * 60 * 60 * 24));
      const daysRemaining = (resource.unlock_after_days || 0) - daysSinceEnrollment;
      return `Unlocks in ${daysRemaining} days`;
    }

    if (resource.unlock_condition === "score_based") {
      return `Requires ${resource.required_score_percentage}% on previous item`;
    }

    if (resource.unlock_condition === "sequential") {
      return "Complete previous item first";
    }

    return "Locked";
  };

  const locked = isLocked();

  if (!locked) return null;

  return (
    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
      <div className="text-center text-white p-6">
        <Lock className="w-12 h-12 mx-auto mb-3" />
        <p className="font-semibold mb-1">Content Locked</p>
        <p className="text-sm opacity-90">{getUnlockMessage()}</p>
      </div>
    </div>
  );
}