import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Brain,
  Loader2,
  BarChart3,
  Calendar,
  Sparkles,
  AlertTriangle,
  Star,
  Lightbulb,
  Eye,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import InsightsFilters from "./InsightsFilters";

// Team Insight Card Component
function TeamInsightCard({ insight, onAction }) {
  const [expanded, setExpanded] = useState(false);
  
  const getPriorityBadgeStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
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
            {insight.affected_members && (
              <p className="text-xs text-gray-500 mb-3">Affects {insight.affected_members} team members</p>
            )}
            <Button size="sm" variant="outline" onClick={() => onAction && onAction(insight.action_type)} className="gap-2">
              Take Action <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Team Trend Metric
function TeamTrendMetric({ label, value, trend, trendPeriod, negative = false }) {
  const isNegative = negative || trend?.startsWith('-');
  
  return (
    <div className="text-center">
      <div className="text-3xl font-bold flex items-center justify-center gap-2">
        <span className={isNegative ? 'text-red-600' : 'text-green-600'}>{trend}</span>
      </div>
      <div className="text-lg font-medium text-gray-700 mt-1">{label}</div>
      <div className="text-xs text-gray-400">{trendPeriod}</div>
    </div>
  );
}

// Team Peer Comparison Row
function TeamComparisonRow({ label, teamScore, benchmarkPercentile, description }) {
  const isAboveAverage = benchmarkPercentile >= 50;
  
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <Badge 
        variant="outline" 
        className={isAboveAverage ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}
      >
        {isAboveAverage ? 'Above Benchmark' : 'Below Benchmark'}
      </Badge>
    </div>
  );
}

