import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, Grid3X3, List, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip
} from "recharts";

// All 30 competencies grouped by category
const COMPETENCY_CATEGORIES = {
  "Situational Intelligence": [
    "Situational Intelligence",
    "Contextual Awareness", 
    "Adaptive Thinking",
    "Environmental Scanning",
    "Pattern Recognition"
  ],
  "Self Leadership": [
    "Self-Awareness",
    "Emotional Regulation",
    "Growth Mindset",
    "Resilience",
    "Personal Accountability",
    "Time Management",
    "Continuous Learning"
  ],
  "People Leadership": [
    "Communication",
    "Team Building",
    "Coaching & Development",
    "Conflict Resolution",
    "Delegation",
    "Motivation & Inspiration",
    "Inclusive Leadership",
    "Feedback Delivery"
  ],
  "Tactical Execution": [
    "Decision Making",
    "Resource Management",
    "Stakeholder Management",
    "Performance Management",
    "Strategic Planning",
    "Problem Solving",
    "Project Execution",
    "Risk Management",
    "Innovation",
    "Change Management"
  ]
};

const ALL_COMPETENCIES = Object.values(COMPETENCY_CATEGORIES).flat();

const CATEGORY_COLORS = {
  "Situational Intelligence": "#0202ff",
  "Self Leadership": "#8b5cf6",
  "People Leadership": "#10b981",
  "Tactical Execution": "#f59e0b"
};

// Generate score color based on value (0-100)
const getScoreColor = (score) => {
  if (score >= 80) return { bg: "bg-green-500", text: "text-white" };
  if (score >= 70) return { bg: "bg-green-400", text: "text-white" };
  if (score >= 60) return { bg: "bg-yellow-400", text: "text-gray-900" };
  if (score >= 50) return { bg: "bg-orange-400", text: "text-white" };
  if (score >= 40) return { bg: "bg-orange-500", text: "text-white" };
  return { bg: "bg-red-500", text: "text-white" };
};

// Get heat color for heatmap cells
const getHeatColor = (score) => {
  if (score === null || score === undefined) return "bg-gray-100";
  if (score >= 80) return "bg-green-500";
  if (score >= 70) return "bg-green-400";
  if (score >= 60) return "bg-yellow-400";
  if (score >= 50) return "bg-orange-400";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
};

const getHeatTextColor = (score) => {
  if (score === null || score === undefined) return "text-gray-400";
  if (score >= 60 && score < 70) return "text-gray-900";
  return "text-white";
};

