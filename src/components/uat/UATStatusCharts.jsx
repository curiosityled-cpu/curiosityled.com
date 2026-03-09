import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * UATStatusCharts - Displays test status distribution and completion progress
 * @param {Array} testCases - Array of test case objects with test_runs array
 * @returns {JSX.Element} Visualization with pie chart and progress tracking
 */
export default function UATStatusCharts({ testCases }) {
  // Return empty state card instead of null for consistent layout
  if (!testCases || testCases.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-sm">No test cases available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-sm">No data to display</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Memoize calculations to prevent unnecessary re-renders
  const { 
    pieData, 
    completedTests, 
    completionPercentage, 
    completionGoal
  } = useMemo(() => {
    const getLatestTestRun = (testCase) => {
      return testCase.test_runs && testCase.test_runs.length > 0
        ? testCase.test_runs[testCase.test_runs.length - 1]
        : null;
    };

    const counts = {
      'Not Tested': 0,
      'Passed': 0,
      'Failed': 0,
      'Blocked': 0
    };

    testCases.forEach(tc => {
      const latest = getLatestTestRun(tc);
      const status = latest?.status || 'Not Tested';
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });

    const pieChartData = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count
      }));

    const completed = testCases.filter(tc => {
      const latest = getLatestTestRun(tc);
      return latest?.status && latest.status !== 'Not Tested';
    }).length;

    const percentage = testCases.length > 0 
      ? Math.round((completed / testCases.length) * 100)
      : 0;

    return {
      pieData: pieChartData,
      completedTests: completed,
      completionPercentage: percentage,
      completionGoal: 80
    };
  }, [testCases]);

  // Color scheme - WCAG AA accessible
  const statusColors = useMemo(() => ({
    'Not Tested': '#6b7280',
    'Passed': '#059669',
    'Failed': '#991b1b',
    'Blocked': '#b45309'
  }), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                dataKey="value"
                animationBegin={0}
                animationDuration={300}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[entry.name]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `${value} test(s)`}
                contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '1rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Completion Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completion Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Tests Executed</span>
              <span className="text-sm font-bold text-gray-900">
                {completedTests} / {testCases.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">Current: {completionPercentage}%</span>
              <span className="text-xs text-gray-600">Goal: {completionGoal}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-green-50 p-3 border border-green-200">
              <p className="text-xs text-green-700 mb-1">Tests Completed</p>
              <p className="text-2xl font-bold text-green-900">{completedTests}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
              <p className="text-xs text-amber-700 mb-1">Tests Remaining</p>
              <p className="text-2xl font-bold text-amber-900">{testCases.length - completedTests}</p>
            </div>
          </div>

          <div className={`rounded-lg p-3 border ${completionPercentage >= completionGoal ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-xs ${completionPercentage >= completionGoal ? 'text-green-700' : 'text-blue-700'}`}>
              {completionPercentage >= completionGoal 
                ? `✓ Goal achieved! (${completionPercentage}%)`
                : `${Math.max(0, completionGoal - completionPercentage)}% to reach ${completionGoal}% goal`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}