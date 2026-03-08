import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, Download, Filter, 
  Users, Clock, CheckCircle, BarChart3 
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export default function AdvancedAnalytics({ form, submissions }) {
  const [timeRange, setTimeRange] = useState("30");
  const [compareMode, setCompareMode] = useState(false);

  // Filter submissions by time range
  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    const days = parseInt(timeRange);
    const cutoff = subDays(new Date(), days);
    return submissions.filter(s => new Date(s.submitted_at) >= cutoff);
  }, [submissions, timeRange]);

  // Time series data
  const timeSeriesData = useMemo(() => {
    if (!filteredSubmissions || filteredSubmissions.length === 0) {
      // Return empty time series for the range
      const days = parseInt(timeRange);
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        data.push({
          date: format(date, "MMM dd"),
          submissions: 0,
          approved: 0,
          avgTime: 0
        });
      }
      return data;
    }

    const days = parseInt(timeRange);
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySubmissions = filteredSubmissions.filter(s => {
        const subDate = new Date(s.submitted_at);
        return subDate >= dayStart && subDate <= dayEnd;
      });

      data.push({
        date: format(date, "MMM dd"),
        submissions: daySubmissions.length,
        approved: daySubmissions.filter(s => s.status === "approved").length,
        avgTime: daySubmissions.length > 0
          ? daySubmissions.reduce((sum, s) => sum + (s.completion_time_seconds || 0), 0) / daySubmissions.length
          : 0
      });
    }
    
    return data;
  }, [filteredSubmissions, timeRange]);

  // Completion time distribution
  const timeDistribution = useMemo(() => {
    const buckets = [
      { label: "< 1 min", min: 0, max: 60, count: 0 },
      { label: "1-2 min", min: 60, max: 120, count: 0 },
      { label: "2-5 min", min: 120, max: 300, count: 0 },
      { label: "5-10 min", min: 300, max: 600, count: 0 },
      { label: "> 10 min", min: 600, max: Infinity, count: 0 }
    ];

    filteredSubmissions.forEach(s => {
      const time = s.completion_time_seconds || 0;
      const bucket = buckets.find(b => time >= b.min && time < b.max);
      if (bucket) bucket.count++;
    });

    return buckets;
  }, [filteredSubmissions]);

  // Question response patterns
  const questionAnalysis = useMemo(() => {
    const analysis = [];
    
    if (!form?.config?.sections || !filteredSubmissions || filteredSubmissions.length === 0) {
      return analysis;
    }
    
    form.config.sections.forEach(section => {
      section.questions?.forEach(question => {
        if (question.type === "multiple_choice" || question.type === "dropdown") {
          const responses = {};
          
          filteredSubmissions.forEach(sub => {
            const answer = sub.responses?.[question.id];
            if (answer) {
              responses[answer] = (responses[answer] || 0) + 1;
            }
          });

          if (Object.keys(responses).length > 0) {
            analysis.push({
              question: question.question_text,
              type: question.type,
              data: Object.entries(responses).map(([name, value]) => ({ name, value }))
            });
          }
        }
      });
    });
    
    return analysis;
  }, [form, filteredSubmissions]);

  // Rating trends
  const ratingTrends = useMemo(() => {
    const trends = [];
    
    if (!form?.config?.sections || !filteredSubmissions || filteredSubmissions.length === 0) {
      return trends;
    }
    
    form.config.sections.forEach(section => {
      section.questions?.forEach(question => {
        if (question.type === "rating_scale" || question.type === "linear_scale") {
          const responses = filteredSubmissions
            .map(s => ({
              value: Number(s.responses?.[question.id]),
              date: new Date(s.submitted_at)
            }))
            .filter(r => !isNaN(r.value) && r.date && !isNaN(r.date.getTime()))
            .sort((a, b) => a.date - b.date);

          if (responses.length >= 5) {
            // Calculate moving average
            const windowSize = Math.min(5, responses.length);
            const movingAvg = [];
            
            for (let i = windowSize - 1; i < responses.length; i++) {
              const window = responses.slice(i - windowSize + 1, i + 1);
              const avg = window.reduce((sum, r) => sum + r.value, 0) / windowSize;
              movingAvg.push({
                index: i,
                value: parseFloat(avg.toFixed(2)),
                date: format(responses[i].date, "MMM dd")
              });
            }

            const questionText = question.question_text || "Untitled Question";
            trends.push({
              question: questionText.length > 40 ? questionText.substring(0, 40) + "..." : questionText,
              data: movingAvg
            });
          }
        }
      });
    });
    
    return trends;
  }, [form, filteredSubmissions]);

  // Key metrics comparison
  const metrics = useMemo(() => {
    if (!submissions || submissions.length === 0) {
      return {
        total: { current: 0, change: 0 },
        avgTime: { current: 0, change: 0 },
        approvalRate: { current: 0, change: 0 }
      };
    }

    const prevRangeSubmissions = submissions.filter(s => {
      const date = new Date(s.submitted_at);
      const days = parseInt(timeRange);
      const prevStart = subDays(new Date(), days * 2);
      const prevEnd = subDays(new Date(), days);
      return date >= prevStart && date < prevEnd;
    });

    const currentTotal = filteredSubmissions.length;
    const prevTotal = prevRangeSubmissions.length;
    const totalChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);

    const currentAvgTime = currentTotal > 0
      ? filteredSubmissions.reduce((sum, s) => sum + (s.completion_time_seconds || 0), 0) / currentTotal
      : 0;
    const prevAvgTime = prevTotal > 0
      ? prevRangeSubmissions.reduce((sum, s) => sum + (s.completion_time_seconds || 0), 0) / prevTotal
      : 0;
    const timeChange = prevAvgTime > 0 ? ((currentAvgTime - prevAvgTime) / prevAvgTime) * 100 : 0;

    const currentApprovalRate = currentTotal > 0
      ? (filteredSubmissions.filter(s => s.status === "approved").length / currentTotal) * 100
      : 0;
    const prevApprovalRate = prevTotal > 0
      ? (prevRangeSubmissions.filter(s => s.status === "approved").length / prevTotal) * 100
      : 0;
    const approvalChange = currentApprovalRate - prevApprovalRate;

    return {
      total: { current: currentTotal, change: totalChange },
      avgTime: { current: currentAvgTime, change: timeChange },
      approvalRate: { current: currentApprovalRate, change: approvalChange }
    };
  }, [filteredSubmissions, submissions, timeRange]);

  const COLORS = ['#0202ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const handleExportAnalytics = () => {
    const data = {
      form: form.title,
      timeRange: `Last ${timeRange} days`,
      exportDate: new Date().toISOString(),
      metrics: metrics,
      timeSeriesData: timeSeriesData,
      questionAnalysis: questionAnalysis
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title}_analytics_${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success("Analytics exported");
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExportAnalytics} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Key Metrics with Trends */}
      <div className="grid md:grid-cols-3 gap-4">
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
            <p className="text-3xl font-bold">{metrics.total.current}</p>
            <div className="flex items-center gap-2 mt-2">
              {metrics.total.change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${metrics.total.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(metrics.total.change).toFixed(1)}% vs previous period
              </span>
            </div>
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
              {Math.floor(metrics.avgTime.current / 60)}m {Math.floor(metrics.avgTime.current % 60)}s
            </p>
            <div className="flex items-center gap-2 mt-2">
              {metrics.avgTime.change <= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${metrics.avgTime.change <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(metrics.avgTime.change).toFixed(1)}% vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Approval Rate
              </CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.approvalRate.current.toFixed(1)}%</p>
            <div className="flex items-center gap-2 mt-2">
              {metrics.approvalRate.change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${metrics.approvalRate.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(metrics.approvalRate.change).toFixed(1)}% vs previous period
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="ratings">Rating Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          {/* Submissions Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Submissions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0202ff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0202ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="submissions" 
                    stroke="#0202ff" 
                    fillOpacity={1} 
                    fill="url(#colorSubmissions)" 
                    name="Total Submissions"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="approved" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorApproved)" 
                    name="Approved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Average Completion Time Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Average Completion Time Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avgTime" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Avg. Time (seconds)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          {/* Completion Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Completion Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0202ff" name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-6">
          {/* Question Response Analysis */}
          {questionAnalysis.map((qa, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base">{qa.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={qa.data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {qa.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}

          {questionAnalysis.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No multiple choice or dropdown questions found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ratings" className="space-y-6">
          {/* Rating Trends */}
          {ratingTrends.map((trend, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base">{trend.question}</CardTitle>
                <p className="text-sm text-gray-500">Moving average (5-submission window)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trend.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 'auto']} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#0202ff" 
                      strokeWidth={2}
                      dot={{ fill: '#0202ff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}

          {ratingTrends.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Not enough rating data for trend analysis (minimum 5 submissions required)
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}