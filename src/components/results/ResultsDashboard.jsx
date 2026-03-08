import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Brain, TrendingUp, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ResultsDashboard({ assessment, user }) {
  if (!assessment) return null;

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 75) return "#0043ef";
    if (score >= 65) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return "Exceptional";
    if (score >= 75) return "Proficient";
    if (score >= 65) return "Developing";
    return "Needs Focus";
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl mb-2">Assessment Overview</CardTitle>
            <p className="text-gray-600">
              Completed on {new Date(assessment.submission_ts || assessment.created_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800 text-sm">
            <BarChart3 className="w-4 h-4 mr-1" />
            Assessment Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Overall Leadership Score */}
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 67, 239, 0.1)' }}>
              <Award className="w-8 h-8" style={{ color: '#0043ef' }} />
            </div>
            <p className="text-sm text-gray-600 mb-2">Overall Leadership</p>
            <p 
              className="text-4xl font-bold mb-2"
              style={{ color: getScoreColor(assessment.overall_pct) }}
            >
              {assessment.overall_pct}%
            </p>
            <Badge 
              className={getScoreLabel(assessment.overall_pct) === 'Proficient' ? '' : 
                         getScoreLabel(assessment.overall_pct) === 'Exceptional' ? 'bg-green-100 text-green-800' :
                         getScoreLabel(assessment.overall_pct) === 'Developing' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-orange-100 text-orange-800'}
              style={getScoreLabel(assessment.overall_pct) === 'Proficient' ? {
                backgroundColor: 'rgba(0, 67, 239, 0.1)',
                color: '#0043ef'
              } : {}}
            >
              {getScoreLabel(assessment.overall_pct)}
            </Badge>
          </div>

          {/* Situational Intelligence */}
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-2">Situational Intelligence</p>
            <p 
              className="text-4xl font-bold mb-2"
              style={{ color: getScoreColor(assessment.si_pct) }}
            >
              {assessment.si_pct}%
            </p>
            <Progress value={assessment.si_pct} className="h-2" />
          </div>

          {/* Leadership Archetype */}
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
            <p className="text-sm text-gray-600 mb-2">Leadership Archetype</p>
            <p className="text-lg font-semibold text-indigo-600 mb-2">
              {assessment.archetype_label || "Strategic Leader"}
            </p>
            <p className="text-xs text-gray-500">
              Band: {assessment.band_overall || "Proficient"}
            </p>
          </div>
        </div>

        {/* Competency Summary */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Competency Summary
          </h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Decision-Making:</span>
              <span className="font-semibold" style={{ color: getScoreColor(assessment.dm_pct) }}>{assessment.dm_pct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Communication:</span>
              <span className="font-semibold" style={{ color: getScoreColor(assessment.comm_pct) }}>{assessment.comm_pct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Resource Management:</span>
              <span className="font-semibold" style={{ color: getScoreColor(assessment.rm_pct) }}>{assessment.rm_pct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Stakeholder Management:</span>
              <span className="font-semibold" style={{ color: getScoreColor(assessment.sm_pct) }}>{assessment.sm_pct}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Performance Management:</span>
              <span className="font-semibold" style={{ color: getScoreColor(assessment.pm_pct) }}>{assessment.pm_pct}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}