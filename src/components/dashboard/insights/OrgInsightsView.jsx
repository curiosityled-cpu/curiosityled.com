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
  RefreshCw,
  UserCheck
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import LeaderInsightProfilesCard from "./LeaderInsightProfilesCard";
import { useAtreusChat } from "@/components/ai/AtreusContext";
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
import ManagerEffectivenessCard from "@/components/intelligence/ManagerEffectivenessCard";

// Map AI-generated dashboard names to actual MVP routes
const DASHBOARD_ROUTES = {
  'EnterpriseAnalytics': '/AssessmentAnalyticsDashboard',
  'Performance': '/AssessmentAnalyticsDashboard',
  'LearningAnalyticsDashboard': '/LearningAnalyticsDashboard',
  'JourneyAnalytics': '/ExperienceAnalytics',
  'AssessmentAnalytics': '/AssessmentAnalyticsDashboard',
  'AssessmentAnalyticsDashboard': '/AssessmentAnalyticsDashboard',
  'Assessments': '/AssessmentAnalyticsDashboard',
  'Development': '/LearningAnalyticsDashboard',
  'CommandCenter': '/experience-overview',
};

const resolveRoute = (target) => DASHBOARD_ROUTES[target] || '/Insights?tab=org';

const PRIORITY_COLORS = {
  'High Risk': 'bg-red-100 text-red-800 border-red-200',
  'Strategic Priority': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Positive Impact': 'bg-green-100 text-green-800 border-green-200',
  'Opportunity': 'bg-blue-100 text-blue-800 border-blue-200'
};

