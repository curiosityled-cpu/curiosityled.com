import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TrendingUp, AlertCircle, Info, Target, DollarSign, Users, Zap, Link2, ChevronDown, ChevronUp, Building2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCompetencies } from "@/components/contexts/CompetencyContext";

export default function CompetencyImpactSection({
  competencyAverages,
  onCompetencyClick,
  leaders,
  selectedCompetency,
  selectedDivision,
  onDrillDown,
  userInfo = { sector: "Technology" }
}) {
  const [expandedCompetency, setExpandedCompetency] = useState(null);
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [viewMode, setViewMode] = useState('overview');
  
  // Get organization's selected competencies
  const { selectedCompetencies, competenciesConfigured } = useCompetencies();

  // Industry benchmarks by sector (average scores for comparison)
  const industryBenchmarks = {
    'Healthcare': { dm_pct: 68, comm_pct: 72, trm_pct: 65, collab_pct: 70, pm_pct: 66, si_pct: 69 },
    'Technology': { dm_pct: 72, comm_pct: 70, trm_pct: 68, collab_pct: 73, pm_pct: 71, si_pct: 72 },
    'Finance': { dm_pct: 74, comm_pct: 68, trm_pct: 73, collab_pct: 67, pm_pct: 72, si_pct: 71 },
    'Manufacturing': { dm_pct: 70, comm_pct: 66, trm_pct: 71, collab_pct: 68, pm_pct: 69, si_pct: 68 },
    'Retail': { dm_pct: 67, comm_pct: 71, trm_pct: 69, collab_pct: 72, pm_pct: 68, si_pct: 69 },
    'Education': { dm_pct: 69, comm_pct: 74, trm_pct: 66, collab_pct: 73, pm_pct: 67, si_pct: 70 },
    'default': { dm_pct: 70, comm_pct: 70, trm_pct: 68, collab_pct: 70, pm_pct: 69, si_pct: 70 }
  };

  // Target benchmarks (proficiency targets)
  const targetBenchmarks = {
    dm_pct: 75,
    comm_pct: 75,
    trm_pct: 75,
    collab_pct: 75,
    pm_pct: 75,
    si_pct: 75
  };

  const sectorBenchmarks = industryBenchmarks[userInfo.sector] || industryBenchmarks['default'];

  // All available competencies with definitions (platform defaults)
  const allCompetenciesData = [
    {
      key: 'decision_making',
      name: 'Decision Making',
      score: competencyAverages?.decision_making || 0,
      definition: 'The ability to analyze information, evaluate alternatives, and make timely, sound choices that drive organizational outcomes.',
      color: '#0202ff',
      impactsGoals: ['revenue_growth', 'operational_efficiency']
    },
    {
      key: 'communication',
      name: 'Communication',
      score: competencyAverages?.communication || 0,
      definition: 'Effectively conveying information, active listening, and adapting messages to diverse audiences to drive alignment and action.',
      color: '#10b981',
      impactsGoals: ['employee_engagement', 'customer_satisfaction']
    },
    {
      key: 'resource_management',
      name: 'Resource Management',
      score: competencyAverages?.resource_management || 0,
      definition: 'Optimizing allocation of time, budget, and talent to maximize productivity and achieve strategic objectives efficiently.',
      color: '#f59e0b',
      impactsGoals: ['operational_efficiency', 'revenue_growth']
    },
    {
      key: 'stakeholder_management',
      name: 'Stakeholder Management',
      score: competencyAverages?.stakeholder_management || 0,
      definition: 'Building and maintaining strategic relationships, managing expectations, and influencing key partners to drive collective success.',
      color: '#A25DDC',
      impactsGoals: ['customer_satisfaction', 'revenue_growth']
    },
    {
      key: 'performance_management',
      name: 'Performance Management',
      score: competencyAverages?.performance_management || 0,
      definition: 'Setting clear expectations, providing feedback, coaching teams, and driving accountability to achieve exceptional results.',
      color: '#ec4899',
      impactsGoals: ['employee_engagement', 'operational_efficiency']
    },
    {
      key: 'si_overall',
      name: 'Situational Intelligence',
      score: competencyAverages?.si_overall || 0,
      definition: 'Reading organizational dynamics, understanding context, and adapting leadership approach to navigate complexity effectively.',
      color: '#06b6d4',
      impactsGoals: ['revenue_growth', 'employee_engagement', 'customer_satisfaction']
    }
  ];

  // Filter to show only organization's selected competencies (or default first 5 + SI if not configured)
  const competencies = React.useMemo(() => {
    if (selectedCompetencies && selectedCompetencies.length > 0) {
      // Map selected competency names to our data
      const selectedNames = selectedCompetencies.map(c => c.name.toLowerCase());
      return allCompetenciesData.filter(comp => {
        const compNameLower = comp.name.toLowerCase();
        // Always include SI
        if (comp.key === 'si_overall') return true;
        return selectedNames.some(name => 
          name.includes(compNameLower) || compNameLower.includes(name)
        );
      });
    }
    // Default: show first 5 + SI (all of them in this case since we have exactly 6)
    return allCompetenciesData.slice(0, 6);
  }, [selectedCompetencies, competencyAverages]);

  // Business Goals with definitions
  const businessGoals = [
    {
      key: 'revenue_growth',
      name: 'Revenue Growth',
      icon: DollarSign,
      target: '15% YoY',
      current: '12%',
      progress: 80,
      definition: 'Achieve 15% year-over-year revenue increase through market expansion, customer acquisition, and enhanced product offerings.',
      impactedBy: ['decision_making', 'resource_management', 'stakeholder_management', 'si_overall'],
      impactExplanation: {
        decision_making: 'Strategic choices on investments, pricing, and market positioning directly drive revenue outcomes.',
        resource_management: 'Optimal resource allocation ensures sales and marketing investments yield maximum ROI.',
        stakeholder_management: 'Strong client relationships and partner networks accelerate revenue opportunities.',
        si_overall: 'Reading market dynamics and competitive landscape enables proactive revenue strategies.'
      }
    },
    {
      key: 'operational_efficiency',
      name: 'Operational Efficiency',
      icon: Zap,
      target: '20% Cost Reduction',
      current: '15%',
      progress: 75,
      definition: 'Reduce operational costs by 20% while maintaining quality through process optimization and resource efficiency.',
      impactedBy: ['decision_making', 'resource_management', 'performance_management'],
      impactExplanation: {
        decision_making: 'Data-driven decisions on automation, outsourcing, and process improvements reduce waste.',
        resource_management: 'Efficient allocation of budget, time, and talent directly lowers operational costs.',
        performance_management: 'Clear accountability and performance metrics drive team productivity and efficiency.'
      }
    },
    {
      key: 'employee_engagement',
      name: 'Employee Engagement',
      icon: Users,
      target: '85% Engagement',
      current: '78%',
      progress: 92,
      definition: 'Achieve 85% employee engagement score through strong culture, development opportunities, and effective leadership.',
      impactedBy: ['communication', 'performance_management', 'si_overall'],
      impactExplanation: {
        communication: 'Transparent, consistent communication builds trust and connection with employees.',
        performance_management: 'Regular feedback, recognition, and development opportunities increase engagement.',
        si_overall: 'Understanding team dynamics and individual motivations enables personalized leadership approaches.'
      }
    },
    {
      key: 'customer_satisfaction',
      name: 'Customer Satisfaction',
      icon: Target,
      target: 'NPS 65+',
      current: 'NPS 58',
      progress: 89,
      definition: 'Achieve Net Promoter Score of 65+ through exceptional service delivery and strong client relationships.',
      impactedBy: ['communication', 'stakeholder_management', 'si_overall'],
      impactExplanation: {
        communication: 'Clear, empathetic client communication resolves issues quickly and builds loyalty.',
        stakeholder_management: 'Proactive relationship management anticipates needs and strengthens partnerships.',
        si_overall: 'Reading client context and adapting approach ensures relevant, valued interactions.'
      }
    }
  ];

  // Calculate average scores from competencyAverages prop for the radar chart
  // Mapping original keys to keys used in radarData outline for display purposes.
  const avgScores = {
    dm: competencyAverages?.decision_making || 0,
    comm: competencyAverages?.communication || 0,
    trm: competencyAverages?.resource_management || 0,
    collab: competencyAverages?.stakeholder_management || 0, // Using stakeholder_management for 'Collaboration' in radar chart
    pm: competencyAverages?.performance_management || 0,
    si: competencyAverages?.si_overall || 0,
  };

  // Prepare radar chart data
  const radarData = [
    {
      competency: 'Decision-Making',
      'Organization Average': Math.round(avgScores.dm),
      'Industry Average': sectorBenchmarks.dm_pct,
      'Target Benchmark': targetBenchmarks.dm_pct,
      fullMark: 100
    },
    {
      competency: 'Communication',
      'Organization Average': Math.round(avgScores.comm),
      'Industry Average': sectorBenchmarks.comm_pct,
      'Target Benchmark': targetBenchmarks.comm_pct,
      fullMark: 100
    },
    {
      competency: 'Time/Resource Mgmt',
      'Organization Average': Math.round(avgScores.trm),
      'Industry Average': sectorBenchmarks.trm_pct,
      'Target Benchmark': targetBenchmarks.trm_pct,
      fullMark: 100
    },
    {
      competency: 'Collaboration',
      'Organization Average': Math.round(avgScores.collab),
      'Industry Average': sectorBenchmarks.collab_pct,
      'Target Benchmark': targetBenchmarks.collab_pct,
      fullMark: 100
    },
    {
      competency: 'Performance Mgmt',
      'Organization Average': Math.round(avgScores.pm),
      'Industry Average': sectorBenchmarks.pm_pct,
      'Target Benchmark': targetBenchmarks.pm_pct,
      fullMark: 100
    },
    {
      competency: 'Situational Intel',
      'Organization Average': Math.round(avgScores.si),
      'Industry Average': sectorBenchmarks.si_pct,
      'Target Benchmark': targetBenchmarks.si_pct,
      fullMark: 100
    },
  ];

  const getScoreStatus = (score) => {
    if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-50', label: 'Excellent', icon: '✓' };
    if (score >= 70) return { color: '', bg: '', customColor: '#0202ff', customBg: 'rgba(2, 2, 255, 0.05)', label: 'Good', icon: '→' };
    if (score >= 60) return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Developing', icon: '↗' };
    return { color: 'text-red-600', bg: 'bg-red-50', label: 'Needs Focus', icon: '⚠' };
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="section-competency-impact" className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Leadership Competency Profile</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Organization average vs. {userInfo.sector || 'Industry'} benchmarks
              </p>
            </div>
            <Badge variant="outline">
              {userInfo.sector || 'Technology'} Sector
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Background container for radar chart */}
          <div className="rounded-xl p-8 mb-6" style={{ background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)' }}>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="competency"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Organization Average"
                  dataKey="Organization Average"
                  stroke="#0202ff"
                  fill="#0202ff"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Industry Average"
                  dataKey="Industry Average"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  strokeDasharray="3,3"
                />
                <Radar
                  name="Target Benchmark"
                  dataKey="Target Benchmark"
                  stroke="#9ca3af"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Benchmark Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(2, 2, 255, 0.05)', borderWidth: '1px', borderColor: 'rgba(2, 2, 255, 0.2)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4" style={{ color: '#0202ff' }} />
                <span className="font-medium text-xs" style={{ color: '#0202ff' }}>Organization Avg</span>
              </div>
              <p className="text-sm mb-2" style={{ color: '#0202ff' }}>
                {Math.round((avgScores.dm + avgScores.comm + avgScores.trm + avgScores.collab + avgScores.pm + avgScores.si) / 6)}% overall
              </p>
              <p className="text-xs" style={{ color: '#0202ff' }}>
                Your organization's current leadership capability baseline
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800 text-xs">Industry Average</span>
              </div>
              <p className="text-amber-700 text-sm mb-2">
                {Math.round((sectorBenchmarks.dm_pct + sectorBenchmarks.comm_pct + sectorBenchmarks.trm_pct + sectorBenchmarks.collab_pct + sectorBenchmarks.pm_pct + sectorBenchmarks.si_pct) / 6)}% in {userInfo.sector || 'sector'}
              </p>
              <p className="text-xs text-amber-600">
                Competitive benchmark against peer organizations
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-800 text-xs">Target Level</span>
              </div>
              <p className="text-gray-700 text-sm mb-2">75%+ proficiency</p>
              <p className="text-xs text-gray-600">
                Research-backed standard for leadership effectiveness
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Competencies Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Core Leadership Competencies</h3>
            <Badge variant="outline" className="text-xs">
              Click to view leaders by competency
            </Badge>
          </div>
          {!competenciesConfigured && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-800">Showing default competencies - organization has not configured core competencies yet</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {competencies.map((comp, idx) => {
            const status = getScoreStatus(comp.score);
            const isExpanded = expandedCompetency === comp.key;

            return (
              <motion.div
                key={comp.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border rounded-lg hover:shadow-md transition-shadow"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedCompetency(isExpanded ? null : comp.key)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: comp.color }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{comp.name}</span>
                          <Badge className={`${status.bg} ${status.color} text-xs`} style={status.customColor ? { backgroundColor: status.customBg, color: status.customColor } : {}}>
                            {status.icon} {status.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-lg">{comp.score}%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompetencyClick && onCompetencyClick(comp.key);
                        }}
                        style={{ color: '#0202ff' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#0101dd'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#0202ff'}
                      >
                        View Leaders
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  <Progress value={comp.score} className="h-2 mb-2" />

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t"
                      >
                        <p className="text-sm text-gray-700 mb-3">{comp.definition}</p>

                        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(2, 2, 255, 0.05)' }}>
                          <Link2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#0202ff' }} />
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: '#0202ff' }}>Impacts Business Goals:</p>
                            <div className="flex flex-wrap gap-1">
                              {comp.impactsGoals.map(goalKey => {
                                const goal = businessGoals.find(g => g.key === goalKey);
                                return goal ? (
                                  <Badge key={goalKey} variant="outline" className="text-xs bg-white">
                                    {goal.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Business Goals Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-gray-900">Strategic Business Goals</h3>
          <Badge className="bg-green-100 text-green-800 text-xs">
            FY 2025 Targets
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {businessGoals.map((goal, idx) => {
            const Icon = goal.icon;
            const isExpanded = expandedGoal === goal.key;

            return (
              <motion.div
                key={goal.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border rounded-lg hover:shadow-md transition-shadow"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedGoal(isExpanded ? null : goal.key)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #0202ff, #A25DDC)' }}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{goal.name}</h4>
                        <p className="text-xs text-gray-600">Target: {goal.target}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Progress to Target</span>
                      <span className="font-medium text-gray-900">{goal.current}</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t space-y-3"
                      >
                        <p className="text-sm text-gray-700">{goal.definition}</p>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-purple-600" />
                            <p className="text-xs font-medium text-purple-900">How Leadership Competencies Drive This Goal:</p>
                          </div>

                          {goal.impactedBy.map(compKey => {
                            const comp = competencies.find(c => c.key === compKey);
                            const explanation = goal.impactExplanation[compKey];

                            return comp ? (
                              <div key={compKey} className="p-2 bg-purple-50 rounded border border-purple-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.color }} />
                                  <span className="text-xs font-medium text-gray-900">{comp.name}</span>
                                  <span className="text-xs text-gray-600">({comp.score}%)</span>
                                </div>
                                <p className="text-xs text-gray-700 pl-4">{explanation}</p>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Summary Insight */}
      <div className="p-4 rounded-lg" style={{ background: 'linear-gradient(to right, rgba(2, 2, 255, 0.05), #faf5ff)', borderWidth: '1px', borderColor: 'rgba(2, 2, 255, 0.2)' }}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#0202ff' }} />
          <div>
            <h4 className="font-semibold mb-1" style={{ color: '#0202ff' }}>Key Insight</h4>
            <p className="text-sm" style={{ color: '#0202ff' }}>
              Leadership competencies are direct drivers of business outcomes. Improving competency scores by 10% typically results in 5-8% improvement in related business goal metrics. Focus on developing competencies with the widest impact across multiple strategic goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}