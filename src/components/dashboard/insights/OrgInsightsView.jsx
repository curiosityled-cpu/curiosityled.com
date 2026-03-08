import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Target,
  Users,
  BookOpen,
  BarChart3,
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Activity,
  Link as LinkIcon,
  MessageSquare,
  RefreshCw
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis
} from "recharts";
import { motion } from "framer-motion";
import { format, subDays, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import {
  LeadershipReadinessCard,
  SuccessionPipelineCard,
  SkillsGapCard,
  FlightRiskCard,
  PromotionReadinessCard,
  LearningVelocityCard,
  LeadershipStyleCard,
  DecisionMakingCard,
  IndustryBenchmarkCard,
  TeamImpactCard,
  DevelopmentFocusCard
} from "@/components/intelligence/PlatformInsightsCards.jsx";

const PRIORITY_COLORS = {
  'High Risk': 'bg-red-100 text-red-800 border-red-200',
  'Strategic Priority': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Positive Impact': 'bg-green-100 text-green-800 border-green-200',
  'Opportunity': 'bg-blue-100 text-blue-800 border-blue-200'
};

export default function OrgInsightsView({ user, onMetricsUpdate }) {
  const { isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  
  const [filters, setFilters] = useState({
    timeframe: '6months',
    division: 'all',
    level: 'all',
    tenure: 'all',
    competencyFocus: 'all',
    riskProfile: 'all',
    industry: 'all'
  });

  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [appliedCustomDateRange, setAppliedCustomDateRange] = useState({ from: null, to: null });
  
  const [rawData, setRawData] = useState({
    assessments: [],
    goals: [],
    assignedLearning: [],
    journeyEnrollments: [],
    allUsers: []
  });
  
  const [aiInsights, setAiInsights] = useState([]);
  const [executiveBriefing, setExecutiveBriefing] = useState('');
  const [strategicRisks, setStrategicRisks] = useState([]);
  const [strategicOpportunities, setStrategicOpportunities] = useState([]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [assessments, goals, assignedLearning, journeyEnrollments, allUsers] = await Promise.all([
        base44.entities.Assessment.list(),
        base44.entities.Goal.list(),
        base44.entities.AssignedLearning.list(),
        base44.entities.JourneyEnrollment.list(),
        base44.entities.User.list()
      ]);

      setRawData({
        assessments: assessments || [],
        goals: goals || [],
        assignedLearning: assignedLearning || [],
        journeyEnrollments: journeyEnrollments || [],
        allUsers: allUsers || []
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load intelligence data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setShowCustomDateDialog(true);
    } else {
      setFilters({ ...filters, timeframe: value });
      setCustomDateRange({ from: null, to: null });
      setAppliedCustomDateRange({ from: null, to: null });
    }
  };

  const handleCustomDateApply = () => {
    if (customDateRange.from && customDateRange.to) {
      setAppliedCustomDateRange(customDateRange);
      setFilters({ ...filters, timeframe: 'custom' });
      setShowCustomDateDialog(false);
    } else {
      toast.error('Please select both a start and end date');
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomDateDialog(false);
    if (!appliedCustomDateRange.from || !appliedCustomDateRange.to) {
      if (filters.timeframe === 'custom') {
        setFilters({ ...filters, timeframe: '6months' });
      }
    }
    setCustomDateRange(appliedCustomDateRange);
  };

  const setQuickRange = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    setCustomDateRange({ from, to });
  };

  const getDateCutoff = () => {
    if (filters.timeframe === 'custom' && appliedCustomDateRange.from) {
      return startOfDay(appliedCustomDateRange.from);
    }
    const now = new Date();
    switch(filters.timeframe) {
      case '3months': return subDays(now, 90);
      case '6months': return subDays(now, 180);
      case '12months': return subDays(now, 365);
      case 'all': return new Date(0);
      default: return subDays(now, 180);
    }
  };

  const getDateEnd = () => {
    if (filters.timeframe === 'custom' && appliedCustomDateRange.to) {
      return startOfDay(addDays(appliedCustomDateRange.to, 1));
    }
    return startOfDay(addDays(new Date(), 1));
  };

  const filteredData = useMemo(() => {
    const cutoffDate = getDateCutoff();
    const endDate = getDateEnd();
    
    let filteredUsers = [...rawData.allUsers];
    let filteredAssessments = [...rawData.assessments];
    let filteredGoals = [...rawData.goals];
    let filteredLearning = [...rawData.assignedLearning];
    let filteredJourneys = [...rawData.journeyEnrollments];

    // Apply date filters
    filteredAssessments = filteredAssessments.filter(a => {
      const date = new Date(a.created_date);
      return isAfter(date, cutoffDate) && isBefore(date, endDate);
    });

    filteredGoals = filteredGoals.filter(g => {
      const date = new Date(g.created_date);
      return isAfter(date, cutoffDate) && isBefore(date, endDate);
    });

    filteredLearning = filteredLearning.filter(l => {
      const date = new Date(l.created_date);
      return isAfter(date, cutoffDate) && isBefore(date, endDate);
    });

    filteredJourneys = filteredJourneys.filter(j => {
      const date = new Date(j.enrolled_date);
      return isAfter(date, cutoffDate) && isBefore(date, endDate);
    });

    // Apply division filter
    if (filters.division !== 'all') {
      const divisionUsers = filteredUsers.filter(u => u.department === filters.division);
      const divisionEmails = new Set(divisionUsers.map(u => u.email));
      filteredAssessments = filteredAssessments.filter(a => divisionEmails.has(a.email));
      filteredGoals = filteredGoals.filter(g => divisionEmails.has(g.user_email));
      filteredLearning = filteredLearning.filter(l => divisionEmails.has(l.user_email));
      filteredJourneys = filteredJourneys.filter(j => divisionEmails.has(j.user_email));
    }

    // Apply manager level filter
    if (filters.level !== 'all') {
      const levelUsers = filteredUsers.filter(u => {
        const role = (u.current_role || '').toLowerCase();
        if (filters.level === 'manager') return role.includes('manager') && !role.includes('director') && !role.includes('vp') && !role.includes('chief');
        if (filters.level === 'director') return role.includes('director');
        if (filters.level === 'vp') return role.includes('vp') || role.includes('vice president');
        if (filters.level === 'c-suite') return role.includes('chief') || role.includes('ceo') || role.includes('cfo') || role.includes('cto') || role.includes('coo');
        return false;
      });
      const levelEmails = new Set(levelUsers.map(u => u.email));
      filteredAssessments = filteredAssessments.filter(a => levelEmails.has(a.email));
      filteredGoals = filteredGoals.filter(g => levelEmails.has(g.user_email));
      filteredLearning = filteredLearning.filter(l => levelEmails.has(l.user_email));
      filteredJourneys = filteredJourneys.filter(j => levelEmails.has(j.user_email));
    }

    // Apply tenure filter
    if (filters.tenure !== 'all') {
      const tenureUsers = filteredUsers.filter(u => {
        if (!u.start_date) return false;
        const monthsEmployed = Math.floor((new Date() - new Date(u.start_date)) / (1000 * 60 * 60 * 24 * 30));
        if (filters.tenure === '0-6') return monthsEmployed >= 0 && monthsEmployed <= 6;
        if (filters.tenure === '6-12') return monthsEmployed > 6 && monthsEmployed <= 12;
        if (filters.tenure === '1-2') return monthsEmployed > 12 && monthsEmployed <= 24;
        if (filters.tenure === '2-5') return monthsEmployed > 24 && monthsEmployed <= 60;
        if (filters.tenure === '5plus') return monthsEmployed > 60;
        return false;
      });
      const tenureEmails = new Set(tenureUsers.map(u => u.email));
      filteredAssessments = filteredAssessments.filter(a => tenureEmails.has(a.email));
      filteredGoals = filteredGoals.filter(g => tenureEmails.has(g.user_email));
      filteredLearning = filteredLearning.filter(l => tenureEmails.has(l.user_email));
      filteredJourneys = filteredJourneys.filter(j => tenureEmails.has(j.user_email));
    }

    // Apply competency focus filter
    if (filters.competencyFocus !== 'all') {
      filteredAssessments = filteredAssessments.filter(a => {
        const score = a[`${filters.competencyFocus}_pct`] || 0;
        return score < 70;
      });
    }

    // Apply risk profile filter
    if (filters.riskProfile !== 'all') {
      if (filters.riskProfile === 'at_risk') {
        filteredAssessments = filteredAssessments.filter(a => (a.overall_pct || 0) < 60);
      } else if (filters.riskProfile === 'high_potential') {
        filteredAssessments = filteredAssessments.filter(a => (a.overall_pct || 0) >= 85);
      }
    }

    // Apply industry filter
    if (filters.industry !== 'all') {
      const industryUsers = filteredUsers.filter(u => u.industry === filters.industry);
      const industryEmails = new Set(industryUsers.map(u => u.email));
      filteredAssessments = filteredAssessments.filter(a => industryEmails.has(a.email));
      filteredGoals = filteredGoals.filter(g => industryEmails.has(g.created_by));
      filteredLearning = filteredLearning.filter(l => industryEmails.has(l.user_email));
      filteredJourneys = filteredJourneys.filter(j => industryEmails.has(j.user_email));
    }

    return {
      assessments: filteredAssessments,
      goals: filteredGoals,
      assignedLearning: filteredLearning,
      journeyEnrollments: filteredJourneys
    };
  }, [rawData, filters, appliedCustomDateRange]);

  const metrics = useMemo(() => {
    const { assessments, goals, assignedLearning, journeyEnrollments } = filteredData;

    const avgLeadershipScore = assessments.length > 0
      ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / assessments.length)
      : 0;

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    const totalLearning = assignedLearning.length;
    const completedLearning = assignedLearning.filter(l => l.status === 'completed').length;
    const learningCompletionRate = totalLearning > 0 ? Math.round((completedLearning / totalLearning) * 100) : 0;

    const totalJourneys = journeyEnrollments.length;
    const completedJourneys = journeyEnrollments.filter(j => j.status === 'completed').length;
    const journeyCompletionRate = totalJourneys > 0 ? Math.round((completedJourneys / totalJourneys) * 100) : 0;

    const atRiskLeaders = assessments.filter(a => (a.overall_pct || 0) < 60).length;
    const highPotentialLeaders = assessments.filter(a => (a.overall_pct || 0) >= 85).length;
    const overdueGoals = goals.filter(g => g.status === 'overdue').length;

    const competencyAverages = {
      si: Math.round(assessments.reduce((sum, a) => sum + (a.si_pct || 0), 0) / (assessments.length || 1)),
      dm: Math.round(assessments.reduce((sum, a) => sum + (a.dm_pct || 0), 0) / (assessments.length || 1)),
      comm: Math.round(assessments.reduce((sum, a) => sum + (a.comm_pct || 0), 0) / (assessments.length || 1)),
      rm: Math.round(assessments.reduce((sum, a) => sum + (a.rm_pct || 0), 0) / (assessments.length || 1)),
      sm: Math.round(assessments.reduce((sum, a) => sum + (a.sm_pct || 0), 0) / (assessments.length || 1)),
      pm: Math.round(assessments.reduce((sum, a) => sum + (a.pm_pct || 0), 0) / (assessments.length || 1))
    };

    // Update parent metrics
    if (onMetricsUpdate) {
      onMetricsUpdate({
        totalInsights: aiInsights.length || 0,
        actionItems: strategicOpportunities.length + strategicRisks.length,
        completionRate: goalCompletionRate
      });
    }

    return {
      avgLeadershipScore,
      goalCompletionRate,
      learningCompletionRate,
      journeyCompletionRate,
      atRiskLeaders,
      highPotentialLeaders,
      overdueGoals,
      totalGoals,
      totalLearning,
      totalJourneys,
      totalAssessments: assessments.length,
      competencyAverages
    };
  }, [filteredData, aiInsights, strategicOpportunities, strategicRisks, onMetricsUpdate]);

  const chartData = useMemo(() => {
    const { assessments, goals, assignedLearning } = filteredData;

    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = subDays(new Date(), i * 30);
      const monthEnd = subDays(new Date(), (i - 1) * 30);
      
      const monthAssessments = assessments.filter(a => {
        const date = new Date(a.created_date);
        return isAfter(date, monthStart) && isBefore(date, monthEnd);
      });
      
      const monthGoals = goals.filter(g => {
        const date = new Date(g.created_date);
        return isAfter(date, monthStart) && isBefore(date, monthEnd);
      });

      const monthLearning = assignedLearning.filter(l => {
        const date = new Date(l.created_date);
        return isAfter(date, monthStart) && isBefore(date, monthEnd);
      });

      const avgAssessmentScore = monthAssessments.length > 0
        ? Math.round(monthAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / monthAssessments.length)
        : 0;

      const goalCompletion = monthGoals.length > 0
        ? Math.round((monthGoals.filter(g => g.status === 'completed').length / monthGoals.length) * 100)
        : 0;

      const learningCompletion = monthLearning.length > 0
        ? Math.round((monthLearning.filter(l => l.status === 'completed').length / monthLearning.length) * 100)
        : 0;

      trendData.push({
        month: format(monthStart, 'MMM'),
        assessmentScore: avgAssessmentScore,
        goalCompletion,
        learningCompletion
      });
    }

    const correlationData = assessments.map(a => {
      const userGoals = goals.filter(g => g.user_email === a.email);
      const userCompletedGoals = userGoals.filter(g => g.status === 'completed').length;
      const userGoalRate = userGoals.length > 0 ? Math.round((userCompletedGoals / userGoals.length) * 100) : 0;
      
      return {
        assessmentScore: a.overall_pct || 0,
        goalCompletionRate: userGoalRate,
        name: rawData.allUsers.find(u => u.email === a.email)?.full_name || 'Unknown'
      };
    }).filter(d => d.goalCompletionRate > 0);

    return { trendData, correlationData };
  }, [filteredData, rawData.allUsers]);

  const generateExecutiveBriefing = async () => {
    setGeneratingBriefing(true);
    try {
      const prompt = `You are an executive leadership consultant. Based on this organizational data, write a 2-3 paragraph executive briefing highlighting the most critical insights, opportunities, and strategic imperatives:
      
      Leadership Metrics:
      - Average Leadership Score: ${metrics.avgLeadershipScore}%
      - Total Assessments: ${metrics.totalAssessments}
      - At-Risk Leaders: ${metrics.atRiskLeaders}
      - High-Potential Leaders: ${metrics.highPotentialLeaders}
      
      Goal Performance:
      - Total Goals: ${metrics.totalGoals}
      - Completion Rate: ${metrics.goalCompletionRate}%
      - Overdue: ${metrics.overdueGoals}
      
      Learning Engagement:
      - Assignments: ${metrics.totalLearning}
      - Completion Rate: ${metrics.learningCompletionRate}%
      
      Journey Progress:
      - Enrollments: ${metrics.totalJourneys}
      - Completion Rate: ${metrics.journeyCompletionRate}%
      
      Filters: ${JSON.stringify(filters)}
      
      Write in a professional, strategic tone. Focus on actionable insights and business impact.`;
      
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setExecutiveBriefing(result || 'Unable to generate briefing at this time.');
      toast.success('Executive briefing generated');
    } catch (error) {
      console.error('Error generating briefing:', error);
      toast.error('Failed to generate briefing');
    } finally {
      setGeneratingBriefing(false);
    }
  };

  const generateCrossAnalytics = async () => {
    setGeneratingInsights(true);
    try {
      const prompt = `Analyze this comprehensive organizational leadership data and identify 5 cross-functional insights that show correlations between different metrics:

      Data Overview:
      - Leadership Assessment Avg: ${metrics.avgLeadershipScore}%
      - Goal Completion Rate: ${metrics.goalCompletionRate}%
      - Learning Completion: ${metrics.learningCompletionRate}%
      - Journey Completion: ${metrics.journeyCompletionRate}%
      - At-Risk Leaders: ${metrics.atRiskLeaders}
      - High Potential: ${metrics.highPotentialLeaders}
      - Overdue Goals: ${metrics.overdueGoals}
      
      Competency Scores:
      - SI: ${metrics.competencyAverages.si}%
      - Decision Making: ${metrics.competencyAverages.dm}%
      - Communication: ${metrics.competencyAverages.comm}%
      
      Provide insights that connect these metrics (e.g., "Leaders with high Communication scores show 25% better goal completion"). 
      
      Format as JSON with: title, description, priority ('High Risk', 'Strategic Priority', 'Positive Impact', or 'Opportunity'), targetDashboard (which analytics page to link to: 'EnterpriseAnalytics', 'Performance', 'LearningAnalyticsDashboard', 'JourneyAnalytics', or 'AssessmentAnalytics'), action (button label).`;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" },
                  targetDashboard: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string" },
                  action: { type: "string" },
                  targetDashboard: { type: "string" }
                }
              }
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  potential: { type: "string" },
                  action: { type: "string" },
                  targetDashboard: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiInsights(result?.insights || []);
      setStrategicRisks(result?.risks?.slice(0, 3) || []);
      setStrategicOpportunities(result?.opportunities?.slice(0, 3) || []);
      toast.success('AI insights generated successfully');
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setGeneratingInsights(false);
    }
  };

  const aiPrompts = [
    { icon: Target, text: "What are the primary drivers of low goal completion in my organization?", color: "text-orange-600" },
    { icon: Brain, text: "How can we accelerate leadership development for high-potential leaders?", color: "text-purple-600" },
    { icon: TrendingUp, text: "What's the ROI impact of our learning initiatives on performance?", color: "text-green-600" },
    { icon: Users, text: "Which departments need the most immediate leadership intervention?", color: "text-blue-600" },
    { icon: Sparkles, text: "What patterns exist between assessment scores and goal achievement?", color: "text-pink-600" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Unified Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Intelligence Filters:</span>
              </div>

              <Select value={filters.timeframe} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-48">
                  {filters.timeframe === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to ? (
                    <span className="text-sm">
                      {format(appliedCustomDateRange.from, 'MMM d')} - {format(appliedCustomDateRange.to, 'MMM d')}
                    </span>
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.division} onValueChange={(value) => setFilters({ ...filters, division: value })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.level} onValueChange={(value) => setFilters({ ...filters, level: value })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                  <SelectItem value="director">Directors</SelectItem>
                  <SelectItem value="vp">VPs</SelectItem>
                  <SelectItem value="c-suite">C-Suite</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.tenure} onValueChange={(value) => setFilters({ ...filters, tenure: value })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenure</SelectItem>
                  <SelectItem value="0-6">0-6 months</SelectItem>
                  <SelectItem value="6-12">6-12 months</SelectItem>
                  <SelectItem value="1-2">1-2 years</SelectItem>
                  <SelectItem value="2-5">2-5 years</SelectItem>
                  <SelectItem value="5plus">5+ years</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.riskProfile} onValueChange={(value) => setFilters({ ...filters, riskProfile: value })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Profiles</SelectItem>
                  <SelectItem value="at_risk">At-Risk Only</SelectItem>
                  <SelectItem value="high_potential">High-Potential Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.industry} onValueChange={(value) => setFilters({ ...filters, industry: value })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Financial Services">Financial Services</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Energy">Energy</SelectItem>
                  <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                  <SelectItem value="Professional Services">Professional Services</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Government">Government</SelectItem>
                  <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Transportation">Transportation</SelectItem>
                  <SelectItem value="Hospitality">Hospitality</SelectItem>
                  <SelectItem value="Media & Entertainment">Media & Entertainment</SelectItem>
                </SelectContent>
              </Select>
              </div>
              </CardContent>
              </Card>
              </motion.div>

      {/* Executive Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate(createPageUrl('EnterpriseAnalytics'))}>
            <CardContent className="p-6">
              <Brain className="w-8 h-8 text-purple-600 mb-4" />
              <div className="text-3xl font-bold text-gray-900">{metrics.avgLeadershipScore}%</div>
              <div className="text-sm text-gray-600 mt-1">Avg Leadership Capability</div>
              <div className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate(createPageUrl('Performance'))}>
            <CardContent className="p-6">
              <Target className="w-8 h-8 text-blue-600 mb-4" />
              <div className="text-3xl font-bold text-gray-900">{metrics.goalCompletionRate}%</div>
              <div className="text-sm text-gray-600 mt-1">Goal Achievement Rate</div>
              <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate(createPageUrl('LearningAnalyticsDashboard'))}>
            <CardContent className="p-6">
              <BookOpen className="w-8 h-8 text-green-600 mb-4" />
              <div className="text-3xl font-bold text-gray-900">{metrics.learningCompletionRate}%</div>
              <div className="text-sm text-gray-600 mt-1">Learning Engagement</div>
              <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate(createPageUrl('JourneyAnalytics'))}>
            <CardContent className="p-6">
              <Activity className="w-8 h-8 text-orange-600 mb-4" />
              <div className="text-3xl font-bold text-gray-900">{metrics.journeyCompletionRate}%</div>
              <div className="text-sm text-gray-600 mt-1">Journey Completion</div>
              <div className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Executive AI Briefing */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  Executive AI Briefing
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Strategic synthesis of your organizational leadership data</p>
              </div>
              <Button onClick={generateExecutiveBriefing} disabled={generatingBriefing}>
                {generatingBriefing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {executiveBriefing ? 'Regenerate' : 'Generate'} Briefing
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {executiveBriefing ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{executiveBriefing}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Click "Generate Briefing" to receive an AI-powered executive summary
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Cross-Functional AI Insights */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  Cross-Functional Intelligence Insights
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">AI-identified correlations across leadership, learning, and performance data</p>
              </div>
              <Button onClick={generateCrossAnalytics} disabled={generatingInsights} className="bg-blue-600 hover:bg-blue-700">
                {generatingInsights ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                {aiInsights.length > 0 ? 'Refresh' : 'Generate'} Insights
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {aiInsights.length > 0 ? (
              <div className="space-y-4">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className={`p-4 border rounded-lg ${PRIORITY_COLORS[insight.priority] || 'bg-gray-100 text-gray-800'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge className={PRIORITY_COLORS[insight.priority]}>{insight.priority}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => navigate(createPageUrl(insight.targetDashboard || 'EnterpriseAnalytics'))}
                    >
                      <LinkIcon className="w-3 h-3 mr-2" />
                      {insight.action}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Click "Generate Insights" to receive AI-powered cross-functional analysis
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Strategic Risk & Opportunity Spotlight */}
      <div className="grid md:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Top Strategic Risks
              </CardTitle>
              <p className="text-sm text-gray-600">Critical issues requiring immediate attention</p>
            </CardHeader>
            <CardContent>
              {strategicRisks.length > 0 ? (
                <div className="space-y-3">
                  {strategicRisks.map((risk, idx) => (
                    <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-red-900">{risk.title}</h4>
                        <Badge className="bg-red-600 text-white">{risk.severity}</Badge>
                      </div>
                      <p className="text-sm text-red-800 mb-3">{risk.description}</p>
                      <Button 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => navigate(createPageUrl(risk.targetDashboard || 'EnterpriseAnalytics'))}
                      >
                        {risk.action}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Generate insights to identify strategic risks
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                <TrendingUp className="w-5 h-5" />
                Top Strategic Opportunities
              </CardTitle>
              <p className="text-sm text-gray-600">High-impact growth potential areas</p>
            </CardHeader>
            <CardContent>
              {strategicOpportunities.length > 0 ? (
                <div className="space-y-3">
                  {strategicOpportunities.map((opportunity, idx) => (
                    <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-green-900">{opportunity.title}</h4>
                        <Badge className="bg-green-600 text-white">{opportunity.potential}</Badge>
                      </div>
                      <p className="text-sm text-green-800 mb-3">{opportunity.description}</p>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => navigate(createPageUrl(opportunity.targetDashboard || 'EnterpriseAnalytics'))}
                      >
                        {opportunity.action}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Generate insights to discover growth opportunities
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Integrated Trend Analysis */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Multi-Domain Performance Trends</CardTitle>
            <p className="text-sm text-gray-600">Unified view of leadership, goal, and learning metrics over time</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="assessmentScore" stroke="#8b5cf6" strokeWidth={2} name="Leadership Score %" />
                <Line type="monotone" dataKey="goalCompletion" stroke="#3b82f6" strokeWidth={2} name="Goal Completion %" />
                <Line type="monotone" dataKey="learningCompletion" stroke="#10b981" strokeWidth={2} name="Learning Completion %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Correlation Analysis */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Performance Correlation Analysis</CardTitle>
            <p className="text-sm text-gray-600">Relationship between leadership assessment scores and goal achievement</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assessmentScore" name="Leadership Score" unit="%" />
                <YAxis dataKey="goalCompletionRate" name="Goal Completion" unit="%" />
                <ZAxis range={[100, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Leaders" data={chartData.correlationData} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              <strong>Insight:</strong> This chart reveals the correlation between leadership capability and execution effectiveness. 
              Leaders in the upper-right quadrant demonstrate both strong capability and high performance.
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Strategic Platform Insights Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          Strategic Platform Insights
        </h2>
        <p className="text-gray-600 mb-6">Platform-wide trends and patterns to inform strategic decisions</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LeadershipReadinessCard metrics={metrics} assessments={filteredData.assessments} />
          <SuccessionPipelineCard assessments={filteredData.assessments} allUsers={rawData.allUsers} />
          <SkillsGapCard metrics={metrics} />
        </div>
      </motion.div>

      {/* Predictive Insights Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Predictive Insights
        </h2>
        <p className="text-gray-600 mb-6">Forward-looking indicators and risk signals</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FlightRiskCard 
            assessments={filteredData.assessments} 
            goals={filteredData.goals} 
            assignedLearning={filteredData.assignedLearning} 
          />
          <PromotionReadinessCard assessments={filteredData.assessments} allUsers={rawData.allUsers} />
          <LearningVelocityCard 
            assignedLearning={filteredData.assignedLearning} 
            journeyEnrollments={filteredData.journeyEnrollments} 
          />
        </div>
      </motion.div>

      {/* Behavioral & Performance Insights Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          Behavioral & Performance Insights
        </h2>
        <p className="text-gray-600 mb-6">Leadership patterns and decision quality metrics</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LeadershipStyleCard assessments={filteredData.assessments} />
          <DecisionMakingCard metrics={metrics} />
          <TeamImpactCard metrics={metrics} goals={filteredData.goals} />
        </div>
      </motion.div>

      {/* Benchmarks & Development Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.64 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-teal-600" />
          Benchmarks & Development Priorities
        </h2>
        <p className="text-gray-600 mb-6">Industry comparisons and focus areas</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <IndustryBenchmarkCard metrics={metrics} />
          <DevelopmentFocusCard metrics={metrics} />
        </div>
      </motion.div>

      {/* AI Decision Support Prompts */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.66 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              AI Decision Support
            </CardTitle>
            <p className="text-sm text-gray-600">Quick prompts for strategic questions about your organization</p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {aiPrompts.map((prompt, idx) => {
                const PromptIcon = prompt.icon;
                return (
                  <Button
                    key={idx}
                    variant="outline"
                    className="h-auto py-4 justify-start text-left hover:bg-indigo-50 hover:border-indigo-300"
                    onClick={() => {
                      toast.info('AI Coach feature coming soon!');
                    }}
                  >
                    <PromptIcon className={`w-5 h-5 mr-3 flex-shrink-0 ${prompt.color}`} />
                    <span className="text-sm">{prompt.text}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Access Dashboard Links */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.68 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700" />
              Detailed Analytics Dashboards
            </CardTitle>
            <p className="text-sm text-gray-600">Drill down into specific domains for deeper analysis</p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 justify-between hover:bg-purple-50"
                onClick={() => navigate(createPageUrl('EnterpriseAnalytics'))}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-semibold">Strategic Leadership</div>
                    <div className="text-xs text-gray-500">Enterprise-wide view</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 justify-between hover:bg-blue-50"
                onClick={() => navigate(createPageUrl('AssessmentAnalyticsDashboard'))}
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold">Assessment Insights</div>
                    <div className="text-xs text-gray-500">Competency analysis</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 justify-between hover:bg-green-50"
                onClick={() => navigate(createPageUrl('LearningAnalyticsDashboard'))}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-semibold">Learning Analytics</div>
                    <div className="text-xs text-gray-500">Engagement & completion</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 justify-between hover:bg-orange-50"
                onClick={() => navigate(createPageUrl('JourneyAnalytics'))}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <div className="text-left">
                    <div className="font-semibold">Journey Analytics</div>
                    <div className="text-xs text-gray-500">Program tracking</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 justify-between hover:bg-indigo-50"
                onClick={() => navigate(createPageUrl('Performance'))}
              >
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <div className="text-left">
                    <div className="font-semibold">Goals Performance</div>
                    <div className="text-xs text-gray-500">Achievement tracking</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 justify-between hover:bg-pink-50"
                onClick={() => navigate(createPageUrl('CommandCenter'))}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-pink-600" />
                  <div className="text-left">
                    <div className="font-semibold">Command Center</div>
                    <div className="text-xs text-gray-500">Team management</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={(open) => {
        if (!open) handleCancelCustomRange();
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Select Custom Date Range</DialogTitle>
            <p className="text-sm text-gray-600 mt-1">Choose a date range to filter your analytics</p>
          </DialogHeader>
          
          <div className="flex flex-wrap gap-2 py-2 border-b">
            <Button variant="outline" size="sm" onClick={() => setQuickRange(7)} className="text-xs">
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(14)} className="text-xs">
              Last 14 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(30)} className="text-xs">
              Last 30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(60)} className="text-xs">
              Last 60 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(90)} className="text-xs">
              Last 90 Days
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                From Date
              </label>
              <Calendar
                mode="single"
                selected={customDateRange.from}
                onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                disabled={(date) => date > new Date() || (customDateRange.to && date > customDateRange.to)}
                className="rounded-lg border shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                To Date
              </label>
              <Calendar
                mode="single"
                selected={customDateRange.to}
                onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                disabled={(date) => date > new Date() || (customDateRange.from && date < customDateRange.from)}
                className="rounded-lg border shadow-sm"
              />
            </div>
          </div>
          
          {customDateRange.from && customDateRange.to && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center"
            >
              <p className="text-sm font-medium text-blue-900">
                Selected Range: {format(customDateRange.from, 'MMM d, yyyy')} - {format(customDateRange.to, 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {Math.ceil((customDateRange.to - customDateRange.from) / (1000 * 60 * 60 * 24))} days
              </p>
            </motion.div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelCustomRange}>
              Cancel
            </Button>
            <Button
              onClick={handleCustomDateApply}
              disabled={!customDateRange.from || !customDateRange.to}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Date Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}