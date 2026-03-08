import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const COLORS = [
  '#0202ff', // SI - primary blue
  '#8b5cf6', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4'  // cyan
];

const TIMEFRAME_LABELS = {
  '3months': 'Last 3 Months',
  '6months': 'Last 6 Months',
  '12months': 'Last 12 Months',
  '24months': 'Last 24 Months',
  'all': 'All Time',
  'custom': 'Custom Range'
};

export default function LeadershipIndexTrends({ trendData, selectedCompetencies, timeRange, onTimeRangeChange, onCustomRangeClick, customRangeLabel }) {
  if (!trendData || trendData.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Leadership Competency Trends
            </CardTitle>
            {onTimeRangeChange && (
              <Select 
                value={timeRange || '6months'} 
                onValueChange={(val) => {
                  if (val === 'custom' && onCustomRangeClick) {
                    onCustomRangeClick();
                  } else {
                    onTimeRangeChange(val);
                  }
                }}
              >
                <SelectTrigger className="w-44">
                  {timeRange === 'custom' && customRangeLabel ? (
                    <span className="text-sm">{customRangeLabel}</span>
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                  <SelectItem value="24months">Last 24 Months</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No trend data available</p>
        </CardContent>
      </Card>
    );
  }

  // Use selected competencies or default
  const competenciesToShow = selectedCompetencies || [
    'Situational Intelligence',
    'Decision Making',
    'Communication',
    'Resource Management',
    'Stakeholder Management',
    'Performance Management'
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Leadership Competency Trends
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Tracking selected competencies over {TIMEFRAME_LABELS[timeRange] || timeRange || '6 months'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onTimeRangeChange && (
              <Select 
                value={timeRange || '6months'} 
                onValueChange={(val) => {
                  if (val === 'custom' && onCustomRangeClick) {
                    onCustomRangeClick();
                  } else {
                    onTimeRangeChange(val);
                  }
                }}
              >
                <SelectTrigger className="w-44">
                  {timeRange === 'custom' && customRangeLabel ? (
                    <span className="text-sm">{customRangeLabel}</span>
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                  <SelectItem value="24months">Last 24 Months</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Badge variant="outline">{competenciesToShow.length} competencies</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {competenciesToShow.map((comp, idx) => (
            <Badge 
              key={comp}
              style={{ 
                backgroundColor: `${COLORS[idx]}20`,
                color: COLORS[idx],
                borderColor: COLORS[idx]
              }}
              variant="outline"
              className="text-xs"
            >
              {comp}
            </Badge>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend />
            {competenciesToShow.map((comp, idx) => (
              <Line
                key={comp}
                type="monotone"
                dataKey={comp}
                stroke={COLORS[idx]}
                strokeWidth={2}
                dot={{ fill: COLORS[idx], strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}