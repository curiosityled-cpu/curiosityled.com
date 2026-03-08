import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PredictiveAnalytics({ form }) {
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    generatePredictions();
  }, [form.id]);

  const generatePredictions = async () => {
    try {
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      }, '-created_date', 100);

      if (submissions.length < 5) {
        setPredictions({ insufficient_data: true });
        return;
      }

      // Calculate daily submission trend
      const dailyData = {};
      submissions.forEach(sub => {
        if (!sub.created_date) return;
        const date = new Date(sub.created_date).toISOString().split('T')[0];
        dailyData[date] = (dailyData[date] || 0) + 1;
      });

      const sortedDates = Object.keys(dailyData).sort();
      
      if (sortedDates.length === 0) {
        setPredictions({ insufficient_data: true });
        return;
      }

      const trendData = sortedDates.map(date => ({
        date,
        submissions: dailyData[date]
      }));

      // Simple linear regression for prediction
      const avgDaily = submissions.length / sortedDates.length;
      
      // Predict next 7 days
      const today = new Date();
      const predictions = [];
      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        predictions.push({
          date: futureDate.toISOString().split('T')[0],
          predicted: Math.round(avgDaily),
          isPrediction: true
        });
      }

      // Calculate projected total
      const projectedTotal = submissions.length + (avgDaily * 7);

      // Estimate time to reach goals
      const maxSubmissions = form.public_access_config?.max_submissions;
      const daysToGoal = maxSubmissions 
        ? Math.ceil((maxSubmissions - submissions.length) / avgDaily)
        : null;

      setPredictions({
        trendData,
        predictions,
        avgDaily: avgDaily.toFixed(1),
        projectedTotal: Math.round(projectedTotal),
        daysToGoal,
        maxSubmissions
      });
    } catch (error) {
      console.error("Error generating predictions:", error);
    }
  };

  if (!predictions) {
    return null;
  }

  if (predictions.insufficient_data) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Need at least 5 submissions for predictive analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  const combinedData = [...predictions.trendData, ...predictions.predictions];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Predictive Analytics
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          7-day submission forecast based on historical data
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Predictions Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedData}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="submissions" 
                stroke="#0202ff" 
                strokeWidth={2}
                dot={{ fill: '#0202ff' }}
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#0202ff" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#0202ff', strokeDasharray: '' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Key Predictions */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600">Avg Daily</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {predictions.avgDaily}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-600">7-Day Projection</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {predictions.projectedTotal}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goal Progress */}
        {predictions.daysToGoal && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 mb-1">Time to Goal</p>
                  <p className="text-lg font-bold text-green-900">
                    {predictions.daysToGoal} days
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700">
                  {predictions.maxSubmissions} target
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}