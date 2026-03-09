import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function ProficiencyScoresCard({ proficiencyScores }) {
  if (!proficiencyScores) return null;

  const { 
    competency_scores = {}, 
    overall_proficiency,
    overall_benchmark,
    overall_gap,
    proficiency_band,
    performance_summary
  } = proficiencyScores;

  const getGapIcon = (gap) => {
    if (gap > 0.3) return TrendingUp;
    if (gap < -0.3) return TrendingDown;
    return Minus;
  };

  const getGapColor = (gapLabel) => {
    if (gapLabel === 'Significantly Exceeding' || gapLabel === 'Exceeding Expectations') {
      return 'text-green-600';
    }
    if (gapLabel === 'On Track') return 'text-blue-600';
    return 'text-amber-600';
  };

  const getBandColor = (band) => {
    const colors = {
      'Awareness': 'bg-gray-100 text-gray-800',
      'Developing': 'bg-blue-100 text-blue-800',
      'Proficient': 'bg-green-100 text-green-800',
      'Mastery': 'bg-purple-100 text-purple-800'
    };
    return colors[band] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Proficiency Assessment</CardTitle>
              <p className="text-sm text-gray-500">Benchmarked against your leadership level</p>
            </div>
          </div>
          {proficiency_band && (
            <Badge className={getBandColor(proficiency_band)} size="lg">
              {proficiency_band}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Summary */}
        {performance_summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900">{performance_summary}</p>
            {overall_proficiency && overall_benchmark && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Your Score: </span>
                  <strong className="text-blue-900">{overall_proficiency.toFixed(2)}/4.0</strong>
                </div>
                <div>
                  <span className="text-blue-700">Expected: </span>
                  <strong className="text-blue-900">{overall_benchmark.toFixed(2)}/4.0</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Competency Breakdown */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Competency Proficiency</h4>
          <div className="space-y-4">
            {Object.entries(competency_scores).map(([compName, compData], idx) => {
              const GapIcon = getGapIcon(compData.gap || 0);
              const gapColor = getGapColor(compData.gap_label);
              const progressPercent = (compData.proficiency_level / 4) * 100;

              return (
                <motion.div
                  key={compName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{compName}</span>
                      <Badge variant="outline" className="text-xs">
                        {compData.proficiency_label || `${compData.proficiency_level.toFixed(1)}/4.0`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <GapIcon className={`w-4 h-4 ${gapColor}`} />
                      <span className={`text-xs font-medium ${gapColor}`}>
                        {compData.gap_label}
                      </span>
                    </div>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Benchmark: {compData.benchmark?.toFixed(1) || 'N/A'}</span>
                    <span>
                      Gap: {compData.gap > 0 ? '+' : ''}{compData.gap?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}