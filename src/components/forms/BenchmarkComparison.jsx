import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BenchmarkComparison({ form }) {
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBenchmarks();
  }, [form.id]);

  const loadBenchmarks = async () => {
    try {
      // Get similar forms (same type and category)
      const similarForms = await base44.entities.CustomForm.filter({
        form_type: form.form_type,
        form_category: form.form_category,
        status: "published"
      }, '-created_date', 20);

      // Calculate benchmarks
      const allSubmissions = [];
      for (const f of similarForms) {
        const subs = await base44.entities.CustomFormSubmission.filter({
          form_id: f.id
        }, '-created_date', 50);
        allSubmissions.push(...subs);
      }

      // Current form stats
      const currentSubmissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      });

      const currentWithTime = currentSubmissions.filter(s => s.completion_time_seconds);
      const currentAvgTime = currentWithTime.length > 0
        ? currentWithTime.reduce((sum, s) => sum + s.completion_time_seconds, 0) / currentWithTime.length
        : 0;

      const currentCompletionRate = currentSubmissions.length > 0
        ? ((currentSubmissions.filter(s => s.status === "submitted").length / currentSubmissions.length) * 100)
        : 0;

      // Benchmark stats
      const benchmarkWithTime = allSubmissions.filter(s => s.completion_time_seconds);
      const benchmarkAvgTime = benchmarkWithTime.length > 0
        ? benchmarkWithTime.reduce((sum, s) => sum + s.completion_time_seconds, 0) / benchmarkWithTime.length
        : 0;

      const benchmarkCompletionRate = allSubmissions.length > 0
        ? ((allSubmissions.filter(s => s.status === "submitted").length / allSubmissions.length) * 100)
        : 0;

      setBenchmarks({
        current: {
          avgTime: Math.round(currentAvgTime),
          completionRate: currentCompletionRate.toFixed(1),
          totalSubmissions: currentSubmissions.length
        },
        benchmark: {
          avgTime: Math.round(benchmarkAvgTime),
          completionRate: benchmarkCompletionRate.toFixed(1),
          totalForms: similarForms.length
        }
      });
    } catch (error) {
      console.error("Error loading benchmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-gray-600">Loading benchmark data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!benchmarks || benchmarks.benchmark.totalForms < 2) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <BarChart2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Not enough data for benchmark comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  const compareMetric = (current, benchmark) => {
    const diff = ((current - benchmark) / benchmark) * 100;
    return {
      diff: diff.toFixed(1),
      better: diff > 0,
      icon: diff > 5 ? TrendingUp : diff < -5 ? TrendingDown : Minus
    };
  };

  const timeComparison = compareMetric(
    benchmarks.benchmark.avgTime,
    benchmarks.current.avgTime
  ); // Lower is better for time

  const completionComparison = compareMetric(
    benchmarks.current.completionRate,
    benchmarks.benchmark.completionRate
  ); // Higher is better for completion

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5" />
          Benchmark Comparison
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Compare against {benchmarks.benchmark.totalForms} similar forms
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Completion Rate */}
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Completion Rate</span>
              <Badge variant={completionComparison.better ? "default" : "secondary"}>
                {completionComparison.better ? "Above" : "Below"} Avg
              </Badge>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-xs text-gray-600">Your Form</div>
                <div className="text-2xl font-bold">{benchmarks.current.completionRate}%</div>
              </div>
              <div className="flex-1 flex items-center gap-2">
                {React.createElement(completionComparison.icon, {
                  className: `w-4 h-4 ${completionComparison.better ? 'text-green-600' : 'text-red-600'}`
                })}
                <span className={`text-sm font-medium ${
                  completionComparison.better ? 'text-green-600' : 'text-red-600'
                }`}>
                  {completionComparison.diff}%
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">Benchmark</div>
                <div className="text-xl font-bold text-gray-500">
                  {benchmarks.benchmark.completionRate}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Time */}
        <Card className="border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Avg Completion Time</span>
              <Badge variant={!timeComparison.better ? "default" : "secondary"}>
                {!timeComparison.better ? "Faster" : "Slower"} than Avg
              </Badge>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-xs text-gray-600">Your Form</div>
                <div className="text-2xl font-bold">
                  {Math.floor(benchmarks.current.avgTime / 60)}m {benchmarks.current.avgTime % 60}s
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2">
                {React.createElement(timeComparison.icon, {
                  className: `w-4 h-4 ${!timeComparison.better ? 'text-green-600' : 'text-red-600'}`
                })}
                <span className={`text-sm font-medium ${
                  !timeComparison.better ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Math.abs(parseFloat(timeComparison.diff))}%
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">Benchmark</div>
                <div className="text-xl font-bold text-gray-500">
                  {Math.floor(benchmarks.benchmark.avgTime / 60)}m {benchmarks.benchmark.avgTime % 60}s
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gray-50 border">
          <CardContent className="p-3">
            <p className="text-xs text-gray-600">
              Compared against {benchmarks.benchmark.totalForms} similar {form.form_type} forms
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}