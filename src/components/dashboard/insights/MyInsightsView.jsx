import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Award,
  Brain,
  Loader2,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
  Map,
  User as UserIcon,
  Trophy,
  Zap,
  PlayCircle,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Shield,
  Star
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import InsightsFilters from "./InsightsFilters";

// Insight Card Component with expand/collapse
function InsightCard({ insight, onAction }) {
  const [expanded, setExpanded] = useState(false);
  
  const getPriorityBadgeStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionLabel = (action) => {
    if (!action) return null;
    if (action.includes('assessment')) return 'Take Assessment';
    if (action.includes('goal')) return 'Review Goals';
    if (action.includes('learning')) return 'View Learning';
    return 'Take Action';
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="border rounded-lg bg-white hover:shadow-md transition-shadow">
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-start justify-between">
            <div className="flex-1 text-left">
              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{insight.description}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge className={getPriorityBadgeStyle(insight.priority)}>
                {insight.priority || 'Medium'}
              </Badge>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            {insight.recommended_action && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-800">{insight.recommended_action}</p>
              </div>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction(insight.action_type || 'update_goals')}
              className="gap-2"
            >
              {getActionLabel(insight.recommended_action)}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Performance Trend Metric
function TrendMetric({ label, value, trend, trendPeriod, negative = false }) {
  const isNegative = negative || trend?.startsWith('-');
  
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
        <span className={isNegative ? 'text-red-600' : 'text-green-600'}>{trend}</span>
      </div>
      <div className="text-lg font-medium text-gray-700 mt-1">{label}</div>
      <div className="text-xs text-gray-400">{trendPeriod}</div>
    </div>
  );
}

// Peer Comparison Row
function PeerComparisonRow({ label, yourScore, peerPercentile, description }) {
  const isAboveAverage = peerPercentile >= 50;
  
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge 
          variant="outline" 
          className={isAboveAverage ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}
        >
          {isAboveAverage ? 'Above Average' : 'Below Average'}
        </Badge>
      </div>
    </div>
  );
}

