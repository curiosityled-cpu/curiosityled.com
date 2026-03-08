import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FormEngagementHeatmap({ form }) {
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    loadEngagementData();
  }, [form.id]);

  const loadEngagementData = async () => {
    try {
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      }, '-created_date', 200);

      // Calculate engagement per question
      const sections = form.config?.sections || [];
      const questionEngagement = [];

      if (submissions.length === 0) {
        setHeatmapData([]);
        return;
      }

      sections.forEach(section => {
        if (!section.questions) return;
        
        section.questions.forEach(question => {
          const responses = submissions.filter(sub =>
            sub.responses && sub.responses[question.id]
          );

          const engagementScore = submissions.length > 0
            ? (responses.length / submissions.length) * 100
            : 0;

          questionEngagement.push({
            sectionTitle: section.title,
            questionText: question.question_text,
            engagementScore: engagementScore.toFixed(1),
            responseCount: responses.length
          });
        });
      });

      setHeatmapData(questionEngagement);
    } catch (error) {
      console.error("Error loading engagement data:", error);
    }
  };

  const getHeatColor = (score) => {
    if (score >= 90) return "bg-green-600";
    if (score >= 70) return "bg-green-400";
    if (score >= 50) return "bg-yellow-400";
    if (score >= 30) return "bg-orange-400";
    return "bg-red-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Engagement Heatmap
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Visual representation of question-level engagement
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {heatmapData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No engagement data available
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {heatmapData.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 truncate flex-1">
                    {item.questionText}
                  </p>
                  <span className="text-xs font-medium ml-2">
                    {item.engagementScore}%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 transition-all ${getHeatColor(parseFloat(item.engagementScore))}`}
                    style={{ width: `${item.engagementScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 pt-3 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-600"></div>
            <span className="text-xs text-gray-600">90%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-400"></div>
            <span className="text-xs text-gray-600">50-90%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-400"></div>
            <span className="text-xs text-gray-600">&lt;50%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}