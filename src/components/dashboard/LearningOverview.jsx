import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, ArrowRight, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AssignedLearningList from "../learning/AssignedLearningList";

const LearningOverview = React.memo(({ learningData, userEmail, loading }) => {
  const metrics = useMemo(() => {
    if (!learningData) return {
      pendingCount: 0,
      completedCount: 0,
      total: 0,
      completionRate: 0
    };
    
    return learningData.metrics || {
      pendingCount: 0,
      completedCount: 0,
      total: 0,
      completionRate: 0
    };
  }, [learningData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Learning & Development</h2>
          <p className="text-gray-600">Your personalized learning journey</p>
        </div>
        <Link to={createPageUrl("LearningLibrary")}>
          <Button className="gap-2">
            <Sparkles className="w-4 h-4" />
            Explore Library
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Learning</p>
                <p className="text-2xl font-bold" style={{ color: '#0202ff' }}>{metrics.pendingCount}</p>
              </div>
              <BookOpen className="w-8 h-8" style={{ color: '#0202ff' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completedCount}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold" style={{ color: '#A25DDC' }}>{metrics.completionRate}%</p>
              </div>
              <Sparkles className="w-8 h-8" style={{ color: '#A25DDC' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Learning List */}
      <AssignedLearningList userEmail={userEmail} preloadedData={learningData?.all} />
    </div>
  );
});

LearningOverview.displayName = 'LearningOverview';

export default LearningOverview;