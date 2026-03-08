import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";

export default function LeadershipTrends({ trendData, timeRange, onTimeRangeChange, onDataPointClick }) {
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [showCompetencyDialog, setShowCompetencyDialog] = useState(false);

  // All available metrics
  const allMetrics = [
    { key: 'overall', name: 'Overall Score', color: '#3b82f6' },
    { key: 'decision_making', name: 'Decision Making', color: '#10b981' },
    { key: 'communication', name: 'Communication', color: '#f59e0b' },
    { key: 'resource_management', name: 'Resource Mgmt', color: '#8b5cf6' },
    { key: 'stakeholder_management', name: 'Stakeholder Mgmt', color: '#ec4899' },
    { key: 'performance_management', name: 'Performance Mgmt', color: '#06b6d4' }
  ];

  // State for selected competencies (default: all selected)
  const [selectedCompetencies, setSelectedCompetencies] = useState(
    allMetrics.map(m => m.key)
  );

  const getTimeRangeLabel = () => {
    if (timeRange === 'custom' && customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')} Leadership Trends`;
    }
    
    switch(timeRange) {
      case '3months': return '3-Month Leadership Trends';
      case '6months': return '6-Month Leadership Trends';
      case '12months': return '12-Month Leadership Trends';
      case '24months': return '24-Month Leadership Trends';
      default: return '6-Month Leadership Trends';
    }
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setShowCustomDateDialog(true);
    } else {
      if (onTimeRangeChange) {
        onTimeRangeChange(value);
      }
    }
  };

  const handleCustomDateApply = () => {
    if (customDateRange.from && customDateRange.to && onTimeRangeChange) {
      onTimeRangeChange('custom', customDateRange);
      setShowCustomDateDialog(false);
    }
  };

  const handleCustomDateCancel = () => {
    setShowCustomDateDialog(false);
    setCustomDateRange({ from: null, to: null });
  };

  const toggleCompetency = (key) => {
    setSelectedCompetencies(prev => {
      if (prev.includes(key)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const selectAllCompetencies = () => {
    setSelectedCompetencies(allMetrics.map(m => m.key));
  };

  const deselectAllCompetencies = () => {
    // Keep at least one selected (Overall Score)
    setSelectedCompetencies(['overall']);
  };

  // Calculate trend direction for selected competencies only
  const calculateTrend = (dataKey) => {
    if (!trendData || trendData.length < 2) return { direction: 'neutral', change: 0 };
    
    const firstValue = trendData[0][dataKey] || 0;
    const lastValue = trendData[trendData.length - 1][dataKey] || 0;
    const change = ((lastValue - firstValue) / firstValue * 100).toFixed(1);
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      change: Math.abs(change)
    };
  };

  // Filter metrics to only show selected ones
  const visibleMetrics = allMetrics.filter(m => selectedCompetencies.includes(m.key));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-lg">{getTimeRangeLabel()}</CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompetencyDialog(true)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Competencies ({selectedCompetencies.length})
            </Button>

            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-40">
                <SelectValue>
                  {timeRange === 'custom' && customDateRange.from && customDateRange.to
                    ? `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')}`
                    : timeRange === '3months' ? '3 Months'
                    : timeRange === '6months' ? '6 Months'
                    : timeRange === '12months' ? '12 Months'
                    : timeRange === '24months' ? '24 Months'
                    : 'Select Range'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="12months">12 Months</SelectItem>
                <SelectItem value="24months">24 Months</SelectItem>
                <SelectItem value="custom">Custom Range...</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleMetrics.map(metric => {
            const trend = calculateTrend(metric.key);
            return (
              <Badge key={metric.key} variant="outline" className="gap-1">
                <span style={{ color: metric.color }}>●</span>
                {metric.name}
                {trend.direction === 'up' && <TrendingUp className="w-3 h-3 text-green-600" />}
                {trend.direction === 'down' && <TrendingDown className="w-3 h-3 text-red-600" />}
                {trend.change > 0 && <span className="text-xs">{trend.change}%</span>}
              </Badge>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent>
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
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
            />
            
            {/* Render only selected competencies */}
            {visibleMetrics.map(metric => (
              <Line 
                key={metric.key}
                type="monotone" 
                dataKey={metric.key} 
                stroke={metric.color} 
                strokeWidth={2}
                name={metric.name}
                dot={{ r: 4, cursor: 'pointer' }}
                onClick={(data) => onDataPointClick && onDataPointClick(data)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Key Insights</h4>
          <div className="grid md:grid-cols-3 gap-3 text-xs text-blue-800">
            {visibleMetrics.map(metric => {
              const trend = calculateTrend(metric.key);
              return (
                <div key={metric.key} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }}></div>
                  <span>
                    {metric.name}: {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'} {trend.change}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {/* Competency Selection Dialog */}
      <Dialog open={showCompetencyDialog} onOpenChange={setShowCompetencyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Competencies to Display</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">
                {selectedCompetencies.length} of {allMetrics.length} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCompetencies}
                  disabled={selectedCompetencies.length === allMetrics.length}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllCompetencies}
                  disabled={selectedCompetencies.length === 1}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {allMetrics.map(metric => (
                <div 
                  key={metric.key}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleCompetency(metric.key)}
                >
                  <Checkbox
                    checked={selectedCompetencies.includes(metric.key)}
                    onCheckedChange={() => toggleCompetency(metric.key)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="font-medium text-sm">{metric.name}</span>
                  </div>
                  {selectedCompetencies.includes(metric.key) && (
                    <Badge variant="secondary" className="text-xs">
                      Visible
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Note: At least one competency must be selected
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowCompetencyDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={setShowCustomDateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Custom Date Range</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Calendar
                mode="single"
                selected={customDateRange.from}
                onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                disabled={(date) => date > new Date() || (customDateRange.to && date > customDateRange.to)}
                className="rounded-md border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Calendar
                mode="single"
                selected={customDateRange.to}
                onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                disabled={(date) => date > new Date() || (customDateRange.from && date < customDateRange.from)}
                className="rounded-md border"
              />
            </div>
          </div>
          {customDateRange.from && customDateRange.to && (
            <div className="text-sm text-gray-600 text-center">
              Selected Range: {format(customDateRange.from, 'MMM d, yyyy')} - {format(customDateRange.to, 'MMM d, yyyy')}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCustomDateCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleCustomDateApply}
              disabled={!customDateRange.from || !customDateRange.to}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}