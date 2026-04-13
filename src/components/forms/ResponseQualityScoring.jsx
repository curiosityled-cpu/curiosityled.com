import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Sparkles, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ResponseQualityScoring({ form }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [qualityData, setQualityData] = useState(null);

  const analyzeQuality = async () => {
    setAnalyzing(true);
    try {
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      }, '-created_date', 100);

      if (submissions.length === 0) {
        toast.error("No submissions to analyze");
        setAnalyzing(false);
        return;
      }

      const qualityScores = await Promise.all(
        submissions.slice(0, 10).map(sub => scoreSubmissionQuality(sub))
      );

      const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
      
      const distribution = {
        high: qualityScores.filter(s => s >= 80).length,
        medium: qualityScores.filter(s => s >= 50 && s < 80).length,
        low: qualityScores.filter(s => s < 50).length
      };

      setQualityData({
        avgQuality: avgQuality.toFixed(1),
        distribution,
        totalAnalyzed: qualityScores.length,
        recommendations: generateQualityRecommendations(avgQuality, distribution)
      });

      toast.success("Quality analysis complete");
    } catch (error) {
      console.error("Error analyzing quality:", error);
      toast.error("Failed to analyze quality");
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreSubmissionQuality = async (submission) => {
    let score = 50; // Base score

    // Check completeness
    const totalQuestions = (form.config?.sections || [])
      .reduce((sum, section) => sum + (section.questions?.length || 0), 0);
    
    const answeredQuestions = Object.keys(submission.responses || {}).length;
    const completeness = (answeredQuestions / totalQuestions) * 100;
    
    score += (completeness / 100) * 30; // Up to 30 points for completeness

    // Check response length (text quality)
    const textResponses = Object.values(submission.responses || {})
      .filter(r => typeof r === 'string' && r.length > 20);
    
    if (textResponses.length > 0) {
      score += 10; // Bonus for detailed responses
    }

    // Check completion time (not too fast, not too slow)
    if (submission.completion_time_seconds) {
      const expectedTime = totalQuestions * 30; // 30 seconds per question
      const timeDiff = Math.abs(submission.completion_time_seconds - expectedTime);
      
      if (timeDiff < expectedTime * 0.5) {
        score += 10; // Good pacing
      }
    }

    return Math.min(100, Math.max(0, score));
  };

  const generateQualityRecommendations = (avgQuality, distribution) => {
    const recommendations = [];

    if (avgQuality < 60) {
      recommendations.push({
        title: "Low Response Quality",
        message: "Consider adding validation rules or making questions more engaging",
        severity: "high"
      });
    }

    if (distribution.low > distribution.high) {
      recommendations.push({
        title: "Quality Distribution Skewed",
        message: "More low-quality than high-quality responses - review question clarity",
        severity: "medium"
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: "Good Quality",
        message: "Response quality is within acceptable range",
        severity: "low"
      });
    }

    return recommendations;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Response Quality Scoring
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          AI-powered quality assessment of responses
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qualityData ? (
          <Button
            onClick={analyzeQuality}
            disabled={analyzing}
            className="w-full"
            style={{ backgroundColor: '#0202ff' }}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Quality...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Response Quality
              </>
            )}
          </Button>
        ) : (
          <>
            {/* Overall Quality Score */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="pt-6 pb-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-900 mb-1">
                    {qualityData.avgQuality}
                  </div>
                  <div className="text-sm text-gray-600">Average Quality Score</div>
                  <Badge className="mt-2" variant={
                    parseFloat(qualityData.avgQuality) >= 80 ? 'default' :
                    parseFloat(qualityData.avgQuality) >= 60 ? 'secondary' : 'destructive'
                  }>
                    {parseFloat(qualityData.avgQuality) >= 80 ? 'Excellent' :
                     parseFloat(qualityData.avgQuality) >= 60 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quality Distribution */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-xl font-bold text-green-900">
                    {qualityData.distribution.high}
                  </div>
                  <div className="text-xs text-green-600">High Quality</div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-xl font-bold text-yellow-900">
                    {qualityData.distribution.medium}
                  </div>
                  <div className="text-xs text-yellow-600">Medium</div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-xl font-bold text-red-900">
                    {qualityData.distribution.low}
                  </div>
                  <div className="text-xs text-red-600">Low Quality</div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            {qualityData.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recommendations</h4>
                {qualityData.recommendations.map((rec, idx) => (
                  <Card key={idx} className={
                    rec.severity === 'high' ? 'border-red-200 bg-red-50' :
                    rec.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-green-200 bg-green-50'
                  }>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        {rec.severity === 'low' ? (
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        ) : (
                          <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                            rec.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                        )}
                        <div>
                          <p className="text-sm font-medium">{rec.title}</p>
                          <p className="text-xs text-gray-600">{rec.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              onClick={analyzeQuality}
              disabled={analyzing}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Refresh Analysis
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}