export default function MyInsightsView({ user, onMetricsUpdate }) {
  const [loading, setLoading] = useState(true);
  const [personalInsights, setPersonalInsights] = useState(null);
  const [error, setError] = useState(null);
  const [competencies, setCompetencies] = useState([]);
  const [filters, setFilters] = useState({
    timeframe: '30d',
    startDate: null,
    endDate: null,
    leadershipLevel: 'all',
    competencyId: 'all'
  });

  useEffect(() => {
    loadCompetencies();
  }, []);

  useEffect(() => {
    loadPersonalInsights();
  }, [user, filters]);

  const loadCompetencies = async () => {
    try {
      const comps = await base44.entities.Competency.list();
      setCompetencies(comps);
    } catch (err) {
      console.error('Error loading competencies:', err);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const loadPersonalInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('getPersonalInsights', {
        time_range: filters.timeframe,
        start_date: filters.startDate,
        end_date: filters.endDate,
        leadership_level: filters.leadershipLevel !== 'all' ? filters.leadershipLevel : null,
        competency_id: filters.competencyId !== 'all' ? filters.competencyId : null,
        user_id: user?.id
      });

      if (response?.data?.success) {
        setPersonalInsights(response.data.data);
        if (onMetricsUpdate) {
          onMetricsUpdate({
            totalInsights: response.data.data.keyInsights?.length || 0,
            actionItems: response.data.data.prioritizedTodos?.length || 0,
            completionRate: response.data.data.personalMetrics?.goalCompletionRate || 0
          });
        }
      } else {
        throw new Error(response?.data?.error || 'Failed to load insights');
      }
    } catch (err) {
      console.error('Error loading personal insights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'take_assessment':
        window.location.href = createPageUrl('LeadershipAssessment');
        break;
      case 'update_goals':
        window.location.href = createPageUrl('Performance');
        break;
      case 'view_learning':
        window.location.href = createPageUrl('LearningLibrary');
        break;
      case 'continue_journey':
        window.location.href = createPageUrl('MyJourneys');
        break;
      case 'view_career_path':
        window.location.href = createPageUrl('CareerPathExplorer');
        break;
      case 'update_profile':
        window.location.href = createPageUrl('Profile');
        break;
      default:
        toast.info('Action not implemented');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'leadership_development': return <Award className="w-4 h-4 text-purple-600" />;
      case 'goal_achievement': return <Target className="w-4 h-4 text-blue-600" />;
      case 'learning_effectiveness': return <BookOpen className="w-4 h-4 text-green-600" />;
      case 'career_progression': return <TrendingUp className="w-4 h-4 text-indigo-600" />;
      default: return <Brain className="w-4 h-4 text-purple-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load Insights</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadPersonalInsights}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!personalInsights) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
          <p className="text-gray-600 mb-4">Complete your assessment to get personalized insights.</p>
          <Button onClick={() => handleQuickAction('take_assessment')}>
            Take Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Extract strengths, improvements, and blind spots
  const strengths = personalInsights.keyInsights?.filter(i => i.category === 'strength' || i.type === 'strength') || [];
  const improvements = personalInsights.keyInsights?.filter(i => i.category === 'improvement' || i.type === 'improvement') || [];
  const blindSpots = personalInsights.keyInsights?.filter(i => i.category === 'blind_spot' || i.type === 'blind_spot') || [];
  const generalInsights = personalInsights.keyInsights?.filter(i => 
    !['strength', 'improvement', 'blind_spot'].includes(i.category) && 
    !['strength', 'improvement', 'blind_spot'].includes(i.type)
  ) || [];

  const peerComparison = personalInsights.peerComparison || [];
  const performanceTrends = personalInsights.performanceTrends || {};

  return (
    <div className="space-y-6">
      {/* Filters */}
      <InsightsFilters
        viewScope="my"
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showClient={false}
        showUserGroup={false}
        showLeadershipLevel={false}
        showCompetency={true}
        competencies={competencies}
      />

      {/* AI-Generated Insights Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>AI-Generated Insights</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Personalized recommendations based on your data</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Expandable Insight Cards */}
            {generalInsights.length > 0 || strengths.length > 0 || improvements.length > 0 ? (
              <div className="space-y-3">
                {[...generalInsights, ...strengths.slice(0, 1), ...improvements.slice(0, 2)].map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} onAction={handleQuickAction} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Brain className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>Complete more activities to generate personalized insights</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Trends */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <CardTitle>Performance Trends</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <TrendMetric 
                label="Leadership Effectiveness" 
                value={performanceTrends.leadershipEffectiveness || personalInsights.personalMetrics?.currentAssessmentScore || 0}
                trend={performanceTrends.leadershipTrend || '+5%'}
                trendPeriod="last 3 months"
              />
              <TrendMetric 
                label="Team Engagement" 
                value={performanceTrends.teamEngagement || personalInsights.personalMetrics?.goalCompletionRate || 0}
                trend={performanceTrends.engagementTrend || '+8%'}
                trendPeriod="last quarter"
              />
              <TrendMetric 
                label="Goal Completion Rate" 
                value={personalInsights.personalMetrics?.goalCompletionRate || 0}
                trend={performanceTrends.goalTrend || '-3%'}
                trendPeriod="this month"
                negative={performanceTrends.goalTrend?.startsWith('-')}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Peer Comparison */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <CardTitle>Peer Comparison</CardTitle>
              </div>
              <span className="text-xs text-gray-400">Anonymous · Similar leaders</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <PeerComparisonRow 
                label="Overall Leadership Effectiveness"
                yourScore={personalInsights.personalMetrics?.currentAssessmentScore || 72}
                peerPercentile={personalInsights.peerComparison?.overallPercentile || 75}
                description="You score higher than 75% of mid-level managers in your industry"
              />
              <PeerComparisonRow 
                label="Stakeholder Management"
                yourScore={personalInsights.competencyBreakdown?.sm || 68}
                peerPercentile={personalInsights.peerComparison?.smPercentile || 85}
                description="Top 15% in building and maintaining key relationships"
              />
              <PeerComparisonRow 
                label="Communication"
                yourScore={personalInsights.competencyBreakdown?.comm || 65}
                peerPercentile={personalInsights.peerComparison?.commPercentile || 60}
                description="Room for improvement compared to your peers"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Strengths, Improvements & Blind Spots Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Strengths */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-green-600" />
                <CardTitle className="text-base">Your Strengths</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {strengths.length > 0 ? (
                <ul className="space-y-2">
                  {strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{s.title || s.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Strong situational awareness</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Effective stakeholder relationships</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Consistent goal achievement</span>
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Areas of Improvement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-base">Areas of Improvement</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {improvements.length > 0 ? (
                <ul className="space-y-2">
                  {improvements.map((i, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Target className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{i.title || i.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Decision-making speed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Cross-functional communication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Delegation effectiveness</span>
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Potential Blind Spots */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-red-600" />
                <CardTitle className="text-base">Potential Blind Spots</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {blindSpots.length > 0 ? (
                <ul className="space-y-2">
                  {blindSpots.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{b.title || b.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span>May overlook team morale signals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span>Risk of micromanaging under pressure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span>Limited visibility into indirect reports</span>
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Competency Profile */}
      {personalInsights.competencyBreakdown && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Competency Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { competency: 'SI', score: personalInsights.competencyBreakdown.si || 0, fullName: 'Situational Intelligence' },
                    { competency: 'DM', score: personalInsights.competencyBreakdown.dm || 0, fullName: 'Decision Making' },
                    { competency: 'Comm', score: personalInsights.competencyBreakdown.comm || 0, fullName: 'Communication' },
                    { competency: 'RM', score: personalInsights.competencyBreakdown.rm || 0, fullName: 'Resource Management' },
                    { competency: 'SM', score: personalInsights.competencyBreakdown.sm || 0, fullName: 'Stakeholder Management' },
                    { competency: 'PM', score: personalInsights.competencyBreakdown.pm || 0, fullName: 'Performance Management' }
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="competency" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Your Scores" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    <RechartsTooltip formatter={(value, name, props) => [`${value}%`, props.payload.fullName]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start hover:bg-blue-50"
                onClick={() => handleQuickAction('update_goals')}
              >
                <Target className="w-5 h-5 text-blue-600 mb-2" />
                <span className="font-semibold">Update Goals</span>
                <span className="text-xs text-gray-500 mt-1">Track your progress</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start hover:bg-purple-50"
                onClick={() => handleQuickAction('take_assessment')}
              >
                <BarChart3 className="w-5 h-5 text-purple-600 mb-2" />
                <span className="font-semibold">Take Assessment</span>
                <span className="text-xs text-gray-500 mt-1">Measure your growth</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start hover:bg-green-50"
                onClick={() => handleQuickAction('view_learning')}
              >
                <BookOpen className="w-5 h-5 text-green-600 mb-2" />
                <span className="font-semibold">Browse Learning</span>
                <span className="text-xs text-gray-500 mt-1">Find resources</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start hover:bg-indigo-50"
                onClick={() => handleQuickAction('view_career_path')}
              >
                <Map className="w-5 h-5 text-indigo-600 mb-2" />
                <span className="font-semibold">Explore Careers</span>
                <span className="text-xs text-gray-500 mt-1">Plan your path</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}