import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, CheckCircle, Clock, TrendingUp } from "lucide-react";

export default function SubmissionAnalytics({ form, submissions }) {
  const stats = useMemo(() => {
    if (!submissions || submissions.length === 0) {
      return {
        total: 0,
        approved: 0,
        avgTime: 0,
        completionRate: "0.0"
      };
    }

    const total = submissions.length;
    const approved = submissions.filter(s => s.status === "approved").length;
    const avgTime = submissions.reduce((sum, s) => sum + (s.completion_time_seconds || 0), 0) / total;
    const completionRate = form.assigned_to_emails?.length
      ? (total / form.assigned_to_emails.length) * 100 
      : 0;

    return {
      total,
      approved,
      avgTime: Math.floor(avgTime),
      completionRate: completionRate.toFixed(1)
    };
  }, [submissions, form]);

  const statusData = useMemo(() => {
    const counts = {};
    submissions.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [submissions]);

  const questionStats = useMemo(() => {
    const stats = [];
    
    if (!form.config.sections) return stats;
    
    form.config.sections.forEach(section => {
      if (!section.questions) return;
      
      section.questions.forEach(question => {
        if (question.type === "rating_scale" || question.type === "linear_scale") {
          const responses = submissions
            .map(s => s.responses?.[question.id])
            .filter(r => r !== undefined && r !== null && r !== "");
          
          if (responses.length > 0) {
            const avg = responses.reduce((sum, r) => sum + Number(r), 0) / responses.length;
            
            stats.push({
              question: question.question_text.length > 50 
                ? question.question_text.substring(0, 47) + "..."
                : question.question_text,
              average: parseFloat(avg.toFixed(2)),
              responses: responses.length
            });
          }
        }
      });
    });
    
    return stats;
  }, [submissions, form]);

  const COLORS = ['#0202ff', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Submissions
              </CardTitle>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Approved
              </CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.approved}</p>
            <p className="text-sm text-gray-500">
              {((stats.approved / stats.total) * 100 || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg. Completion Time
              </CardTitle>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Math.floor(stats.avgTime / 60)}m
            </p>
            <p className="text-sm text-gray-500">{stats.avgTime % 60}s</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completion Rate
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.completionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Question Analytics */}
      {questionStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={questionStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="question" 
                  angle={-45}
                  textAnchor="end"
                  height={150}
                  interval={0}
                />
                <YAxis domain={[0, 'auto']} />
                <Tooltip />
                <Bar dataKey="average" fill="#0202ff" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}