// Mini sparkline component
const Sparkline = ({ data, color = "#0202ff" }) => {
  if (!data || data.length === 0) {
    return <div className="w-24 h-8 bg-gray-50 rounded flex items-center justify-center text-xs text-gray-400">No data</div>;
  }

  return (
    <div className="w-24 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={1.5} 
            dot={false}
          />
          <Tooltip 
            contentStyle={{ 
              fontSize: '10px', 
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            formatter={(value) => [`${value}%`, '']}
            labelFormatter={(label) => data[label]?.month || ''}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Trend indicator component
const TrendIndicator = ({ change }) => {
  if (change === null || change === undefined || change === 0) {
    return (
      <span className="flex items-center text-gray-500 text-xs">
        <Minus className="w-3 h-3 mr-1" />
        0%
      </span>
    );
  }
  
  if (change > 0) {
    return (
      <span className="flex items-center text-green-600 text-xs font-medium">
        <ArrowUpRight className="w-3 h-3 mr-0.5" />
        +{change.toFixed(1)}%
      </span>
    );
  }
  
  return (
    <span className="flex items-center text-red-600 text-xs font-medium">
      <ArrowDownRight className="w-3 h-3 mr-0.5" />
      {change.toFixed(1)}%
    </span>
  );
};

export default function CompetencyTrendsHeatmap({ 
  competencyData, 
  timeRange, 
  onTimeRangeChange,
  onCustomRangeClick,
  customRangeLabel 
}) {
  const [viewMode, setViewMode] = useState("heatmap"); // "heatmap" or "table"
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("category"); // "category", "score", "change"
  const [sortOrder, setSortOrder] = useState("desc");

  // Generate mock data if none provided
  const generateMockData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = {};
    
    ALL_COMPETENCIES.forEach(comp => {
      const baseScore = 45 + Math.random() * 40;
      data[comp] = {
        name: comp,
        category: Object.entries(COMPETENCY_CATEGORIES).find(([_, comps]) => comps.includes(comp))?.[0] || "Other",
        currentScore: Math.round(baseScore + Math.random() * 10),
        previousScore: Math.round(baseScore),
        change: Math.round((Math.random() - 0.3) * 15 * 10) / 10,
        trend: months.map((month, idx) => ({
          month,
          value: Math.round(baseScore + (idx * 2) + (Math.random() - 0.5) * 10)
        }))
      };
    });
    
    return data;
  };

  const data = competencyData || generateMockData();

  // Filter and sort competencies
  const getFilteredCompetencies = () => {
    let competencies = Object.values(data);
    
    if (selectedCategory !== "all") {
      competencies = competencies.filter(c => c.category === selectedCategory);
    }
    
    competencies.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "score") {
        comparison = b.currentScore - a.currentScore;
      } else if (sortBy === "change") {
        comparison = b.change - a.change;
      } else {
        // Sort by category, then by name
        comparison = a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      }
      return sortOrder === "asc" ? -comparison : comparison;
    });
    
    return competencies;
  };

  const filteredCompetencies = getFilteredCompetencies();
  const months = data[ALL_COMPETENCIES[0]]?.trend?.map(t => t.month) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  const TIMEFRAME_LABELS = {
    '3months': 'Last 3 Months',
    '6months': 'Last 6 Months',
    '12months': 'Last 12 Months',
    '24months': 'Last 24 Months',
    'all': 'All Time',
    'custom': 'Custom Range'
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              All Competencies Trend Analysis
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {ALL_COMPETENCIES.length} competencies • {TIMEFRAME_LABELS[timeRange] || timeRange || '6 months'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === "heatmap" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("heatmap")}
                className={viewMode === "heatmap" ? "bg-white shadow-sm" : ""}
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                Heatmap
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={viewMode === "table" ? "bg-white shadow-sm" : ""}
              >
                <List className="w-4 h-4 mr-1" />
                Table
              </Button>
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.keys(COMPETENCY_CATEGORIES).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time Range */}
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
        </div>

        {/* Category Legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <Badge 
              key={cat}
              variant="outline"
              className="text-xs cursor-pointer hover:opacity-80"
              style={{ 
                borderColor: color, 
                color: color,
                backgroundColor: selectedCategory === cat ? `${color}15` : 'transparent'
              }}
              onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
            >
              {cat} ({COMPETENCY_CATEGORIES[cat].length})
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === "heatmap" ? (
          /* Heatmap View */
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="flex border-b pb-2 mb-2">
                <div className="w-48 text-xs font-medium text-gray-500">Competency</div>
                <div className="flex-1 flex">
                  {months.map(month => (
                    <div key={month} className="flex-1 text-center text-xs font-medium text-gray-500">
                      {month}
                    </div>
                  ))}
                </div>
                <div className="w-20 text-center text-xs font-medium text-gray-500">Change</div>
              </div>

              {/* Grouped by Category */}
              {(selectedCategory === "all" ? Object.keys(COMPETENCY_CATEGORIES) : [selectedCategory]).map(category => (
                <div key={category} className="mb-4">
                  <div 
                    className="text-xs font-semibold px-2 py-1 rounded mb-1"
                    style={{ 
                      backgroundColor: `${CATEGORY_COLORS[category]}15`,
                      color: CATEGORY_COLORS[category]
                    }}
                  >
                    {category}
                  </div>
                  
                  {filteredCompetencies
                    .filter(c => c.category === category)
                    .map((comp, idx) => (
                      <motion.div
                        key={comp.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="flex items-center hover:bg-gray-50 rounded py-1"
                      >
                        <div className="w-48 text-sm text-gray-700 truncate pr-2" title={comp.name}>
                          {comp.name}
                        </div>
                        <div className="flex-1 flex gap-1">
                          {comp.trend.map((point, i) => (
                            <div 
                              key={i} 
                              className="flex-1 flex items-center justify-center"
                              title={`${point.month}: ${point.value}%`}
                            >
                              <div 
                                className={`w-full h-6 rounded flex items-center justify-center text-xs font-medium ${getHeatColor(point.value)} ${getHeatTextColor(point.value)}`}
                              >
                                {point.value}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="w-20 flex justify-center">
                          <TrendIndicator change={comp.change} />
                        </div>
                      </motion.div>
                    ))}
                </div>
              ))}

              {/* Color Legend */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
                <span className="text-xs text-gray-500">Score:</span>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 rounded bg-red-500"></div>
                  <span className="text-xs text-gray-500">&lt;40</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 rounded bg-orange-500"></div>
                  <span className="text-xs text-gray-500">40-49</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 rounded bg-orange-400"></div>
                  <span className="text-xs text-gray-500">50-59</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 rounded bg-yellow-400"></div>
                  <span className="text-xs text-gray-500">60-69</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 rounded bg-green-400"></div>
                  <span className="text-xs text-gray-500">70-79</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 rounded bg-green-500"></div>
                  <span className="text-xs text-gray-500">80+</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Table View with Sparklines */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (sortBy === "category") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("category");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    Competency {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-center"
                    onClick={() => {
                      if (sortBy === "score") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("score");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    Current {sortBy === "score" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-center"
                    onClick={() => {
                      if (sortBy === "change") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("change");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    Change {sortBy === "change" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompetencies.map((comp, idx) => (
                  <motion.tr
                    key={comp.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: CATEGORY_COLORS[comp.category],
                          color: CATEGORY_COLORS[comp.category]
                        }}
                      >
                        {comp.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center w-12 h-7 rounded font-medium text-sm ${getScoreColor(comp.currentScore).bg} ${getScoreColor(comp.currentScore).text}`}>
                        {comp.currentScore}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Sparkline 
                        data={comp.trend} 
                        color={CATEGORY_COLORS[comp.category]}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <TrendIndicator change={comp.change} />
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}