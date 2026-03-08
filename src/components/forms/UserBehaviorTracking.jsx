import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MousePointer, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function UserBehaviorTracking({ form }) {
  const [behaviorData, setBehaviorData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBehaviorData();
  }, [form.id]);

  const loadBehaviorData = async () => {
    try {
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      }, '-created_date', 200);

      // Calculate question-level drop-off
      const questionDropOff = calculateQuestionDropOff(submissions);
      
      // Calculate time spent per question
      const timePerQuestion = calculateTimePerQuestion(submissions);

      // Identify problem areas
      const problemAreas = identifyProblemAreas(questionDropOff, timePerQuestion);

      setBehaviorData({
        questionDropOff,
        timePerQuestion,
        problemAreas,
        totalResponses: submissions.length
      });
    } catch (error) {
      console.error("Error loading behavior data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateQuestionDropOff = (submissions) => {
    const questions = [];
    const sections = form.config?.sections || [];

    if (!submissions || submissions.length === 0) return questions;

    sections.forEach(section => {
      if (!section.questions) return;
      
      section.questions.forEach(question => {
        const responseCount = submissions.filter(sub => 
          sub.responses && sub.responses[question.id]
        ).length;

        const answerRate = submissions.length > 0 
          ? ((responseCount / submissions.length) * 100).toFixed(1)
          : 0;

        questions.push({
          id: question.id,
          text: question.question_text,
          responseCount,
          answerRate: parseFloat(answerRate)
        });
      });
    });

    return questions;
  };

  const calculateTimePerQuestion = (submissions) => {
    if (!submissions || submissions.length === 0) return 0;

    const submissionsWithTime = submissions.filter(s => s.completion_time_seconds);
    if (submissionsWithTime.length === 0) return 0;

    const avgTime = submissionsWithTime.reduce((sum, s) => sum + s.completion_time_seconds, 0) / submissionsWithTime.length;

    const questionCount = (form.config?.sections || [])
      .reduce((sum, section) => sum + (section.questions?.length || 0), 0);

    return questionCount > 0 ? Math.round(avgTime / questionCount) : 0;
  };

  const identifyProblemAreas = (questionDropOff, timePerQuestion) => {
    const problems = [];

    // Find questions with low answer rates
    const lowAnswerRate = questionDropOff.filter(q => q.answerRate < 70);
    if (lowAnswerRate.length > 0) {
      problems.push({
        type: "low_engagement",
        severity: "high",
        message: `${lowAnswerRate.length} question(s) have low response rates (<70%)`,
        questions: lowAnswerRate.map(q => q.text)
      });
    }

    // Check average time
    if (timePerQuestion > 60) {
      problems.push({
        type: "slow_completion",
        severity: "medium",
        message: `Average ${timePerQuestion}s per question may indicate complexity issues`
      });
    }

    return problems;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
          <p className="text-sm text-gray-600">Loading behavior data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!behaviorData || behaviorData.totalResponses === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <MousePointer className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No behavior data available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MousePointer className="w-5 h-5" />
          User Behavior Tracking
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Understand how users interact with your form
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Problem Areas */}
        {behaviorData.problemAreas.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Issues Detected
            </h4>
            {behaviorData.problemAreas.map((problem, idx) => (
              <Card key={idx} className={
                problem.severity === 'high' ? 'border-red-200 bg-red-50' :
                problem.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium">{problem.message}</p>
                    <Badge variant={
                      problem.severity === 'high' ? 'destructive' :
                      problem.severity === 'medium' ? 'secondary' : 'outline'
                    } className="text-xs">
                      {problem.severity}
                    </Badge>
                  </div>
                  {problem.questions && (
                    <div className="mt-2 space-y-1">
                      {problem.questions.slice(0, 3).map((q, i) => (
                        <p key={i} className="text-xs text-gray-600">• {q}</p>
                      ))}
                      {problem.questions.length > 3 && (
                        <p className="text-xs text-gray-500">
                          ...and {problem.questions.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Question Response Rates */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Question Response Rates</h4>
          {behaviorData.questionDropOff.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={behaviorData.questionDropOff.slice(0, 10)}>
                  <XAxis 
                    dataKey="text" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="answerRate" fill="#0202ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No question data available
            </p>
          )}
        </div>

        {/* Performance Summary */}
        <Card className="bg-gray-50 border">
          <CardContent className="p-3">
            <h4 className="text-sm font-medium mb-2">Performance Summary</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <p>• {behaviorData.totalResponses} total responses analyzed</p>
              <p>• {behaviorData.completionRate}% completion rate</p>
              <p>• ~{behaviorData.timePerQuestion}s average per question</p>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}