import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, BookOpen, ArrowRight, Target, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function DevelopmentInsightsCard({ developmentInsights = [], onCreateGoal, onAssignLearning }) {
  if (!developmentInsights || developmentInsights.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Development Insights</CardTitle>
            <p className="text-sm text-gray-500">Personalized recommendations</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {developmentInsights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-800">{idx + 1}</span>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {insight.competency_name}
                  </h4>
                  {insight.observation && (
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Observation:</strong> {insight.observation}
                    </p>
                  )}
                  {insight.recommendation && (
                    <p className="text-sm text-gray-700">
                      <strong>Recommendation:</strong> {insight.recommendation}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {onCreateGoal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCreateGoal(insight)}
                      className="text-xs"
                    >
                      <Target className="w-3 h-3 mr-1" />
                      Create Goal
                    </Button>
                  )}
                  
                  {onAssignLearning && insight.learning_resource_ids && insight.learning_resource_ids.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAssignLearning(insight)}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Assign Learning
                    </Button>
                  )}
                  
                  {insight.learning_resource_ids && insight.learning_resource_ids.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = createPageUrl('LearningLibrary')}
                      className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      View Resources
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}