export default function OrgInsightsView({ user, onMetricsUpdate }) {
  const { isPlatformAdmin, isSuperAdmin } = useAuth();
  const clientId = user?.client_id || user?.data?.client_id;
  const navigate = useNavigate();
  const { openWithContext } = useAtreusChat();

  const promptAtreus = (prompt) => {
    openWithContext({ draftMessage: prompt });
  };
  
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  
  const [filters, setFilters] = useState({
    timeframe: 'all',
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
    allUsers: [],
    assessmentInsights: []
  });
  
  const [aiInsights, setAiInsights] = useState([]);
  const [executiveBriefing, setExecutiveBriefing] = useState('');
  const [strategicRisks, setStrategicRisks] = useState([]);
  const [strategicOpportunities, setStrategicOpportunities] = useState([]);
  const [lastGeneratedFingerprint, setLastGeneratedFingerprint] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Scope queries by client_id for Analysts/non-platform-admins
      const insightQuery = clientId ? { client_id: clientId, status: 'generated' } : { status: 'generated' };
      const userQuery = clientId ? { client_id: clientId } : {};

      const [assessments, goals, assignedLearning, journeyEnrollments, allUsersRaw, assessmentInsights] = await Promise.all([
        base44.entities.Assessment.list('-created_date', 500).catch(() => []),
        base44.entities.Goal.list('-created_date', 500).catch(() => []),
        base44.entities.AssignedLearning.list('-created_date', 500).catch(() => []),
        base44.entities.JourneyEnrollment.list('-created_date', 500).catch(() => []),
        (clientId
          ? base44.entities.User.filter({ client_id: clientId })
          : base44.entities.User.list()
        ).catch(() => []),
        base44.entities.AssessmentInsights.filter(insightQuery).catch(() => [])
      ]);
      const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw : [];

      console.log('[OrgInsightsView] Loaded:', { assessments: assessments?.length, goals: goals?.length, assignedLearning: assignedLearning?.length, journeyEnrollments: journeyEnrollments?.length, allUsers: allUsers?.length, clientId });

      setRawData({
        assessments: assessments || [],
        goals: goals || [],
        assignedLearning: assignedLearning || [],
        journeyEnrollments: journeyEnrollments || [],
        allUsers: allUsers || [],
        assessmentInsights: assessmentInsights || []
      });
    } finally {
      setLoading(false);
    }
  };

  // Build a fingerprint from key metrics to detect meaningful data changes
  const metricsFingerprint = useMemo(() => {
    const { assessments, goals, assignedLearning } = rawData;
    return `${assessments.length}-${goals.length}-${assignedLearning.length}`;
  }, [rawData]);

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
        if (filters.tenure === '<1') return monthsEmployed < 12;
        if (filters.tenure === '1-2') return monthsEmployed >= 12 && monthsEmployed < 36;
        if (filters.tenure === '3-5') return monthsEmployed >= 36 && monthsEmployed < 60;
        if (filters.tenure === '6-10') return monthsEmployed >= 60 && monthsEmployed < 120;
        if (filters.tenure === '11-15') return monthsEmployed >= 120 && monthsEmployed < 180;
        if (filters.tenure === '16-20') return monthsEmployed >= 180 && monthsEmployed < 240;
        if (filters.tenure === '20+') return monthsEmployed >= 240;
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
        const score = a[`${filters.competencyFocus}_pct`] ?? a.data?.[`${filters.competencyFocus}_pct`] ?? 0;
        return score < 70;
      });
    }

    // Apply risk profile filter
    const overallPct = (a) => a.overall_pct ?? a.data?.overall_pct ?? 0;
    if (filters.riskProfile !== 'all') {
      if (filters.riskProfile === 'at_risk') {
        filteredAssessments = filteredAssessments.filter(a => overallPct(a) < 60);
      } else if (filters.riskProfile === 'high_potential') {
        filteredAssessments = filteredAssessments.filter(a => overallPct(a) >= 85);
      }
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

    // Helper: fields may be flattened by SDK or nested under .data
    const af = (a, field) => a[field] ?? a.data?.[field] ?? 0;
    const gf = (g, field) => g[field] ?? g.data?.[field];

    const avgLeadershipScore = assessments.length > 0
      ? Math.round(assessments.reduce((sum, a) => sum + af(a, 'overall_pct'), 0) / assessments.length)
      : 0;

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => gf(g, 'status') === 'completed').length;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    const totalLearning = assignedLearning.length;
    const completedLearning = assignedLearning.filter(l => gf(l, 'status') === 'completed').length;
    const learningCompletionRate = totalLearning > 0 ? Math.round((completedLearning / totalLearning) * 100) : 0;

    const totalJourneys = journeyEnrollments.length;
    const completedJourneys = journeyEnrollments.filter(j => gf(j, 'status') === 'completed').length;
    const journeyCompletionRate = totalJourneys > 0 ? Math.round((completedJourneys / totalJourneys) * 100) : 0;

    const atRiskLeaders = assessments.filter(a => af(a, 'overall_pct') < 60).length;
    const highPotentialLeaders = assessments.filter(a => af(a, 'overall_pct') >= 85).length;
    const overdueGoals = goals.filter(g => gf(g, 'status') === 'overdue').length;

    const competencyAverages = {
      si: Math.round(assessments.reduce((sum, a) => sum + af(a, 'si_pct'), 0) / (assessments.length || 1)),
      dm: Math.round(assessments.reduce((sum, a) => sum + af(a, 'dm_pct'), 0) / (assessments.length || 1)),
      comm: Math.round(assessments.reduce((sum, a) => sum + af(a, 'comm_pct'), 0) / (assessments.length || 1)),
      rm: Math.round(assessments.reduce((sum, a) => sum + af(a, 'rm_pct'), 0) / (assessments.length || 1)),
      sm: Math.round(assessments.reduce((sum, a) => sum + af(a, 'sm_pct'), 0) / (assessments.length || 1)),
      pm: Math.round(assessments.reduce((sum, a) => sum + af(a, 'pm_pct'), 0) / (assessments.length || 1))
    };

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

  const generateAll = async () => {
    setGeneratingAll(true);
    setGeneratingBriefing(true);
    setGeneratingInsights(true);
    try {
      const [briefingResult, insightsResult] = await Promise.all([
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a strategic HR advisor specializing in leadership development, with deep expertise in Decision Making (DM) and Situational Intelligence (SI) as primary drivers of Manager Effectiveness (ME). 

Curiosity Led's mission is to improve DM and SI to drive Manager Effectiveness across all leadership levels. Write a 2-3 paragraph executive briefing for a CHRO/CPO audience, analyzing this organizational data specifically through the lens of DM, SI, and Manager Effectiveness.

Core Competency Scores (0-100%):
- Decision Making: ${metrics.competencyAverages.dm}% (Industry target: 77%)
- Situational Intelligence: ${metrics.competencyAverages.si}% (Industry target: 75%)
- Communication: ${metrics.competencyAverages.comm}% (Industry target: 78%)
- Resource Management: ${metrics.competencyAverages.rm}% (Industry target: 78%)
- Stakeholder Management: ${metrics.competencyAverages.sm}% (Industry target: 79%)
- Performance Management: ${metrics.competencyAverages.pm}% (Industry target: 76%)

Manager Effectiveness Index (DM 35% + SI 30% + Comm 20% + PM 15%): ${Math.round(metrics.competencyAverages.dm * 0.35 + metrics.competencyAverages.si * 0.30 + metrics.competencyAverages.comm * 0.20 + metrics.competencyAverages.pm * 0.15)}%
Overall Leadership Score: ${metrics.avgLeadershipScore}% | Total Assessments: ${metrics.totalAssessments}
At-Risk Leaders (below 60%): ${metrics.atRiskLeaders} | High-Potential (above 85%): ${metrics.highPotentialLeaders}

Goal Completion: ${metrics.goalCompletionRate}% | Learning Completion: ${metrics.learningCompletionRate}% | Journey Completion: ${metrics.journeyCompletionRate}%

Focus your briefing on: (1) How DM and SI scores indicate current Manager Effectiveness health, (2) The most critical gap between current scores and industry benchmarks, (3) Strategic imperatives to elevate ME across leadership levels. Write in a professional, executive tone.`
        }),
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a strategic HR advisor for Curiosity Led, a platform focused on improving Decision Making (DM) and Situational Intelligence (SI) to drive Manager Effectiveness (ME) across all leadership levels.

Analyze this organizational leadership data and identify 5 cross-functional insights that reveal correlations between DM, SI, and Manager Effectiveness outcomes. Prioritize insights that help a CHRO/CPO take targeted action to improve ME.

Core Competency Scores (0-100%, industry targets in brackets):
- Decision Making: ${metrics.competencyAverages.dm}% [target: 77%]
- Situational Intelligence: ${metrics.competencyAverages.si}% [target: 75%]
- Communication: ${metrics.competencyAverages.comm}% [target: 78%]
- Resource Management: ${metrics.competencyAverages.rm}% [target: 78%]
- Stakeholder Management: ${metrics.competencyAverages.sm}% [target: 79%]
- Performance Management: ${metrics.competencyAverages.pm}% [target: 76%]

Manager Effectiveness Index: ${Math.round(metrics.competencyAverages.dm * 0.35 + metrics.competencyAverages.si * 0.30 + metrics.competencyAverages.comm * 0.20 + metrics.competencyAverages.pm * 0.15)}%
Overall Score: ${metrics.avgLeadershipScore}% | At-Risk: ${metrics.atRiskLeaders} | High-Potential: ${metrics.highPotentialLeaders}
Goal Completion: ${metrics.goalCompletionRate}% | Learning Completion: ${metrics.learningCompletionRate}%

Focus insights on: DM/SI gaps vs. benchmarks, how these impact ME, which leadership levels need most attention, and what interventions will move the needle fastest.

Format as JSON: insights (array of {title, description, priority, targetDashboard, action}), risks (array of {title, description, severity, action, targetDashboard}), opportunities (array of {title, description, potential, action, targetDashboard}).`,
          response_json_schema: {
            type: "object",
            properties: {
              insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string" }, targetDashboard: { type: "string" }, action: { type: "string" } } } },
              risks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, severity: { type: "string" }, action: { type: "string" }, targetDashboard: { type: "string" } } } },
              opportunities: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, potential: { type: "string" }, action: { type: "string" }, targetDashboard: { type: "string" } } } }
            }
          }
        })
      ]);

      setExecutiveBriefing(briefingResult || '');
      setAiInsights(insightsResult?.insights || []);
      setStrategicRisks(insightsResult?.risks?.slice(0, 3) || []);
      setStrategicOpportunities(insightsResult?.opportunities?.slice(0, 3) || []);
      setLastGeneratedFingerprint(metricsFingerprint);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setGeneratingAll(false);
      setGeneratingBriefing(false);
      setGeneratingInsights(false);
    }
  };

  // Auto-generate when data changes
  useEffect(() => {
    if (metricsFingerprint === '0-0-0') return;
    if (metricsFingerprint === lastGeneratedFingerprint) return;
    generateAll();
  }, [metricsFingerprint]);

  // Notify parent of metrics changes without triggering setState-in-render
  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate({
        totalInsights: rawData.assessmentInsights.length || aiInsights.length || 0,
        actionItems: strategicOpportunities.length + strategicRisks.length,
        completionRate: metrics.goalCompletionRate
      });
    }
  }, [rawData.assessmentInsights.length, aiInsights.length, strategicOpportunities.length, strategicRisks.length, metrics.goalCompletionRate]);

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
        ? Math.round(monthAssessments.reduce((sum, a) => sum + (a.overall_pct ?? a.data?.overall_pct ?? 0), 0) / monthAssessments.length)
        : 0;

      const dmScore = monthAssessments.length > 0
        ? Math.round(monthAssessments.reduce((sum, a) => sum + (a.dm_pct ?? a.data?.dm_pct ?? 0), 0) / monthAssessments.length)
        : 0;

      const siScore = monthAssessments.length > 0
        ? Math.round(monthAssessments.reduce((sum, a) => sum + (a.si_pct ?? a.data?.si_pct ?? 0), 0) / monthAssessments.length)
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
        dmScore,
        siScore,
        goalCompletion,
        learningCompletion
      });
    }

    const correlationData = assessments.map(a => {
      const aEmail = a.email ?? a.data?.email;
      const aScore = a.overall_pct ?? a.data?.overall_pct ?? 0;
      const userGoals = goals.filter(g => (g.user_email ?? g.data?.user_email) === aEmail);
      const userCompletedGoals = userGoals.filter(g => (g.status ?? g.data?.status) === 'completed').length;
      const userGoalRate = userGoals.length > 0 ? Math.round((userCompletedGoals / userGoals.length) * 100) : null;
      
      return {
        assessmentScore: aScore,
        goalCompletionRate: userGoalRate !== null ? userGoalRate : Math.round(aScore * 0.85 + Math.random() * 10),
        name: rawData.allUsers.find(u => u.email === aEmail)?.full_name || aEmail?.split('@')[0] || 'Unknown',
        hasRealGoalData: userGoalRate !== null
      };
    });

    return { trendData, correlationData };
  }, [filteredData, rawData.allUsers]);

  const generateExecutiveBriefing = () => {
    setLastGeneratedFingerprint(null); // force regeneration
    generateAll();
  };

  const generateCrossAnalytics = () => {
    setLastGeneratedFingerprint(null); // force regeneration
    generateAll();
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
                  <SelectItem value="<1">Under 1 Year</SelectItem>
                  <SelectItem value="1-2">1 - 2 Years</SelectItem>
                  <SelectItem value="3-5">3 - 5 Years</SelectItem>
                  <SelectItem value="6-10">6 - 10 Years</SelectItem>
                  <SelectItem value="11-15">11 - 15 Years</SelectItem>
                  <SelectItem value="16-20">16 - 20 Years</SelectItem>
                  <SelectItem value="20+">20+ Years</SelectItem>
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


              </div>
              </CardContent>
              </Card>
              </motion.div>

      {/* Strategic Platform Insights — moved above KPIs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          Strategic Platform Insights
        </h2>
        <p className="text-gray-600 mb-6">Platform-wide trends and patterns to inform strategic decisions</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ManagerEffectivenessCard metrics={metrics} assessments={filteredData.assessments} />
          <LeadershipReadinessCard metrics={metrics} assessments={filteredData.assessments} />
          <SkillsGapCard metrics={metrics} />
        </div>
      </motion.div>

      {/* Executive Summary KPIs — DM/SI/ME focused */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer border-t-4 border-t-indigo-500" onClick={() => navigate('/Insights?tab=enterprise')}>
            <CardContent className="p-6">
              <Brain className="w-8 h-8 text-indigo-600 mb-4" />
              <div className="text-3xl font-bold text-gray-900">{metrics.competencyAverages.dm}%</div>
              <div className="text-sm text-gray-600 mt-1">Decision Making Score</div>
              <div className="text-xs text-gray-400 mt-0.5">Industry target: 77%</div>
              <div className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer border-t-4 border-t-purple-500" onClick={() => navigate('/Insights?tab=enterprise')}>
            <CardContent className="p-6">
              <Zap className="w-8 h-8 text-purple-600 mb-4" />
              <div className="text-3xl font-bold text-gray-900">{metrics.competencyAverages.si}%</div>
              <div className="text-sm text-gray-600 mt-1">Situational Intelligence</div>
              <div className="text-xs text-gray-400 mt-0.5">Industry target: 75%</div>
              <div className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer border-t-4 border-t-teal-500" onClick={() => navigate('/Insights?tab=org')}>
            <CardContent className="p-6">
              <Users className="w-8 h-8 text-teal-600 mb-4" />
              <div className="text-3xl font-bold text-gray-900">
                {Math.round(metrics.competencyAverages.dm * 0.35 + metrics.competencyAverages.si * 0.30 + metrics.competencyAverages.comm * 0.20 + metrics.competencyAverages.pm * 0.15)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Manager Effectiveness Index</div>
              <div className="text-xs text-gray-400 mt-0.5">DM + SI + Comm + PM composite</div>
              <div className="text-xs text-teal-600 mt-2 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer border-t-4 border-t-orange-500" onClick={() => navigate('/Insights?tab=org')}>
            <CardContent className="p-6">
              <Target className="w-8 h-8 text-orange-600 mb-4" />
              <div className="text-3xl font-bold text-gray-900">{metrics.avgLeadershipScore}%</div>
              <div className="text-sm text-gray-600 mt-1">Overall Leadership Score</div>
              <div className="text-xs text-gray-400 mt-0.5">{metrics.totalAssessments} assessments</div>
              <div className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Executive AI Briefing (includes Cross-Functional Insights) */}
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
              {(executiveBriefing || aiInsights.length > 0) && (
                <Button variant="outline" size="sm" onClick={generateExecutiveBriefing} disabled={generatingAll}>
                  {generatingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Refresh
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Briefing narrative */}
            {generatingBriefing && !executiveBriefing ? (
              <div className="flex items-center gap-3 py-4 text-purple-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Generating executive briefing…</span>
              </div>
            ) : executiveBriefing ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{executiveBriefing}</p>
              </div>
            ) : null}

            {/* Cross-Functional Intelligence Insights — embedded section */}
            <div className="border-t border-purple-200 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">Cross-Functional Intelligence Insights</h3>
                <span className="text-xs text-gray-500 ml-1">AI-identified correlations across leadership, learning, and performance data</span>
              </div>
              {generatingInsights && aiInsights.length === 0 ? (
                <div className="flex items-center gap-3 py-4 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Analysing cross-functional patterns…</span>
                </div>
              ) : aiInsights.length > 0 ? (
                <Accordion type="single" collapsible className="space-y-2">
                  {aiInsights.map((insight, idx) => (
                    <AccordionItem key={idx} value={`insight-${idx}`} className={`border rounded-lg px-1 ${PRIORITY_COLORS[insight.priority] || 'bg-gray-100'}`}>
                      <AccordionTrigger className="px-3 py-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:ml-2 [&>svg]:self-start [&>svg]:mt-0.5">
                        <div className="flex items-start gap-3 text-left flex-1 min-w-0">
                          <Badge className={`${PRIORITY_COLORS[insight.priority]} shrink-0 mt-0.5`}>{insight.priority}</Badge>
                          <span className="font-semibold text-sm">{insight.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-4">
                        <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                        <Button size="sm" variant="outline" onClick={() => promptAtreus(`I have a cross-functional insight: "${insight.title}". ${insight.description} Please help me act on this.`)}>
                          <Brain className="w-3 h-3 mr-2" />
                          {insight.action}
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : null}
            </div>
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
              {(() => {
                const displayRisks = strategicRisks.length > 0 ? strategicRisks : (() => {
                  const derived = [];
                  if (metrics.atRiskLeaders > 0) derived.push({ title: 'Leaders Below Performance Threshold', description: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? 's are' : ' is'} scoring below 60% — indicating potential capability gaps that may impact team performance.`, severity: 'High', action: 'View Assessment Data', targetDashboard: 'AssessmentAnalyticsDashboard' });
                  if (metrics.competencyAverages.dm < 65) derived.push({ title: 'Decision-Making Gap Detected', description: `Org-wide decision-making average is ${metrics.competencyAverages.dm}%, below the 65% target threshold. This may slow execution and strategic agility.`, severity: 'Medium', action: 'Explore Competencies', targetDashboard: 'EnterpriseAnalytics' });
                  if (metrics.competencyAverages.rm < 65) derived.push({ title: 'Resource Management Deficit', description: `Resource management scores average ${metrics.competencyAverages.rm}% across the organisation — a gap that often correlates with project overruns and budget inefficiency.`, severity: 'Medium', action: 'View Analytics', targetDashboard: 'EnterpriseAnalytics' });
                  if (metrics.totalAssessments === 0) derived.push({ title: 'No Assessment Data Available', description: 'No leadership assessments have been completed yet. Baseline data is needed to identify risks and measure progress.', severity: 'High', action: 'Start Assessments', targetDashboard: 'Assessments' });
                  return derived.slice(0, 3);
                })();
                return displayRisks.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-2">
                    {displayRisks.map((risk, idx) => (
                      <AccordionItem key={idx} value={`risk-${idx}`} className="border border-red-200 rounded-lg bg-red-50 px-1">
                        <AccordionTrigger className="px-3 py-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:ml-2 [&>svg]:self-start [&>svg]:mt-0.5">
                          <div className="flex items-start gap-3 text-left flex-1 min-w-0">
                            <Badge className="bg-red-600 text-white shrink-0 mt-0.5">{risk.severity}</Badge>
                            <span className="font-semibold text-sm text-red-900">{risk.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-4">
                          <p className="text-sm text-red-800 mb-3">{risk.description}</p>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 whitespace-normal h-auto text-left" onClick={() => promptAtreus(`I have a strategic risk: "${risk.title}". ${risk.description} Please help me develop an action plan to address this.`)}>
                            <Brain className="w-3 h-3 mr-2 shrink-0" />
                            {risk.action}
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-8 text-gray-500">No risk signals detected — strong performance across the board.</div>
                );
              })()}
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
              {(() => {
                const displayOpps = strategicOpportunities.length > 0 ? strategicOpportunities : (() => {
                  const derived = [];
                  if (metrics.highPotentialLeaders > 0) derived.push({ title: 'High-Potential Leaders Ready for Advancement', description: `${metrics.highPotentialLeaders} leader${metrics.highPotentialLeaders !== 1 ? 's are' : ' is'} scoring 85%+ and may be ready for expanded responsibilities or succession planning.`, potential: 'High', action: 'View Profiles', targetDashboard: 'AssessmentAnalyticsDashboard' });
                  if (metrics.competencyAverages.comm >= 70) derived.push({ title: 'Communication Strength to Leverage', description: `Communication scores average ${metrics.competencyAverages.comm}% — above the 70% threshold. This is a platform strength that can drive change management and stakeholder alignment.`, potential: 'Medium', action: 'Explore Insights', targetDashboard: 'EnterpriseAnalytics' });
                  if (metrics.competencyAverages.si >= 70) derived.push({ title: 'Strong Situational Intelligence Baseline', description: `Situational Intelligence averages ${metrics.competencyAverages.si}% across leaders — a strong foundation for strategic decision-making and adaptive leadership.`, potential: 'Medium', action: 'View Analytics', targetDashboard: 'EnterpriseAnalytics' });
                  if (metrics.totalAssessments > 0 && metrics.atRiskLeaders === 0) derived.push({ title: 'No At-Risk Leaders Detected', description: 'All assessed leaders are performing above the risk threshold — an excellent foundation for accelerating development programs and stretch assignments.', potential: 'High', action: 'Plan Development', targetDashboard: 'Development' });
                  return derived.slice(0, 3);
                })();
                return displayOpps.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-2">
                    {displayOpps.map((opportunity, idx) => (
                      <AccordionItem key={idx} value={`opp-${idx}`} className="border border-green-200 rounded-lg bg-green-50 px-1">
                        <AccordionTrigger className="px-3 py-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:ml-2 [&>svg]:self-start [&>svg]:mt-0.5">
                          <div className="flex items-start gap-3 text-left flex-1 min-w-0">
                            <Badge className="bg-green-600 text-white shrink-0 mt-0.5">{opportunity.potential}</Badge>
                            <span className="font-semibold text-sm text-green-900">{opportunity.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-4">
                          <p className="text-sm text-green-800 mb-3">{opportunity.description}</p>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 whitespace-normal h-auto text-left" onClick={() => promptAtreus(`I have a strategic opportunity: "${opportunity.title}". ${opportunity.description} Please help me create a plan to capitalise on this.`)}>
                            <Brain className="w-3 h-3 mr-2 shrink-0" />
                            {opportunity.action}
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-8 text-gray-500">No specific opportunities identified yet.</div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Integrated Trend Analysis */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">DM / SI / Manager Effectiveness Trends</CardTitle>
            <p className="text-sm text-gray-600">Track the primary drivers of Manager Effectiveness over time alongside overall leadership performance</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="dmScore" stroke="#0d9488" strokeWidth={3} name="Decision Making %" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="siScore" stroke="#7c3aed" strokeWidth={3} name="Situational Intelligence %" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="assessmentScore" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" name="Overall Leadership %" />
                <Line type="monotone" dataKey="goalCompletion" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" name="Goal Completion %" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
              <strong>Focus:</strong> The solid lines (DM &amp; SI) are the primary indicators of Manager Effectiveness on this platform. Tracking their trajectory reveals whether leadership interventions are improving decision quality over time.
            </div>
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
            {chartData.correlationData.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No data points available for this filter.</div>
            )}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              <strong>Insight:</strong> This chart reveals the correlation between leadership capability and execution effectiveness. 
              Leaders in the upper-right quadrant demonstrate both strong capability and high performance.
              {chartData.correlationData.some(d => !d.hasRealGoalData) && (
                <span className="block mt-1 text-xs text-blue-700">* Goal completion estimated from assessment scores where no goal data exists.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pre-Generated Leader Insights (from AssessmentInsights entity) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <LeaderInsightProfilesCard rawData={rawData} />
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
                    className="h-auto py-4 px-4 justify-start text-left hover:bg-indigo-50 hover:border-indigo-300 whitespace-normal"
                    onClick={() => {
                      toast.info('AI Coach feature coming soon!');
                    }}
                  >
                    <PromptIcon className={`w-5 h-5 mr-3 flex-shrink-0 ${prompt.color}`} />
                    <span className="text-sm break-words">{prompt.text}</span>
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
                onClick={() => navigate('/Insights?tab=enterprise')}
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
                onClick={() => navigate('/AssessmentAnalyticsDashboard')}
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
                onClick={() => navigate('/LearningAnalyticsDashboard')}
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
                onClick={() => navigate('/ExperienceAnalytics')}
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
                onClick={() => navigate('/my-goals')}
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
                onClick={() => navigate('/experience-overview')}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-pink-600" />
                  <div className="text-left">
                    <div className="font-semibold">Experience Overview</div>
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