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
  Target,
  Users,
  BookOpen,
  BarChart3,
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle,
  ArrowRight,
  Shield,
  Activity
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
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

import LeaderInsightProfilesCard from "./LeaderInsightProfilesCard";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import TalentCareLifecycleBar from "@/components/intelligence/TalentCareLifecycleBar";
import TalentCareStagePanel from "@/components/intelligence/TalentCareStagePanel";
import OrgHealthCard from "@/components/intelligence/OrgHealthCard";
import TalentPipelineCard from "@/components/intelligence/TalentPipelineCard";
import WorkforceStabilityCard from "@/components/intelligence/WorkforceStabilityCard";

import EngagementCultureCard from "@/components/intelligence/EngagementCultureCard";

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
  const [activeLifecycleStage, setActiveLifecycleStage] = useState(null);
  const [matrixDepartment, setMatrixDepartment] = useState('all');

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
    assessmentInsights: [],
    workforceMetrics: []
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

      const workforceQuery = clientId ? { client_id: clientId } : {};

      const [assessments, goals, assignedLearning, journeyEnrollments, allUsersRaw, assessmentInsights, workforceMetrics] = await Promise.all([
        base44.entities.Assessment.list('-created_date', 500).catch(() => []),
        base44.entities.Goal.list('-created_date', 500).catch(() => []),
        base44.entities.AssignedLearning.list('-created_date', 500).catch(() => []),
        base44.entities.JourneyEnrollment.list('-created_date', 500).catch(() => []),
        (clientId
          ? base44.entities.User.filter({ client_id: clientId })
          : base44.entities.User.list()
        ).catch(() => []),
        base44.entities.AssessmentInsights.filter(insightQuery).catch(() => []),
        base44.entities.WorkforceMetrics.filter(workforceQuery, '-effective_date', 12).catch(() => [])
      ]);
      const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw : [];

      setRawData({
        assessments: assessments || [],
        goals: goals || [],
        assignedLearning: assignedLearning || [],
        journeyEnrollments: journeyEnrollments || [],
        allUsers: allUsers || [],
        assessmentInsights: assessmentInsights || [],
        workforceMetrics: workforceMetrics || []
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

      {/* Talent Care Lifecycle Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <TalentCareLifecycleBar
          activeStage={activeLifecycleStage}
          onStageChange={setActiveLifecycleStage}
        />
      </motion.div>

      {/* Stage Panel — shown when a stage is selected */}
      <AnimatePresence mode="wait">
        {activeLifecycleStage && (
          <motion.div
            key={activeLifecycleStage}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TalentCareStagePanel
              stageId={activeLifecycleStage}
              metrics={metrics}
              onPromptAtreus={promptAtreus}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consolidated Strategic Cards — stacked */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-6">
        <OrgHealthCard
          metrics={metrics}
          assessments={filteredData.assessments}
          goals={filteredData.goals}
          assignedLearning={filteredData.assignedLearning}
          strategicRisks={strategicRisks}
          strategicOpportunities={strategicOpportunities}
          onPromptAtreus={promptAtreus}
          executiveBriefing={executiveBriefing}
          generatingBriefing={generatingBriefing}
          generatingAll={generatingAll}
          onRefreshBriefing={generateExecutiveBriefing}
        />
        <TalentPipelineCard
          metrics={metrics}
          assessments={filteredData.assessments}
          assignedLearning={filteredData.assignedLearning}
          journeyEnrollments={filteredData.journeyEnrollments}
          allUsers={rawData.allUsers}
          workforceMetrics={rawData.workforceMetrics}
        />
      </motion.div>

      {/* Executive KPI Sections — Workforce Stability, Succession & Engagement */}
      <div className="space-y-6">
        <WorkforceStabilityCard workforceMetrics={rawData.workforceMetrics} />

        <EngagementCultureCard
          workforceMetrics={rawData.workforceMetrics}
          leadershipScore={metrics.avgLeadershipScore}
        />
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

      {/* Capability vs. Execution Matrix */}
      {(() => {
        // Derive unique departments from users for the filter dropdown
        const departments = [...new Set(
          rawData.allUsers.map(u => u.department).filter(Boolean)
        )].sort();

        // Filter correlationData by selected matrixDepartment
        let matrixFilteredCorrelation = chartData.correlationData;
        if (matrixDepartment !== 'all') {
          const deptEmails = new Set(
            rawData.allUsers.filter(u => u.department === matrixDepartment).map(u => u.email)
          );
          matrixFilteredCorrelation = matrixFilteredCorrelation.filter(d => {
            const email = rawData.allUsers.find(u => u.full_name === d.name || u.full_name?.split(' ')[0] === d.name)?.email;
            return deptEmails.has(email);
          });
          // Fallback: match by name substring against email prefix
          if (matrixFilteredCorrelation.length === 0) {
            const deptNameSet = new Set(
              rawData.allUsers.filter(u => u.department === matrixDepartment).map(u => u.full_name || u.email?.split('@')[0])
            );
            matrixFilteredCorrelation = chartData.correlationData.filter(d => deptNameSet.has(d.name));
          }
        }

        const realData = matrixFilteredCorrelation.filter(d => d.hasRealGoalData);
        const allData = matrixFilteredCorrelation;
        const dataToUse = realData.length > 0 ? realData : allData;
        const usingEstimated = realData.length === 0 && allData.length > 0;

        if (allData.length === 0) return null;

        // Quadrant thresholds (midpoints)
        const capThreshold = 70;
        const execThreshold = 70;

        const quadrants = {
          topRight:    dataToUse.filter(d => d.assessmentScore >= capThreshold && d.goalCompletionRate >= execThreshold),
          topLeft:     dataToUse.filter(d => d.assessmentScore <  capThreshold && d.goalCompletionRate >= execThreshold),
          bottomRight: dataToUse.filter(d => d.assessmentScore >= capThreshold && d.goalCompletionRate <  execThreshold),
          bottomLeft:  dataToUse.filter(d => d.assessmentScore <  capThreshold && d.goalCompletionRate <  execThreshold),
        };

        const quadrantConfig = [
          { key: 'topRight',    label: 'Pace Setters',    sub: 'High Capability & High Execution: Empower and elevate.', color: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
          { key: 'topLeft',     label: 'Results Drivers',  sub: 'High Execution, Emerging Capability: Develop and assign strategic challenges.', color: 'bg-blue-50 border-blue-200',  badge: 'bg-blue-100 text-blue-800',  dot: 'bg-blue-500' },
          { key: 'bottomRight', label: 'High Potentials', sub: 'High Capability, Developing Execution: Provide structured goal support and mentorship.', color: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
          { key: 'bottomLeft',  label: 'Foundational Support',      sub: 'Developing Capability & Execution: Focus on core skills and goal attainment.', color: 'bg-red-50 border-red-200',    badge: 'bg-red-100 text-red-800',    dot: 'bg-red-500' },
        ];

        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Capability vs. Execution Matrix</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Where does each leader sit — strong capability, strong execution, or both? Use this to prioritise coaching and development interventions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500 whitespace-nowrap">Filter by dept/team:</span>
                    <Select value={matrixDepartment} onValueChange={setMatrixDepartment}>
                      <SelectTrigger className="w-44 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* How to read this */}
                <div className="mb-5 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800 space-y-2">
                  <strong>How to Interpret:</strong>
                  <p>Leaders are mapped by <strong>Capability</strong> (Leadership Assessment Score, horizontal) and <strong>Execution</strong> (Goal Completion Rate, vertical). The midpoint for both is <strong>{capThreshold}%</strong>.</p>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-xs">
                    <li><strong>Foundational Support (Bottom-Left):</strong> Prioritize core coaching and essential goal attainment.</li>
                    <li><strong>Results Drivers (Top-Left):</strong> Focus on capability building and strategic development.</li>
                    <li><strong>High Potentials (Bottom-Right):</strong> Provide execution mentorship and structured goal support.</li>
                    <li><strong>Pace Setters (Top-Right):</strong> Elevate with strategic opportunities and leadership expansion.</li>
                  </ul>
                </div>
                {usingEstimated && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <strong>Note:</strong> No goal data found for these leaders yet. Execution scores are estimated from assessment scores. Matrix will update automatically once leaders have goals assigned.
                  </div>
                )}

                {/* 2×2 grid with axis arrows */}
                <div className="flex gap-0">
                  {/* Left axis label (vertical - Execution) — same visual weight as bottom label */}
                  <div className="flex items-center justify-center" style={{ width: '1.5rem' }}>
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 whitespace-nowrap" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', width: '110px', justifyContent: 'center' }}>
                      Execution {capThreshold}%
                      <ArrowRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {quadrantConfig.map(q => {
                        const leaders = quadrants[q.key];
                        return (
                          <div key={q.key} className={`rounded-xl border p-4 ${q.color}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm text-gray-800">{q.label}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.badge}`}>{leaders.length} leader{leaders.length !== 1 ? 's' : ''}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">{q.sub}</p>
                            {leaders.length > 0 ? (
                              <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {leaders.map((l, i) => (
                                  <li key={i} className="flex items-center justify-between text-xs group relative">
                                   <span className="flex items-center gap-1.5 text-gray-700 truncate">
                                     <span
                                       className={`w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer ${q.dot} relative`}
                                       title={`${l.name} — Capability: ${l.assessmentScore}% | Execution: ${l.goalCompletionRate}%`}
                                     >
                                       <span className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 hidden group-hover:flex flex-col items-start bg-gray-900 text-white text-xs rounded-lg shadow-lg px-3 py-2 whitespace-nowrap pointer-events-none min-w-max">
                                         <span className="font-semibold mb-0.5">{l.name}</span>
                                         <span className="text-gray-300">Capability: <strong className="text-white">{l.assessmentScore}%</strong></span>
                                         <span className="text-gray-300">Execution: <strong className="text-white">{l.goalCompletionRate}%</strong></span>
                                         <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                       </span>
                                     </span>
                                     {l.name}
                                   </span>
                                   <span className="text-gray-400 shrink-0 ml-2 text-xs">Cap: {l.assessmentScore}% / Exec: {l.goalCompletionRate}%</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No leaders in this quadrant</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom axis arrow (horizontal - Capability) */}
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-700">
                      <span>Capability {capThreshold}%</span>
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* Pre-Generated Leader Insights (from AssessmentInsights entity) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <LeaderInsightProfilesCard rawData={rawData} />
      </motion.div>

      {/* Quick Access Dashboard Links — hidden, can re-enable */}
      {false && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.68 }}>
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
      </motion.div>}

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