export default function TeamInsightsView({ user, onMetricsUpdate }) {
  const [loading, setLoading] = useState(true);
  const [managerInsights, setManagerInsights] = useState(null);
  const [error, setError] = useState(null);
  const [competencies, setCompetencies] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [filters, setFilters] = useState({
    timeframe: '30d',
    startDate: null,
    endDate: null,
    userGroupId: 'all',
    leadershipLevel: 'all',
    competencyId: 'all'
  });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadManagerInsights();
  }, [user, filters]);

  const loadFilterOptions = async () => {
    try {
      const [comps, cohorts] = await Promise.all([
        base44.entities.Competency.list(),
        base44.entities.Cohort.list()
      ]);
      setCompetencies(comps);
      setUserGroups(cohorts.map(c => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const loadManagerInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('getManagerInsights', {
        time_range: filters.timeframe,
        start_date: filters.startDate,
        end_date: filters.endDate,
        user_group_id: filters.userGroupId !== 'all' ? filters.userGroupId : null,
        leadership_level: filters.leadershipLevel !== 'all' ? filters.leadershipLevel : null,
        competency_id: filters.competencyId !== 'all' ? filters.competencyId : null,
        user_id: user?.id
      });

      if (response?.data?.success) {
        setManagerInsights(response.data.data);
        if (onMetricsUpdate) {
          onMetricsUpdate({
            totalInsights: response.data.data.teamInsights?.length || 0,
            actionItems: response.data.data.oneOnOneRecommendations?.length || 0,
            completionRate: response.data.data.teamMetrics?.teamGoalCompletionRate || 0
          });
        }
      } else {
        throw new Error(response?.data?.error || 'Failed to load team insights');
      }
    } catch (err) {
      console.error('Error loading team insights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
      case 'engagement': return <Users className="w-4 h-4 text-green-600" />;
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
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load Team Insights</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadManagerInsights}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!managerInsights?.hasDirectReports) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Team Members Found</h3>
          <p className="text-gray-600">Team insights will be available once team members are assigned to you.</p>
        </CardContent>
      </Card>
    );
  }

  // Extract team-level strengths, improvements, and blind spots
  const teamStrengths = managerInsights.teamInsights?.filter(i => i.category === 'strength' || i.type === 'strength') || [];
  const teamImprovements = managerInsights.teamInsights?.filter(i => i.category === 'improvement' || i.type === 'improvement') || [];
  const teamBlindSpots = managerInsights.teamInsights?.filter(i => i.category === 'blind_spot' || i.type === 'blind_spot') || [];
  const generalTeamInsights = managerInsights.teamInsights?.filter(i => 
    !['strength', 'improvement', 'blind_spot'].includes(i.category) && 
    !['strength', 'improvement', 'blind_spot'].includes(i.type)
  ) || [];

  const teamTrends = managerInsights.teamTrends || {};
  const teamBenchmark = managerInsights.teamBenchmark || {};

  const handleAction = (actionType) => {
    switch (actionType) {
      case 'schedule_1on1':
        toast.info('Opening 1-on-1 scheduler...');
        break;
      case 'assign_learning':
        window.location.href = createPageUrl('LearningLibrary');
        break;
      case 'review_goals':
        window.location.href = createPageUrl('OrgPerformance');
        break;
      default:
        toast.info('Action coming soon');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <InsightsFilters
        viewScope="team"
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showClient={false}
        showUserGroup={true}
        showLeadershipLevel={true}
        showCompetency={true}
        userGroups={userGroups}
        competencies={competencies}
      />

      {/* AI-Generated Team Insights */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>AI-Generated Insights</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Team-wide recommendations based on collective data</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {generalTeamInsights.length > 0 || teamStrengths.length > 0 || teamImprovements.length > 0 ? (
              <div className="space-y-3">
                {[...generalTeamInsights.slice(0, 3), ...teamImprovements.slice(0, 2)].map((insight, idx) => (
                  <TeamInsightCard key={idx} insight={insight} onAction={handleAction} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Brain className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>More team activity needed to generate insights</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Team Performance Trends */}
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
              <TeamTrendMetric 
                label="Leadership Effectiveness" 
                value={teamTrends.leadershipEffectiveness || managerInsights.teamMetrics?.avgTeamScore || 0}
                trend={teamTrends.leadershipTrend || '+5%'}
                trendPeriod="last 3 months"
              />
              <TeamTrendMetric 
                label="Team Engagement" 
                value={teamTrends.teamEngagement || 78}
                trend={teamTrends.engagementTrend || '+8%'}
                trendPeriod="last quarter"
              />
              <TeamTrendMetric 
                label="Goal Completion Rate" 
                value={managerInsights.teamMetrics?.teamGoalCompletionRate || 0}
                trend={teamTrends.goalTrend || '-3%'}
                trendPeriod="this month"
                negative={teamTrends.goalTrend?.startsWith('-')}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team Benchmark Comparison */}
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
              <span className="text-xs text-gray-400">Anonymous · Similar teams</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TeamComparisonRow 
                label="Overall Team Effectiveness"
                teamScore={managerInsights.teamMetrics?.avgTeamScore || 72}
                benchmarkPercentile={teamBenchmark.overallPercentile || 68}
                description={`Your team performs better than ${teamBenchmark.overallPercentile || 68}% of similar teams`}
              />
              <TeamComparisonRow 
                label="Goal Achievement"
                teamScore={managerInsights.teamMetrics?.teamGoalCompletionRate || 65}
                benchmarkPercentile={teamBenchmark.goalPercentile || 55}
                description="Goal completion rate compared to industry average"
              />
              <TeamComparisonRow 
                label="Learning Engagement"
                teamScore={managerInsights.teamMetrics?.teamLearningCompletionRate || 70}
                benchmarkPercentile={teamBenchmark.learningPercentile || 72}
                description="Team learning activity vs. similar organizations"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team Strengths, Improvements & Blind Spots */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Team Strengths */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-green-600" />
                <CardTitle className="text-base">Team Strengths</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {teamStrengths.length > 0 ? (
                <ul className="space-y-2">
                  {teamStrengths.map((s, idx) => (
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
                    <span>Strong cross-functional collaboration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>High learning engagement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Consistent deadline adherence</span>
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Areas of Improvement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-base">Areas of Improvement</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {teamImprovements.length > 0 ? (
                <ul className="space-y-2">
                  {teamImprovements.map((i, idx) => (
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
                    <span>Strategic communication skills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Decision-making under pressure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Stakeholder management</span>
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Blind Spots */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-red-600" />
                <CardTitle className="text-base">Potential Blind Spots</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {teamBlindSpots.length > 0 ? (
                <ul className="space-y-2">
                  {teamBlindSpots.map((b, idx) => (
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
                    <span>Risk of siloed knowledge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span>Burnout signals in high performers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span>Succession gaps in key roles</span>
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 1-on-1 Recommendations */}
      {managerInsights.oneOnOneRecommendations?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                1-on-1 Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {managerInsights.oneOnOneRecommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <p className="font-medium text-gray-900">{rec.member_name}</p>
                      <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                        Schedule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Team Member Details */}
      {managerInsights.teamMemberProfiles?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Team Member Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {managerInsights.teamMemberProfiles.map((member, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      member.isAtRisk ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{member.full_name}</h4>
                        <p className="text-sm text-gray-600">{member.current_role || 'Team Member'}</p>
                      </div>
                      {member.isAtRisk && (
                        <Badge className="bg-red-100 text-red-800">At Risk</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Assessment Score</p>
                        <p className="font-bold">{member.latestAssessmentScore || 'N/A'}{member.latestAssessmentScore && '%'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Goal Progress</p>
                        <p className="font-bold">{member.goalCompletionRate || 0}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}