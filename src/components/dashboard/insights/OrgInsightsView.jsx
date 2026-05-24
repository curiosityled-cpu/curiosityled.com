import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  BookOpen,
  BarChart3,
  Loader2,
  ArrowRight,
  Shield,
  Activity,
  Heart
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
import LifecycleNarrativeHeader from "./LifecycleNarrativeHeader";
import OrgHealthCard from "@/components/intelligence/OrgHealthCard";
import TalentPipelineCard from "@/components/intelligence/TalentPipelineCard";
import WorkforceStabilityCard from "@/components/intelligence/WorkforceStabilityCard";
import EngagementCultureCard from "@/components/intelligence/EngagementCultureCard";
import HubExecutivePulse from "@/components/intelligence/HubExecutivePulse";
import HubStickyBar from "@/components/intelligence/HubStickyBar";
import ConnectionModule from "@/components/intelligence/ConnectionModule";

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
  const [activeMobilityChip, setActiveMobilityChip] = useState(null);
  const [matrixDepartment, setMatrixDepartment] = useState('all');

  // Role-based display preset: 'executive' | 'practitioner'
  const appRole = user?.data?.app_role || user?.app_role || '';
  const isExecutiveRole = ['Super Administrator', 'Admin Level 2', 'Analyst'].some(r => appRole.includes(r));
  const [displayPreset, setDisplayPreset] = useState(isExecutiveRole ? 'executive' : 'practitioner');
  // Allow user override — track which sections the user has manually expanded
  const [userExpandedSections, setUserExpandedSections] = useState({});
  const toggleUserExpand = (section) => setUserExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  const isSectionVisible = (section, defaultForPreset) => {
    if (userExpandedSections[section] !== undefined) return userExpandedSections[section];
    return defaultForPreset;
  };

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

  const [lastRefreshed, setLastRefreshed] = useState(new Date());
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
      setLastRefreshed(new Date());
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

  // Scroll to section helper
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Data confidence calculation
  const dataConfidenceParts = [
    filteredData.assessments.length > 0,
    metrics.totalGoals > 0,
    metrics.totalJourneys > 0,
    rawData.workforceMetrics?.length > 0,
    rawData.workforceMetrics?.[0]?.enps_score != null,
  ].filter(Boolean).length;
  const dataConfidencePct = Math.round((dataConfidenceParts / 5) * 100);

  const hasWorkforceData = rawData.workforceMetrics?.length > 0;
  const hasEngagementData = hasWorkforceData && rawData.workforceMetrics[0]?.enps_score != null;

  // Trend chart sparse data check
  const trendDataPoints = chartData.trendData.filter(d => d.assessmentScore > 0);
  const hasSufficientTrendData = trendDataPoints.length >= 3;

  return (
    <div className="space-y-6">
      {/* ── LAYER 1: Sticky context bar ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <HubStickyBar
          filters={filters}
          onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          dataConfidence={dataConfidencePct}
          lastRefreshed={lastRefreshed}
          onRefresh={loadAllData}
          refreshing={loading}
        />
      </motion.div>

      {/* ── LAYER 2: Executive Pulse — summary first ─────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <HubExecutivePulse
          metrics={metrics}
          assessments={filteredData.assessments}
          workforceMetrics={rawData.workforceMetrics}
          onScrollTo={scrollToSection}
        />
      </motion.div>

      {/* Talent Care Lifecycle Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <TalentCareLifecycleBar
          activeStage={activeLifecycleStage}
          onStageChange={setActiveLifecycleStage}
          activeMobilityChip={activeMobilityChip}
          onMobilityChipChange={setActiveMobilityChip}
        />
      </motion.div>

      {/* Lifecycle Narrative Header — shown when a stage is selected */}
      <AnimatePresence mode="wait">
        {activeLifecycleStage && (
          <motion.div
            key={activeLifecycleStage + (activeMobilityChip || '')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <LifecycleNarrativeHeader
              stageId={activeLifecycleStage}
              mobilityChip={activeMobilityChip}
              metrics={metrics}
              onPromptAtreus={promptAtreus}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LAYER 3: Priority sections — order adapts to lifecycle stage ──────── */}
      {(() => {
        // Confidence thresholds
        const assessmentCount = filteredData.assessments.length;
        const orgHealthLowConf = assessmentCount < 3;
        const talentPipelineLowConf = assessmentCount < 5;
        const matrixHidden = assessmentCount < 5;
        const profilesEmpty = assessmentCount < 2;

        // Stage-based section order
        // attraction/onboarding: Talent Pipeline first, then Org Health
        // development: Org Health first, then Talent Pipeline
        // performance: Org Health first, then Talent Pipeline
        // transition: Talent Pipeline first, then Org Health
        // retention: Workforce/Engagement first (below), then Org Health
        const talentFirst = ['attraction', 'transition'].includes(activeLifecycleStage);

        const OrgHealthSection = (
          <div id="org-health" key="org-health">
            {orgHealthLowConf ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
                <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Organizational Leadership Health</p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3 inline-block">Insufficient data for reliable insight — fewer than 3 assessments completed.</p>
              </div>
            ) : (
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
            )}
          </div>
        );

        const TalentSection = (
          <div id="talent-pipeline" key="talent-pipeline">
            {talentPipelineLowConf ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Talent Pipeline</p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3 inline-block">Insufficient data — fewer than 5 assessments completed. Pipeline accuracy improves with more data.</p>
              </div>
            ) : (
              <TalentPipelineCard
                metrics={metrics}
                assessments={filteredData.assessments}
                assignedLearning={filteredData.assignedLearning}
                journeyEnrollments={filteredData.journeyEnrollments}
                allUsers={rawData.allUsers}
                workforceMetrics={rawData.workforceMetrics}
              />
            )}
          </div>
        );

        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            {talentFirst ? [TalentSection, OrgHealthSection] : [OrgHealthSection, TalentSection]}
          </motion.div>
        );
      })()}

      {/* ── LAYER 4: Workforce & Engagement — connection modules when empty ──── */}
      <div id="workforce" className="space-y-6">
        {hasWorkforceData ? (
          <WorkforceStabilityCard workforceMetrics={rawData.workforceMetrics} />
        ) : (
          <ConnectionModule
            icon={Users}
            iconColor="text-rose-500"
            title="Workforce Stability & Retention"
            description="Talent loss signals and their correlation with leadership effectiveness"
            valueProposition="Connecting your HRIS data unlocks turnover, first-year attrition, and critical role vacancy rates — enabling direct correlation with leadership capability scores to identify which teams are most at risk."
            dataSources={["HRIS / HR System", "ATS / Talent Data", "CSV Upload", "API Integration"]}
            sampleMetrics={[
              { label: "Overall Turnover Rate", hint: "Target: <15%" },
              { label: "Regrettable Turnover", hint: "Target: <5%" },
              { label: "First-Year Turnover", hint: "Target: <10%" },
              { label: "Critical Role Vacancies", hint: "Target: <5%" },
            ]}
            onUploadCSV={() => toast.info("Contact your administrator to upload workforce metrics CSV")}
          />
        )}

        <div id="engagement">
          {hasEngagementData ? (
            <EngagementCultureCard
              workforceMetrics={rawData.workforceMetrics}
              leadershipScore={metrics.avgLeadershipScore}
            />
          ) : (
            <ConnectionModule
              icon={Heart}
              iconColor="text-pink-500"
              title="Engagement & Culture"
              description="Employee sentiment as a leading indicator of leadership health"
              valueProposition={
                metrics.avgLeadershipScore > 0
                  ? `Engagement outcomes cannot yet be evaluated because employee sentiment data is not connected. Current leadership scores average ${metrics.avgLeadershipScore}% — connecting engagement data would reveal whether this is translating to workforce sentiment.`
                  : "Engagement outcomes cannot yet be evaluated because employee sentiment data is not connected. Upload eNPS or engagement survey results to enable this signal."
              }
              dataSources={["eNPS Survey Data", "Engagement Survey Platform", "Culture Amp / Glint", "CSV Upload"]}
              sampleMetrics={[
                { label: "eNPS Score", hint: "Range: -100 to +100" },
                { label: "Engagement Index", hint: "Target: ≥70/100" },
                { label: "Absenteeism Rate", hint: "Target: <3%" },
                { label: "Leadership Correlation", hint: "Derived metric" },
              ]}
              onUploadCSV={() => toast.info("Contact your administrator to upload engagement survey data")}
            />
          )}
        </div>
      </div>

      {/* ── Trend Analysis — sparse data aware ─────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">DM / SI / Manager Effectiveness Trends</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Track primary drivers of Manager Effectiveness over time</p>
              </div>
              <Badge className={`text-[11px] border ${hasSufficientTrendData ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                {hasSufficientTrendData ? "Directional" : "Sparse data"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!hasSufficientTrendData ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-medium text-gray-600">Not enough history to establish a trend</p>
                <p className="text-xs text-gray-400">
                  {trendDataPoints.length} of 6 periods have data. Current snapshot:{" "}
                  {metrics.totalAssessments > 0 ? `Leadership avg ${metrics.avgLeadershipScore}%` : "No assessments yet"}.
                </p>
                <p className="text-xs text-gray-400">Revisit after more data accumulates across multiple periods.</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="dmScore" stroke="#0d9488" strokeWidth={2.5} name="Decision Making %" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="siScore" stroke="#7c3aed" strokeWidth={2.5} name="Situational Intelligence %" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="assessmentScore" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" name="Overall Leadership %" />
                    <Line type="monotone" dataKey="goalCompletion" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" name="Goal Completion %" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-gray-400 mt-3">
                  Solid lines (DM & SI) are primary Manager Effectiveness drivers. Sample size: {trendDataPoints.length} active periods of {chartData.trendData.length}.
                </p>
              </>
            )}
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

        // Confidence threshold: hide matrix if fewer than 5 assessments
        if (filteredData.assessments.length < 5) return null;
        if (allData.length === 0) return null;

        // Stage visibility: show by default in Develop/Perform stages; hidden in executive preset unless user expanded
        const stageShowsMatrix = !activeLifecycleStage || ['development', 'performance'].includes(activeLifecycleStage);
        const presetShowsMatrix = displayPreset !== 'executive';
        if (!stageShowsMatrix && !isSectionVisible('matrix', false)) return null;
        if (!presetShowsMatrix && !isSectionVisible('matrix', false)) return null;

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
          { key: 'topRight',    label: 'Leverage & Stretch',      sub: 'High Capability & High Execution — empower, elevate, and assign strategic stretch.', color: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
          { key: 'topLeft',     label: 'Unblock & Activate',      sub: 'High Execution, Building Capability — remove blockers, invest in targeted development.', color: 'bg-blue-50 border-blue-200',  badge: 'bg-blue-100 text-blue-800',  dot: 'bg-blue-500' },
          { key: 'bottomRight', label: 'Build & Sustain',         sub: 'High Capability, Developing Execution — structured goal support and mentorship.', color: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
          { key: 'bottomLeft',  label: 'Prioritise Development',  sub: 'Building Capability & Execution — focus on foundational skills and goal attainment.', color: 'bg-red-50 border-red-200',    badge: 'bg-red-100 text-red-800',    dot: 'bg-red-500' },
        ];

        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                 <div className="flex flex-wrap items-start justify-between gap-4">
                   <div>
                     <div className="flex items-center gap-2">
                       <CardTitle className="text-base">Capability vs. Execution Matrix</CardTitle>
                       <Badge className={`text-[11px] border ${usingEstimated ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                         {usingEstimated ? "Estimated execution" : "Observed data"}
                       </Badge>
                     </div>
                     <p className="text-xs text-gray-500 mt-0.5">
                       Practitioner intervention tool — Leadership capability vs. execution to prioritise coaching
                     </p>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                     {/* Disabled "Observed only" toggle — coming soon */}
                     <div className="flex items-center gap-1.5 opacity-50 cursor-not-allowed" title="Coming soon: filter matrix to show only leaders with observed goal data">
                       <div className="w-7 h-4 bg-gray-200 rounded-full relative">
                         <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow" />
                       </div>
                       <span className="text-xs text-gray-400">Observed only</span>
                       <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.5 rounded">coming soon</span>
                     </div>
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
                 {/* Compact inline explainer */}
                 <div className="mb-4 flex items-start gap-2 text-xs text-gray-600">
                   <span className="flex-shrink-0 mt-0.5 text-indigo-500">ℹ</span>
                   <span>
                     Leaders are mapped by <strong>Capability</strong> (assessment score) vs <strong>Execution</strong> (goal completion). Midpoint: <strong>{capThreshold}%</strong>.
                     {" "}<button className="text-indigo-600 hover:underline">Learn more</button>
                   </span>
                 </div>
                 {usingEstimated && (
                   <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                     <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                     <span><strong>Limited confidence:</strong> No goal data found. Execution is <em>estimated</em> from assessment scores — not measured. Matrix updates once goals are assigned.</span>
                   </div>
                 )}

                {/* 2×2 grid with axis arrows */}
                <div className="flex gap-2">
                  {/* Left axis label (vertical - Execution) */}
                  <div className="flex items-center justify-center" style={{ width: '20px', flexShrink: 0 }}>
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 whitespace-nowrap" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
                      Execution {capThreshold}%
                      <ArrowRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-3 mb-3">
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
                                  <li key={i} className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 text-gray-700 truncate">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${q.dot}`} />
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

      {/* ── Leader Insight Profiles ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {filteredData.assessments.length < 2 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Leader Insight Profiles</p>
            <p className="text-xs text-gray-500 mt-2">No profiles available yet — run at least 2 assessments to populate this triage shortlist.</p>
          </div>
        ) : (
          <LeaderInsightProfilesCard rawData={rawData} activeLifecycleStage={activeLifecycleStage} onPromptAtreus={promptAtreus} />
        )}
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


    </div>
  );
}