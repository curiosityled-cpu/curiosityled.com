import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Brain, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const AssessmentOverview = React.memo(({ assessmentData, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  const latestAssessment = assessmentData?.latest;

  // No assessment case - show prompt to take first assessment
  if (!latestAssessment) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #faf5ff, #eff6ff)' }}>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#faf5ff' }}>
                <Brain className="w-8 h-8" style={{ color: '#A25DDC' }} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Discover Your Leadership Profile
              </h3>
              <p className="text-gray-600 mb-6">
                Take our comprehensive assessment to get personalized insights and development recommendations
              </p>
              <Link to={createPageUrl("Assessments")}>
                <Button className="text-white" style={{ backgroundColor: '#A25DDC' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9147cc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A25DDC'}>
                  Start Assessment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Results View (default when assessment exists)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Leadership Assessment</h2>
          <p className="text-gray-600">Latest results and insights</p>
        </div>
        <Link to={createPageUrl("AssessmentResults") + `?assessmentId=${latestAssessment.id}`}>
          <Button variant="outline">
            View Full Results
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Brain className="w-8 h-8" style={{ color: '#A25DDC' }} />
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {latestAssessment.overall_pct || 0}%
            </div>
            <div className="text-sm text-gray-600">Overall Score</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8" style={{ color: '#0202ff' }} />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {latestAssessment.si_pct || 0}%
            </div>
            <div className="text-sm text-gray-600">Situational Intelligence</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Badge style={{ backgroundColor: '#faf5ff', color: '#A25DDC' }}>
                {latestAssessment.band_overall || 'N/A'}
              </Badge>
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {latestAssessment.archetype_label || 'Leadership Profile'}
            </div>
            <div className="text-sm text-gray-600">Your Archetype</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

AssessmentOverview.displayName = 'AssessmentOverview';

export default AssessmentOverview;