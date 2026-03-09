import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Download, RefreshCw, X, SlidersHorizontal, ChevronDown, Filter, CalendarIcon, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";

// Import new components for date picker
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";

// Import new dialog components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Import analytics components
import TopMetricsCards from "../analytics/TopMetricsCards";
import CompetencyImpactSection from "../analytics/CompetencyImpactSection";
import StrategicRiskPanel from "../analytics/StrategicRiskPanel";
import DivisionPerformanceTable from "../analytics/DivisionPerformanceTable";
import LeadershipTrends from "../analytics/LeadershipTrends";
import SuccessionPipelineSection from "../analytics/SuccessionPipelineSection";
import DrillDownPanel from "../analytics/DrillDownPanel";
import AtreusCoach from "../ai/AtreusCoach";
import PageHeader from "@/components/common/PageHeader";
import CompetencyConfigBanner from "@/components/common/CompetencyConfigBanner";
import { useCompetencies } from "@/components/contexts/CompetencyContext";
import OrganizationalSkillMapWidget from "./OrganizationalSkillMapWidget";
import CertificationTrendsWidget from "./CertificationTrendsWidget";

import { usePageContext } from "../../Layout";
import { useViewportTracking } from "@/components/hooks/useViewportTracking";

export default function EnterpriseAnalytics({ isOrgScoped = false }) {
  const { user, appRole, loading: authLoading } = useAuth();
  const { updatePageContext } = usePageContext();
  const { selectedCompetencies, competenciesConfigured } = useCompetencies();

  // State management
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [rawLeaders, setRawLeaders] = useState([]);

  // Filter states - CONSOLIDATED INTO A SINGLE OBJECT
  const [filters, setFilters] = useState({
    timeframe: '6months',
    division: 'all',
    competency: 'all',
    riskLevel: 'all',
    managerLevel: 'all'
  });
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [appliedCustomDateRange, setAppliedCustomDateRange] = useState({ from: null, to: null }); // NEW
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);

  const [drillDownState, setDrillDownState] = useState({
    isOpen: false,
    data: null,
    title: '',
    type: null
  });

  // Enhanced: Atreus state - now supports strategic mode
  const [atreusState, setAtreusState] = useState({
    isOpen: false,
    context: null,
    strategicMode: false,
    riskData: null
  });

  // Enhanced: Define section IDs for viewport tracking
  const sectionIds = [
    'section-top-metrics',
    'section-competency-impact',
    'section-strategic-risks',
    'section-division-performance',
    'section-leadership-trends',
    'section-succession-pipeline',
    'section-drill-down'
  ];

  // Enhanced: Viewport tracking with context updates
  const { visibleSections, focusedSection } = useViewportTracking(
    sectionIds,
    (viewportData) => {
      updatePageContext({
        viewport_focus: {
          focused_section: viewportData.focused,
          visible_sections: viewportData.visible,
          section_labels: {
            'section-top-metrics': 'Executive Summary',
            'section-competency-impact': 'Competency Impact Analysis',
            'section-strategic-risks': 'Strategic Risk Assessment',
            'section-division-performance': 'Division Performance',
            'section-leadership-trends': 'Leadership Capability Trends',
            'section-succession-pipeline': 'Succession Pipeline',
            'section-drill-down': 'Detailed Analysis'
          }
        }
      });
    }
  );

  // Initial data load on component mount and user authentication
  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user]);

  // Load data when timeframe or applied custom date range changes
  useEffect(() => {
    if (!authLoading && user) {
      // Only reload rawLeaders when timeframe or appliedCustomDateRange changes,
      // as other filters are handled by applyFilters on rawLeaders.
      loadData();
    }
  }, [filters.timeframe, appliedCustomDateRange, authLoading, user]); // Refetch raw data based on timeframe or applied custom date

  // NEW useEffect for general page context update based on filters
  useEffect(() => {
    if (!loading && user && analyticsData) {
      updatePageContext(buildAICoachContext());
    }
  }, [filters, customDateRange, appliedCustomDateRange, loading, analyticsData, focusedSection, visibleSections, drillDownState, user, appRole, rawLeaders]); // Consolidated filter dependencies

  // Apply filters when raw leaders or filter selections change
  useEffect(() => {
    if (rawLeaders.length > 0) {
      applyFilters();
    }
  }, [rawLeaders, filters]); // Consolidated filter dependencies

  const loadData = async () => {
    setLoading(true);
    try {
      let params = {};
      if (filters.timeframe === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to) {
        params = {
          startDate: appliedCustomDateRange.from.toISOString(),
          endDate: appliedCustomDateRange.to.toISOString()
        };
      } else {
        params = { timeframe: filters.timeframe };
      }

      const { data } = await base44.functions.invoke('getOrganizationalAnalytics', params);

      if (data.success) {
        setRawLeaders(data.data.leaders || []);
        // Initial analytics data should include the unfiltered leaders to be processed by applyFilters
        setAnalyticsData(data.data);
      } else {
        toast.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const competencyFieldMap = {
    'si_overall': 'si_pct',
    'decision_making': 'dm_pct',
    'communication': 'comm_pct',
    'resource_management': 'rm_pct',
    'stakeholder_management': 'sm_pct',
    'performance_management': 'pm_pct'
  };

  const applyFilters = () => {
    if (!rawLeaders || rawLeaders.length === 0) {
      recalculateMetrics([]);
      return;
    }

    let filteredLeaders = [...rawLeaders];

    // Division filter
    if (filters.division !== 'all') {
      filteredLeaders = filteredLeaders.filter(l => l.department === filters.division);
    }

    // Competency filter (e.g., show leaders with score below 60% in selected competency)
    if (filters.competency !== 'all') {
      const field = competencyFieldMap[filters.competency];
      if (field) {
        filteredLeaders = filteredLeaders.filter(l => (l.assessment && (l.assessment[field] || 0) < 60));
      }
    }

    // Risk Level filter
    if (filters.riskLevel !== 'all') {
      filteredLeaders = filteredLeaders.filter(l => l.readiness === filters.riskLevel);
    }

    // Manager Level filter
    if (filters.managerLevel !== 'all') {
      filteredLeaders = filteredLeaders.filter(l => l.manager_level === filters.managerLevel);
    }

    recalculateMetrics(filteredLeaders);
  };

  const recalculateMetrics = (leaders) => {
    const totalLeaders = leaders.length;
    const readyNow = leaders.filter(l => l.readiness === 'ready_now').length;
    const highPotential = leaders.filter(l => l.readiness === 'high_potential').length;
    const atRisk = leaders.filter(l => l.readiness === 'at_risk').length;

    const assessments = leaders.map(l => l.assessment).filter(Boolean);
    const avgSIScore = assessments.length > 0
      ? Math.round(assessments.reduce((sum, a) => sum + (a.si_pct || 0), 0) / assessments.length)
      : 0;

    const benchStrength = totalLeaders > 0
      ? Math.round(((readyNow + highPotential) / totalLeaders) * 100)
      : 0;

    const pipelineStrength = totalLeaders > 0
      ? Math.round((readyNow / totalLeaders) * 100)
      : 0;

    // Recalculate goal metrics
    const totalGoals = leaders.reduce((sum, l) => sum + (l.goals_count || 0), 0);
    const avgGoalsPerLeader = totalLeaders > 0 ? (totalGoals / totalLeaders).toFixed(1) : 0; // Keep one decimal for average

    const leadersWithGoals = leaders.filter(l => (l.goals_count || 0) > 0);
    const avgGoalCompletionRate = leadersWithGoals.length > 0
      ? Math.round(leadersWithGoals.reduce((sum, l) => sum + (l.goals_completion_rate || 0), 0) / leadersWithGoals.length)
      : 0;

    const leadersNeedingGoalAlignment = leaders.filter(l => l.needs_goal_alignment).length;

    // Generate mock trend data for the selected time range
    const generateTrendData = () => {
      const months = filters.timeframe === '3months' ? 3 :
                     filters.timeframe === '6months' ? 6 :
                     filters.timeframe === '12months' ? 12 :
                     filters.timeframe === '24months' ? 24 : 6;

      const data = [];
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (months - i - 1));

        data.push({
          month: date.toLocaleString('default', { month: 'short' }),
          overall: Math.round(56 + Math.random() * 4),
          decision_making: Math.round(58 + Math.random() * 4),
          communication: Math.round(52 + Math.random() * 4),
          resource_management: Math.round(64 + Math.random() * 4),
          stakeholder_management: Math.round(61 + Math.random() * 4),
          performance_management: Math.round(55 + Math.random() * 4)
        });
      }

      return data;
    };


    // Update analytics data with filtered results
    setAnalyticsData(prev => ({
      ...prev,
      leaders, // Update the leaders list to the filtered list
      metrics: {
        ...prev?.metrics, // Keep previous metrics if they exist
        total_leaders: totalLeaders,
        avg_si_score: avgSIScore,
        ready_now: readyNow,
        high_potential: highPotential,
        at_risk: atRisk,
        bench_strength: benchStrength,
        pipeline_strength: pipelineStrength,
        total_goals: totalGoals,
        avg_goals_per_leader: avgGoalsPerLeader,
        avg_goal_completion_rate: avgGoalCompletionRate,
        leaders_needing_goal_alignment: leadersNeedingGoalAlignment
      },
      trend_data: generateTrendData() // Add generated trend data
    }));
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setShowCustomDateDialog(true);
    } else {
      setFilters(prev => ({ ...prev, timeframe: value }));
      setCustomDateRange({ from: null, to: null }); // Clear picker state
      setAppliedCustomDateRange({ from: null, to: null }); // Clear applied state for non-custom
    }
  };

  const handleApplyCustomRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setAppliedCustomDateRange(customDateRange);
      setFilters(prev => ({ ...prev, timeframe: 'custom' }));
      setShowCustomDateDialog(false);
    } else {
      toast.error('Please select both a start and end date');
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomDateDialog(false);
    // If no custom range was previously applied, revert to default '6months'
    // Otherwise, reset the picker to the last applied custom range.
    if (!appliedCustomDateRange.from || !appliedCustomDateRange.to) {
      setFilters(prev => ({ ...prev, timeframe: '6months' })); // Revert to default if nothing was applied
    }
    setCustomDateRange(appliedCustomDateRange); // Reset picker to previously applied range, or nulls if none
  };

  const setQuickRange = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    setCustomDateRange({ from, to });
  };

  const clearAllFilters = () => {
    setFilters({
      timeframe: '6months',
      division: 'all',
      competency: 'all',
      riskLevel: 'all',
      managerLevel: 'all'
    });
    setCustomDateRange({ from: null, to: null });
    setAppliedCustomDateRange({ from: null, to: null });
    setShowCustomDateDialog(false);
  };

  // Helper to get date range for filters, if needed by other components
  const getDateRangeForFilter = () => {
    if (filters.timeframe === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to) {
      return { from: appliedCustomDateRange.from, to: appliedCustomDateRange.to };
    }

    const now = new Date();
    let monthsAgo = 6;

    switch(filters.timeframe) {
      case '3months': monthsAgo = 3; break;
      case '6months': monthsAgo = 6; break;
      case '12months': monthsAgo = 12; break;
      case '24months': monthsAgo = 24; break;
      case 'all': return { from: null, to: now }; // For 'all time', return null for from date
      default: monthsAgo = 6;
    }

    const fromDate = new Date();
    fromDate.setMonth(now.getMonth() - monthsAgo);

    return { from: fromDate, to: now };
  };

  // Enhanced: Build comprehensive AI coach context with granular page awareness
  // Made contextType optional with a default value to handle calls without it as per outline
  const buildAICoachContext = (contextType = 'general_analytics_context', additionalData = {}) => {
    if (!analyticsData) return null;

    const baseContext = {
      user_role: appRole,
      user_name: user?.full_name,
      organization: user?.client_name || (user?.client_id ? 'Client Organization' : 'Platform'),
      timestamp: new Date().toISOString(),
      pageType: 'enterprise_analytics'
    };

    // Enhanced: Detailed filter state
    const currentFilters = {
      timeRange: filters.timeframe,
      customDateRange: filters.timeframe === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to ?
        `${format(appliedCustomDateRange.from, 'yyyy-MM-dd')} to ${format(appliedCustomDateRange.to, 'yyyy-MM-dd')}` : null,
      division: filters.division,
      competency: filters.competency,
      riskLevel: filters.riskLevel,
      managerLevel: filters.managerLevel,
    };

    // Enhanced: Comprehensive metrics with insights
    const metricsSnapshot = {
      total_leaders: analyticsData.metrics.total_leaders,
      total_leaders_unfiltered: rawLeaders.length,
      avg_si_score: analyticsData.metrics.avg_si_score,
      bench_strength: analyticsData.metrics.bench_strength,
      ready_now: analyticsData.metrics.ready_now,
      ready_now_percentage: analyticsData.metrics.total_leaders > 0
        ? Math.round((analyticsData.metrics.ready_now / analyticsData.metrics.total_leaders) * 100)
        : 0,
      high_potential: analyticsData.metrics.high_potential,
      high_potential_percentage: analyticsData.metrics.total_leaders > 0
        ? Math.round((analyticsData.metrics.high_potential / analyticsData.metrics.total_leaders) * 100)
        : 0,
      at_risk: analyticsData.metrics.at_risk,
      at_risk_percentage: analyticsData.metrics.total_leaders > 0
        ? Math.round((analyticsData.metrics.at_risk / analyticsData.metrics.total_leaders) * 100)
        : 0,
      pipeline_strength: analyticsData.metrics.pipeline_strength,
      total_goals: analyticsData.metrics.total_goals,
      avg_goals_per_leader: analyticsData.metrics.avg_goals_per_leader,
      avg_goal_completion_rate: analyticsData.metrics.avg_goal_completion_rate,
      leaders_needing_goal_alignment: analyticsData.metrics.leaders_needing_goal_alignment,
      competency_averages: analyticsData.competency_averages,

      // New: Metric insights
      insights: {
        bench_strength_status: analyticsData.metrics.bench_strength >= 75 ? 'healthy' :
                                analyticsData.metrics.bench_strength >= 50 ? 'moderate' : 'weak',
        pipeline_strength_status: analyticsData.metrics.pipeline_strength >= 20 ? 'healthy' :
                                   analyticsData.metrics.pipeline_strength >= 10 ? 'moderate' : 'critical',
        at_risk_status: analyticsData.metrics.total_leaders > 0 && analyticsData.metrics.at_risk / analyticsData.metrics.total_leaders > 0.2 ? 'high' :
                       analyticsData.metrics.total_leaders > 0 && analyticsData.metrics.at_risk / analyticsData.metrics.total_leaders > 0.1 ? 'moderate' : 'low',
        goal_alignment_gap: analyticsData.metrics.leaders_needing_goal_alignment > 0
      }
    };

    // New: Division insights
    const divisionInsights = analyticsData.divisions ? {
      total_divisions: analyticsData.divisions.length,
      top_performing_division: analyticsData.divisions.length > 0
        ? analyticsData.divisions.reduce((max, div) => (div.avgScore || 0) > (max.avgScore || 0) ? div : max, analyticsData.divisions[0])
        : null,
      weakest_division: analyticsData.divisions.length > 0
        ? analyticsData.divisions.reduce((min, div) => (div.avgScore || 0) < (min.avgScore || 0) ? div : min, analyticsData.divisions[0])
        : null,
      divisions_with_high_risk: analyticsData.divisions.filter(d => d.leaders && d.leaders.length > 0 && d.atRisk > d.leaders.length * 0.2).length
    } : {};

    // New: Risk summary
    const riskSummary = analyticsData.risk_areas ? {
      total_risks: analyticsData.risk_areas.length,
      critical_risks: analyticsData.risk_areas.filter(r => r.severity === 'critical' || r.severity === 'high').length,
      total_affected_leaders: analyticsData.risk_areas.reduce((sum, r) => sum + (r.affected_count || 0), 0),
      top_risk: analyticsData.risk_areas[0] || null
    } : {};

    // New: Time range context
    const timeContext = {
      selected_range: filters.timeframe,
      range_description: {
        '3months': 'past 3 months',
        '6months': 'past 6 months',
        '12months': 'past year',
        '24months': 'past 2 years',
        'all': 'all available time',
        'custom': `custom range from ${appliedCustomDateRange.from ? format(appliedCustomDateRange.from, 'yyyy-MM-dd') : ''} to ${appliedCustomDateRange.to ? format(appliedCustomDateRange.to, 'yyyy-MM-dd') : ''}`
      }[filters.timeframe] || 'past 6 months',
      has_trend_data: analyticsData.trend_data && analyticsData.trend_data.length > 0
    };

    // New: Current viewing context, updated to use focusedSection from useViewportTracking
    const viewingContext = {
      section_focus: focusedSection,
      visible_sections: visibleSections,
      drill_down_open: drillDownState.isOpen,
      drill_down_type: drillDownState.type,
      drill_down_title: drillDownState.title,
      current_view_summary: `Currently viewing ${analyticsData.metrics.total_leaders} filtered leaders out of ${rawLeaders.length} total.`,
    };

    // New: Available actions based on current state (simplified for new filter model)
    const availableActions = [];
    if (filters.division !== 'all' || filters.competency !== 'all' || filters.riskLevel !== 'all' || filters.managerLevel !== 'all' || filters.timeframe === 'custom' || filters.timeframe !== '6months') {
        availableActions.push({ action: 'clear_filters', description: 'Clear all applied filters to see the full picture' });
    } else {
        availableActions.push({ action: 'apply_filters', description: 'Apply filters to focus on specific leader segments' });
    }

    if (analyticsData.risk_areas && analyticsData.risk_areas.length > 0) {
        availableActions.push({ action: 'address_top_risk', description: `Create action plan for top risk: ${analyticsData.risk_areas[0]?.title}` });
    }

    if (analyticsData.metrics.at_risk > 0) {
        availableActions.push({ action: 'view_at_risk_leaders', description: `View and create interventions for ${analyticsData.metrics.at_risk} at-risk leaders` });
    }

    if (analyticsData.metrics.leaders_needing_goal_alignment > 0) {
        availableActions.push({ action: 'address_goal_gaps', description: `Align goals for ${analyticsData.metrics.leaders_needing_goal_alignment} leaders with development needs` });
    }

    availableActions.push({ action: 'export_report', description: 'Export comprehensive analytics report as PDF' });
    availableActions.push({ action: 'change_timeframe', description: `Currently viewing ${filters.timeframe} data - adjust timeframe for different insights` });


    return {
      ...baseContext,
      context_type: contextType,
      current_filters: currentFilters,
      metrics_snapshot: metricsSnapshot,
      division_insights: divisionInsights,
      risk_summary: riskSummary,
      time_context: timeContext,
      viewing_context: viewingContext,
      available_actions: availableActions,
      ...additionalData
    };
  };

  // Drill-down handlers with enhanced AI context
  const handleMetricClick = (metricId) => {
    if (!analyticsData) return;

    let filteredLeaders = [];
    let title = '';

    switch (metricId) {
      case 'total_leaders':
        filteredLeaders = analyticsData.leaders;
        title = 'All Leaders';
        break;
      case 'ready_now':
        filteredLeaders = analyticsData.leaders.filter(l => l.readiness === 'ready_now');
        title = 'Ready Now Leaders';
        break;
      case 'high_potential':
        filteredLeaders = analyticsData.leaders.filter(l => l.readiness === 'high_potential');
        title = 'High Potential Leaders';
        break;
      case 'at_risk':
        filteredLeaders = analyticsData.leaders.filter(l => l.readiness === 'at_risk');
        title = 'At Risk Leaders';
        break;
      default:
        return;
    }

    setDrillDownState({
      isOpen: true,
      data: filteredLeaders,
      title,
      type: metricId
    });
  };

  const handleCompetencyClick = (competencyKey) => {
    if (!analyticsData) return;

    const competencyMap = {
      'decision_making': 'dm_pct',
      'communication': 'comm_pct',
      'resource_management': 'rm_pct',
      'stakeholder_management': 'sm_pct',
      'performance_management': 'pm_pct',
      'si_overall': 'si_pct'
    };

    const field = competencyMap[competencyKey];
    if (!field) return;

    const sortedLeaders = [...analyticsData.leaders]
      .filter(l => l.assessment && l.assessment[field])
      .sort((a, b) => (b.assessment[field] || 0) - (a.assessment[field] || 0));

    setDrillDownState({
      isOpen: true,
      data: sortedLeaders,
      title: `Leaders by ${competencyKey.replace(/_/g, ' ').toUpperCase()}`,
      type: 'competency'
    });
  };

  const handleDivisionClick = (division) => {
    setDrillDownState({
      isOpen: true,
      data: division.leaders,
      title: `${division.name} Division Leaders`,
      type: 'division'
    });
  };

  const handleCellClick = (division, readinessType) => {
    const filteredLeaders = division.leaders.filter(l => l.readiness === readinessType);

    setDrillDownState({
      isOpen: true,
      data: filteredLeaders,
      title: `${division.name} - ${readinessType.replace(/_/g, ' ').toUpperCase()}`,
      type: 'division_cell'
    });
  };

  const handleRiskClick = (risk) => {
    const affectedLeaders = analyticsData.leaders.filter(l => {
      if (risk.title.includes('SI Capability')) {
        return l.si_score < 70; // Assuming si_score is available or a derived metric
      }
      if (risk.title.includes('Performance Risk')) {
        return l.readiness === 'at_risk';
      }
      if (risk.title.includes('Pipeline Gap')) {
        return l.readiness !== 'ready_now';
      }
      if (risk.title.includes('Goal Alignment')) {
        return l.needs_goal_alignment;
      }
      return false;
    });

    setDrillDownState({
      isOpen: true,
      data: affectedLeaders,
      title: risk.title,
      type: 'risk'
    });
  };

  // Enhanced: Strategic Assistant handler - launches Atreus in strategic mode
  const handleAIAssistantClick = (risk) => {
    if (!analyticsData) return; // Ensure analyticsData is available before building context
    const context = buildAICoachContext('strategic_risk', {
      risk_details: {
        title: risk.title,
        description: risk.description,
        severity: risk.severity,
        affected_count: risk.affected_count
      }
    });

    if (context) {
      setAtreusState({
        isOpen: true,
        context: context,
        strategicMode: true, // Activate strategic mode
        riskData: risk // Pass the risk data for the coach to use
      });
    }
  };

  const handlePipelineClick = (segment) => {
    if (!analyticsData) return;

    let filteredLeaders = [];
    let title = '';

    if (typeof segment === 'string') {
      const readinessMap = {
        'Ready Now': 'ready_now',
        'High Potential': 'high_potential',
        'At Risk': 'at_risk',
        'Developing': 'developing'
      };

      const readiness = readinessMap[segment];
      if (readiness) {
        filteredLeaders = analyticsData.leaders.filter(l => l.readiness === readiness);
        title = `${segment} Leaders`;
      } else {
        filteredLeaders = analyticsData.leaders.filter(l => l.app_role?.includes(segment));
        title = `${segment} Leaders`;
      }
    }

    setDrillDownState({
      isOpen: true,
      data: filteredLeaders,
      title,
      type: 'pipeline'
    });
  };

  const closeDrillDown = () => {
    setDrillDownState({
      isOpen: false,
      data: null,
      title: '',
      type: null
    });
  };

  const handleExportPDF = async () => {
    if (!analyticsData) {
      toast.error('No analytics data available to export');
      return;
    }

    setExportingPDF(true);
    try {
      toast.info('Generating PDF report...');

      const response = await base44.functions.invoke('exportPlatformAnalyticsPDF', {
        stats: analyticsData.metrics,
        divisions: analyticsData.divisions,
        timeRange: filters.timeframe // Use filters.timeframe
      });

      if (response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enterprise-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('PDF exported successfully!');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);

      if (error.response?.status === 401) {
        toast.error('Authentication error. Please refresh the page and try again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to export analytics.');
      } else {
        toast.error('Failed to export PDF. Please try again.');
      }
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    if (!analyticsData) {
      toast.error('No analytics data available to export');
      return;
    }

    try {
      // Prepare CSV data
      const headers = ['Name', 'Email', 'Department', 'Role', 'SI Score', 'Readiness', 'Goals Count', 'Goal Completion Rate'];
      const rows = analyticsData.leaders.map(leader => [
        leader.full_name || '',
        leader.email || '',
        leader.department || '',
        leader.app_role || '',
        leader.assessment?.si_pct || '',
        leader.readiness || '',
        leader.goals_count || 0,
        leader.goals_completion_rate || 0
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leadership-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV. Please try again.');
    }
  };

  // Enhanced: Open Atreus with comprehensive context (new function)
  const handleOpenAtreus = () => {
    if (!analyticsData) {
      toast.error('Analytics data not loaded yet. Please wait or refresh.');
      return;
    }
    const context = buildAICoachContext('general_coaching');
    if (context) {
      setAtreusState({
        isOpen: true,
        context: context,
        strategicMode: false,
        riskData: null
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
          <p className="text-gray-600">Loading enterprise analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData || !analyticsData.metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No analytics data available</p>
          <Button onClick={loadData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Get unique values for filter dropdowns
  const divisions = [...new Set(rawLeaders.map(l => l.department).filter(Boolean))].sort();
  const competencyOptions = Object.keys(competencyFieldMap).map(key => ({
    value: key,
    label: key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }));
  const riskLevelOptions = [
    { value: 'at_risk', label: 'At Risk' },
    { value: 'high_potential', label: 'High Potential' },
    { value: 'ready_now', label: 'Ready Now' },
    { value: 'developing', label: 'Developing' }
  ];

  const totalLeaders = analyticsData.metrics.total_leaders || 0;
  const client = { name: user?.client_name || (user?.client_id ? 'Client Organization' : 'Platform') };

  // Check if any filter is active
  const anyFilterActive =
    filters.division !== 'all' ||
    filters.competency !== 'all' ||
    filters.riskLevel !== 'all' ||
    filters.managerLevel !== 'all' ||
    filters.timeframe === 'custom' ||
    filters.timeframe !== '6months';

  // Render content based on whether this is embedded in Org Dashboard or standalone
  const content = (
    <>
      {/* Only show PageHeader when NOT embedded (standalone mode) */}
      {!isOrgScoped && (
        <PageHeader
          title="Strategic Leadership Analytics"
          subtitle="Enterprise-wide leadership insights and succession planning"
          badges={[
            { text: `${totalLeaders} Leaders`, style: { backgroundColor: 'rgba(2, 2, 255, 0.1)', color: '#0202ff' } },
            { text: client?.name || 'Organization', style: { backgroundColor: '#faf5ff', color: '#A25DDC' } }
          ]}
          onRefresh={loadData}
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          loadingRefresh={loading}
          loadingExportPDF={exportingPDF}
        />
      )}

      {/* Competency Configuration Banner for Admins */}
      <CompetencyConfigBanner />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>

              {/* Time Range Select */}
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

              {/* Division Filter */}
              <Select value={filters.division} onValueChange={(val) => setFilters(prev => ({ ...prev, division: val }))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map(div => (
                    <SelectItem key={div} value={div}>{div}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Manager Level Filter */}
              <Select value={filters.managerLevel} onValueChange={(val) => setFilters(prev => ({ ...prev, managerLevel: val }))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="vp">VP</SelectItem>
                  <SelectItem value="c-suite">C-Suite</SelectItem>
                </SelectContent>
              </Select>

              {/* Competency Filter */}
              <Select value={filters.competency} onValueChange={(val) => setFilters(prev => ({ ...prev, competency: val }))}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Competencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Competencies</SelectItem>
                  {competencyOptions.map(comp => (
                    <SelectItem key={comp.value} value={comp.value}>{comp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Risk Level Filter */}
              <Select value={filters.riskLevel} onValueChange={(val) => setFilters(prev => ({ ...prev, riskLevel: val }))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Risk Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  {riskLevelOptions.map(risk => (
                    <SelectItem key={risk.value} value={risk.value}>{risk.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear All Filters Button */}
              {anyFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div id="section-top-metrics">
        <TopMetricsCards metrics={analyticsData.metrics} onMetricClick={handleMetricClick} />
      </div>

      <div id="section-competency-impact" className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CompetencyImpactSection competencyAverages={analyticsData.competency_averages} onCompetencyClick={handleCompetencyClick} />
        </div>
        <div id="section-strategic-risks">
          <StrategicRiskPanel riskAreas={analyticsData.risk_areas} onRiskClick={handleRiskClick} onAIAssistantClick={handleAIAssistantClick} />
        </div>
      </div>

      <div id="section-division-performance">
        <DivisionPerformanceTable divisions={analyticsData.divisions} onDivisionClick={handleDivisionClick} onCellClick={handleCellClick} />
      </div>

      <div id="section-leadership-trends">
        <LeadershipTrends trendData={analyticsData.trend_data} timeRange={filters.timeframe} onDataPointClick={(data) => console.log('Trend data point:', data)} />
      </div>

      <div id="section-succession-pipeline">
        <SuccessionPipelineSection pipelineByLevel={analyticsData.pipeline_by_level} metrics={analyticsData.metrics} onPipelineClick={handlePipelineClick} />
      </div>

      {/* External Qualifications Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrganizationalSkillMapWidget clientId={user?.client_id} />
        <CertificationTrendsWidget clientId={user?.client_id} timeframe={6} />
      </div>

      <DrillDownPanel id="section-drill-down" isOpen={drillDownState.isOpen} onClose={closeDrillDown} data={drillDownState.data} title={drillDownState.title} type={drillDownState.type} />

      {/* Enhanced: Atreus now receives comprehensive context */}
      {atreusState.isOpen && (
        <AtreusCoach
          isOpen={atreusState.isOpen}
          onClose={() => setAtreusState({ isOpen: false, context: null, strategicMode: false, riskData: null })}
          context={atreusState.context}
          strategicMode={atreusState.strategicMode}
          riskData={atreusState.riskData}
        />
      )}

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
              className="rounded-lg p-4 text-center"
              style={{ backgroundColor: 'rgba(2, 2, 255, 0.05)', borderWidth: '1px', borderColor: 'rgba(2, 2, 255, 0.2)' }}
            >
              <p className="text-sm font-medium" style={{ color: '#0202ff' }}>
                Selected Range: {format(customDateRange.from, 'MMM d, yyyy')} - {format(customDateRange.to, 'MMM d, yyyy')}
              </p>
              <p className="text-xs mt-1" style={{ color: '#0202ff' }}>
                {Math.ceil((customDateRange.to.getTime() - customDateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </motion.div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelCustomRange}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyCustomRange}
              disabled={!customDateRange.from || !customDateRange.to}
              className="text-white"
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Date Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // When embedded in Org Dashboard (isOrgScoped), render without background wrapper
  // When standalone, render with full-screen background
  return isOrgScoped ? (
    <div className="space-y-8">
      {content}
    </div>
  ) : (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {content}
      </div>
    </div>
  );
}