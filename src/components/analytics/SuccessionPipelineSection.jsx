import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

export default function SuccessionPipelineSection({ pipelineByLevel, metrics, onPipelineClick }) {
  const pipelineData = [
    { name: 'Ready Now', value: metrics.ready_now, color: COLORS[0] },
    { name: 'High Potential', value: metrics.high_potential, color: COLORS[1] },
    { name: 'Developing', value: metrics.total_leaders - metrics.ready_now - metrics.high_potential - metrics.at_risk, color: COLORS[2] },
    { name: 'At Risk', value: metrics.at_risk, color: COLORS[3] }
  ];

  const readinessMetrics = [
    { label: 'Ready Now', value: metrics.ready_now, total: metrics.total_leaders, color: 'text-green-600' },
    { label: 'High Potential', value: metrics.high_potential, total: metrics.total_leaders, color: 'text-yellow-600' },
    { label: 'Bench Strength', value: `${metrics.bench_strength}%`, isPercentage: true, color: 'text-blue-600' }
  ];

  const levelLabels = {
    'c_suite': 'C-Suite',
    'vp_level': 'VP Level',
    'director': 'Director',
    'manager': 'Manager'
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Leadership Pipeline & Succession Planning</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Donut Chart */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Enterprise Pipeline</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      cursor="pointer"
                      onClick={() => onPipelineClick && onPipelineClick(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pipelineData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-gray-600">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 mt-6">
              {readinessMetrics.map((metric, idx) => (
                <div key={idx} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className={`text-xl font-bold ${metric.color}`}>
                    {metric.isPercentage ? metric.value : metric.value}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Succession by Level */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Succession Pipeline by Level</h3>
            <div className="space-y-4">
              {pipelineByLevel && pipelineByLevel.map((level, idx) => (
                <div 
                  key={idx}
                  className="cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                  onClick={() => onPipelineClick && onPipelineClick(level.level)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {levelLabels[level.level] || level.level}
                    </span>
                    <span className="text-xs text-gray-500">{level.total} Leaders</span>
                  </div>
                  <div className="flex gap-2 mb-1">
                    <div className="flex-1">
                      <Progress 
                        value={(level.ready_now / level.total) * 100} 
                        className="h-3 bg-gray-200"
                        indicatorClassName="bg-green-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-600 mt-1">
                    <span className="text-green-600">{level.ready_now} Ready</span>
                    <span className="text-yellow-600">{level.high_potential} HiPo</span>
                    <span className="text-blue-600">{level.developing} Dev</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}