
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Users,
  Target,
  BookOpen,
  Brain,
  Award,
  Shield,
  Download,
  RefreshCw,
  ArrowRight,
  Zap,
  Activity,
  BarChart3,
  Info,
  ChevronRight,
  Calendar,
  UserPlus,
  Flag,
  Clock,
  Trophy,
  Edit,
  Trash2,
  Plus,
  GripVertical,
  X,
  PlayCircle,
  FileText,
  User as UserIcon,
  Map,
  CheckCircle2,
  Circle,
  Building2 // New icon import
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { useClient } from "@/components/contexts/ClientContext";
import PageHeader from "@/components/common/PageHeader";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function AIInsightsDashboard() {
  const { user, appRole, isPlatformAdmin, isSuperAdmin } = useAuth();
  const { client } = useClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [focusArea, setFocusArea] = useState('all');
  const [error, setError] = useState(null);

  // User Level 1 specific states
  const [personalInsights, setPersonalInsights] = useState(null);
  const [todos, setTodos] = useState([]);
  const [showAddTodoModal, setShowAddTodoModal] = useState(false);
  const [showEditTodoModal, setShowEditTodoModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState('medium');
  const [newTodoCategory, setNewTodoCategory] = useState('goals');
  const [lastRefreshDate, setLastRefreshDate] = useState(null);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

  // User Level 2 (Manager) specific states
  const [managerInsights, setManagerInsights] = useState(null);

  // User Level 3 (Org Leader) specific states
  const [orgLeaderInsights, setOrgLeaderInsights] = useState(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Custom date range states
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data states (for other roles)
  const [insights, setInsights] = useState(null);
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const isUserLevel1 = appRole === 'User Level 1';
  const isUserLevel2 = appRole === 'User Level 2';
  const isUserLevel3 = appRole === 'User Level 3';

  useEffect(() => {
    console.log('[AIInsightsDashboard] Component mounted, role:', appRole);
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (isSuperAdmin && client && selectedClient === 'all' && clients.length === 0) {
      setSelectedClient(client.id);
    }
  }, [client, isSuperAdmin, selectedClient, clients.length]);

  useEffect(() => {
    if (!loading && !refreshing) { 
      console.log('[AIInsightsDashboard] Filters changed, reloading insights...');
      if (isUserLevel1) {
        loadPersonalInsights();
      } else if (isUserLevel2) {
        loadManagerInsights();
      } else if (isUserLevel3) {
        loadOrgLeaderInsights();
      } else {
        loadInsights();
      }
    }
  }, [timeRange, selectedClient, selectedDepartment, focusArea, selectedDeptFilter, isUserLevel1, isUserLevel2, isUserLevel3, customStartDate, customEndDate]);

  useEffect(() => {
    if (isUserLevel1 && lastRefreshDate) {
      const daysSinceRefresh = Math.floor((new Date() - new Date(lastRefreshDate)) / (1000 * 60 * 60 * 24));
      if (daysSinceRefresh >= 7 && !showRefreshPrompt) {
        setShowRefreshPrompt(true);
      }
    }
  }, [lastRefreshDate, isUserLevel1, showRefreshPrompt]);

  const filteredInsights = useMemo(() => {
    if (!insights || focusArea === 'all') return insights;
    
    console.log('[AIInsightsDashboard] Filtering insights by focus area:', focusArea);
    
    const filteredKeyInsights = insights.keyInsights?.filter(insight => 
      insight.category === focusArea
    ) || [];

    const filteredRecommendations = insights.recommendations?.filter(rec => 
      rec.category === focusArea
    ) || [];

    return {
      ...insights,
      keyInsights: filteredKeyInsights,
      recommendations: filteredRecommendations
    };
  }, [insights, focusArea]);

  const hasData = useMemo(() => {
    if (isUserLevel1) {
      return personalInsights && (
        personalInsights.personalMetrics ||
        personalInsights.keyInsights?.length > 0 ||
        personalInsights.prioritizedTodos?.length > 0 ||
        personalInsights.peerBenchmarks ||
        personalInsights.competencyBreakdown ||
        personalInsights.careerReadiness ||
        personalInsights.hierarchicalComparison
      );
    }
    
    if (isUserLevel2) {
      return managerInsights && managerInsights.hasDirectReports && (
        managerInsights.teamMetrics ||
        managerInsights.teamMemberProfiles?.length > 0 ||
        managerInsights.teamInsights?.length > 0 ||
        managerInsights.managementEffectiveness ||
        managerInsights.benchmarkComparison ||
        managerInsights.oneOnOneRecommendations?.length > 0
      );
    }
    
    if (isUserLevel3) {
      return orgLeaderInsights && (
        orgLeaderInsights.orgMetrics ||
        orgLeaderInsights.strategicInsights?.length > 0 ||
        orgLeaderInsights.departmentBreakdown?.length > 0 ||
        orgLeaderInsights.developmentROI ||
        orgLeaderInsights.leadershipPipeline ||
        orgLeaderInsights.executiveRecommendations?.length > 0 ||
        orgLeaderInsights.talentRisks
      );
    }

    return insights && (
      (insights.metrics && Object.values(insights.metrics).some(val => val > 0)) ||
      (insights.keyInsights && insights.keyInsights.length > 0) ||
      (insights.trends && insights.trends.length > 0) ||
      (insights.leadershipPipeline && insights.leadershipPipeline.totalLeaders > 0) ||
      (insights.engagementRisks?.atRiskUsers && insights.engagementRisks.atRiskUsers.length > 0) ||
      (insights.recommendations && insights.recommendations.length > 0) ||
      (insights.anomalies && insights.anomalies.length > 0)
    );
  }, [insights, personalInsights, managerInsights, orgLeaderInsights, isUserLevel1, isUserLevel2, isUserLevel3]);
  
  const pageHeaderBadges = useMemo(() => {
    const badges = [];
    if (isPlatformAdmin) {
      badges.push({ text: 'Platform Admin', className: 'bg-white text-purple-600' });
    } else if (isSuperAdmin) {
      badges.push({ text: 'Organization Admin', className: 'bg-white text-purple-600' });
    } else if (isUserLevel3) {
      badges.push({ text: 'Executive Dashboard', className: 'bg-white text-emerald-600' });
    } else if (isUserLevel2) {
      badges.push({ text: 'Team Insights', className: 'bg-white text-indigo-600' });
    } else if (isUserLevel1) {
      badges.push({ text: 'Personal Insights', className: 'bg-white text-blue-600' });
    }
    return badges;
  }, [isPlatformAdmin, isSuperAdmin, isUserLevel1, isUserLevel2, isUserLevel3]);

  const initializeDashboard = async () => {
    console.log('[AIInsightsDashboard] Initializing dashboard...');
    setLoading(true);
    
    try {
      if (isUserLevel1) {
        await loadPersonalInsights();
      } else if (isUserLevel2) {
        await loadManagerInsights();
      } else if (isUserLevel3) {
        await loadOrgLeaderInsights();
      } else {
        await loadClients();
        await loadInsights();
      }
    } catch (error) {
      console.error('[AIInsightsDashboard] Error initializing dashboard:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const loadPersonalInsights = async (refresh = false) => {
    console.log('[AIInsightsDashboard] Loading personal insights for User Level 1...');
    
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const payload = {
        time_range: timeRange,
        user_id: user.id // Pass user ID for personal insights
      };

      // Add custom date range if selected
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        payload.custom_start_date = customStartDate;
        payload.custom_end_date = customEndDate;
      }

      const response = await base44.functions.invoke('getPersonalInsights', payload);

      console.log('[AIInsightsDashboard] Personal insights response:', response.data);

      if (response?.data?.success) {
        setPersonalInsights(response.data.data);
        setTodos(response.data.data.prioritizedTodos || []);
        setLastRefreshDate(new Date());
        setLastUpdated(new Date());
        setShowRefreshPrompt(false);
        
        if (refresh) {
          toast.success('Insights refreshed successfully');
        }
      } else {
        throw new Error(response?.data?.error || 'Failed to load personal insights');
      }
    } catch (error) {
      console.error('[AIInsightsDashboard] Error loading personal insights:', error);
      setError(error.message);
      toast.error('Failed to load personal insights: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadManagerInsights = async (refresh = false) => {
    console.log('[AIInsightsDashboard] Loading manager insights for User Level 2...');
    
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const payload = {
        time_range: timeRange,
        user_id: user.id
      };

      // Add custom date range if selected
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        payload.custom_start_date = customStartDate;
        payload.custom_end_date = customEndDate;
      }

      const response = await base44.functions.invoke('getManagerInsights', payload);

      console.log('[AIInsightsDashboard] Manager insights response:', response.data);

      if (response?.data?.success) {
        setManagerInsights(response.data.data);
        setLastUpdated(new Date());
        
        if (refresh) {
          toast.success('Team insights refreshed successfully');
        }
      } else {
        throw new Error(response?.data?.error || 'Failed to load manager insights');
      }
    } catch (error) {
      console.error('[AIInsightsDashboard] Error loading manager insights:', error);
      setError(error.message);
      toast.error('Failed to load manager insights: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOrgLeaderInsights = async (refresh = false) => {
    console.log('[AIInsightsDashboard] Loading org leader insights for User Level 3...');
    
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const payload = {
        time_range: timeRange,
        department_filter: selectedDeptFilter,
        user_id: user.id // Pass user ID for context, if needed by backend
      };

      // Add custom date range if selected
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        payload.custom_start_date = customStartDate;
        payload.custom_end_date = customEndDate;
      }

      const response = await base44.functions.invoke('getOrgLeaderInsights', payload);

      console.log('[AIInsightsDashboard] Org leader insights response:', response.data);

      if (response?.data?.success) {
        setOrgLeaderInsights(response.data.data);
        setLastUpdated(new Date());
        
        if (refresh) {
          toast.success('Organization insights refreshed successfully');
        }
      } else {
        throw new Error(response?.data?.error || 'Failed to load org leader insights');
      }
    } catch (error) {
      console.error('[AIInsightsDashboard] Error loading org leader insights:', error);
      setError(error.message);
      toast.error('Failed to load organization insights: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadClients = async () => {
    console.log('[AIInsightsDashboard] Loading clients...', { isPlatformAdmin, isSuperAdmin });
    
    try {
      if (isPlatformAdmin || isSuperAdmin) {
        const response = await base44.functions.invoke('listClients');
        console.log('[AIInsightsDashboard] Clients response:', response.data);
        
        const fetchedClients = response.data?.clients || [];
        setClients(fetchedClients);
        
        if (isSuperAdmin && client && selectedClient === 'all') {
          console.log('[AIInsightsDashboard] Auto-selecting current client:', client.name);
          setSelectedClient(client.id);
        }
      } else {
        if (client) {
          console.log('[AIInsightsDashboard] Using current client for regular user:', client.name);
          setClients([client]);
          setSelectedClient(client.id);
        }
      }

      const allUsers = await base44.entities.User.list();
      const uniqueDepts = [...new Set(allUsers.map(u => u.department).filter(Boolean))];
      setDepartments(uniqueDepts);
      console.log('[AIInsightsDashboard] Loaded departments:', uniqueDepts);
    } catch (error) {
      console.error('[AIInsightsDashboard] Error loading clients:', error);
      toast.error('Failed to load clients: ' + error.message);
      setClients([]);
    }
  };

  const loadInsights = async (refresh = false) => {
    console.log('[AIInsightsDashboard] === Loading insights START ===');
    console.log('[AIInsightsDashboard] Params:', { refresh, timeRange, selectedClient, selectedDepartment, focusArea });
    
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let clientIdToUse = selectedClient;
      
      if (selectedClient === 'all' && isSuperAdmin && client) {
        clientIdToUse = client.id;
        console.log('[AIInsightsDashboard] Using current client for Super Admin:', clientIdToUse);
      }
      
      if (!isPlatformAdmin && !isSuperAdmin && client) {
        clientIdToUse = client.id;
        console.log('[AIInsightsDashboard] Using current client for regular user:', clientIdToUse);
      }

      if (clientIdToUse === 'all' && (!isPlatformAdmin && !isSuperAdmin)) {
         console.warn('[AIInsightsDashboard] No specific client selected for non-admin user. Aborting insights load.');
         setInsights(null);
         setLoading(false);
         setRefreshing(false);
         return;
      }

      const filters = {
        time_range: timeRange,
        client_id: clientIdToUse,
        department: selectedDepartment,
        focus_area: focusArea
      };

      console.log('[AIInsightsDashboard] Calling getAIInsights with filters:', filters);

      const response = await base44.functions.invoke('getAIInsights', filters);
      
      console.log('[AIInsightsDashboard] === AI Insights response ===', response);

      if (response?.data?.success) {
        console.log('[AIInsightsDashboard] Insights data:', response.data.data);
        setInsights(response.data.data);
        setLastUpdated(new Date());
        if (refresh) {
          toast.success('Insights refreshed successfully');
        }
      } else {
        console.error('[AIInsightsDashboard] Failed response:', response?.data);
        throw new Error(response?.data?.error || 'Failed to load insights');
      }
    } catch (error) {
      console.error('[AIInsightsDashboard] === Error loading insights ===', error);
      setError(error.message);
      toast.error('Failed to load AI insights: ' + error.message);
    } finally {
      console.log('[AIInsightsDashboard] === Loading insights END ===');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCustomDateRangeApply = () => {
    if (!customStartDate.trim() || !customEndDate.trim()) {
      toast.error('Please select both start and end dates');
      return;
    }

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);

    if (start > end) {
      toast.error('Start date must be before end date');
      return;
    }

    setTimeRange('custom');
    setShowCustomDateModal(false);
    toast.success('Custom date range applied');
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setShowCustomDateModal(true);
    } else {
      setTimeRange(value);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const getTimeRangeLabel = () => {
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`;
    }
    return null;
  };

  const handleInsightAction = (insight) => {
    console.log('[AIInsightsDashboard] Handling insight action:', insight);

    // Map insight types to actions
    if (insight.type === 'missing_data' || insight.type === 'action_required') {
      if (insight.category === 'leadership_development') {
        handleQuickAction('take_assessment');
      } else if (insight.category === 'goal_achievement') {
        if (insight.goal_id) {
          handleQuickAction('update_goals', { goalId: insight.goal_id });
        } else {
          handleQuickAction('create_goal');
        }
      } else if (insight.category === 'learning_effectiveness') {
        handleQuickAction('view_learning', { competency: insight.competency });
      } else {
        toast.info('Action not yet implemented for this insight type/category.');
      }
    } else if (insight.type === 'development_area') {
      handleQuickAction('view_learning', { competency: insight.competency });
    } else if (insight.type === 'warning') {
      if (insight.category === 'goal_achievement') {
        handleQuickAction('update_goals');
      } else if (insight.category === 'learning_effectiveness') {
        handleQuickAction('continue_journey');
      } else {
        toast.info('Action not yet implemented for this insight type/category.');
      }
    } else if (insight.type === 'positive_trend') {
      if (insight.category === 'career_progression') {
        handleQuickAction('view_career_path');
      } else if (insight.category === 'goal_achievement') {
        handleQuickAction('create_goal');
      } else if (insight.category === 'learning_effectiveness') {
        handleQuickAction('view_learning');
      } else {
        toast.info('Action not yet implemented for this insight type/category.');
      }
    } else {
      // Default action based on category if no specific type match
      if (insight.category === 'leadership_development') {
        handleQuickAction('take_assessment');
      } else if (insight.category === 'goal_achievement') {
        handleQuickAction('update_goals');
      } else if (insight.category === 'learning_effectiveness') {
        handleQuickAction('view_learning');
      } else if (insight.category === 'career_progression') {
        handleQuickAction('view_career_path');
      } else {
        toast.info('Action not yet implemented for this insight category.');
      }
    }
  };

  // To-do list management functions
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(todos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTodos(items);
    toast.success('To-do list reordered');
  };

  const handleToggleTodo = (todoId) => {
    setTodos(todos.map(todo => 
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleDeleteTodo = (todoId) => {
    setTodos(todos.filter(todo => todo.id !== todoId));
    toast.success('To-do removed');
  };

  const handleAddTodo = () => {
    if (!newTodoTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const newTodo = {
      id: `custom_${Date.now()}`,
      title: newTodoTitle,
      description: newTodoDescription,
      priority: newTodoPriority,
      category: newTodoCategory,
      estimated_time: '15 minutes', // Default for custom to-dos
      action: 'custom',
      completed: false
    };

    setTodos([...todos, newTodo]);
    setShowAddTodoModal(false);
    setNewTodoTitle('');
    setNewTodoDescription('');
    setNewTodoPriority('medium');
    setNewTodoCategory('goals');
    toast.success('To-do added');
  };

  const handleEditTodo = () => {
    if (!newTodoTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setTodos(todos.map(todo => 
      todo.id === editingTodo.id
        ? { ...todo, title: newTodoTitle, description: newTodoDescription, priority: newTodoPriority, category: newTodoCategory }
        : todo
    ));

    setShowEditTodoModal(false);
    setEditingTodo(null);
    setNewTodoTitle('');
    setNewTodoDescription('');
    setNewTodoPriority('medium');
    setNewTodoCategory('goals');
    toast.success('To-do updated');
  };

  const handleQuickAction = (action, data = {}) => {
    console.log('[AIInsightsDashboard] Quick action:', action, data);

    switch (action) {
      case 'take_assessment':
        window.location.href = createPageUrl('LeadershipAssessment');
        break;
      case 'update_goals':
        window.location.href = createPageUrl('Goals');
        break;
      case 'create_goal':
        window.location.href = createPageUrl('Goals');
        break;
      case 'view_learning':
        if (data.competency) {
          window.location.href = createPageUrl('LearningLibrary') + `?competency=${data.competency}`;
        } else {
          window.location.href = createPageUrl('LearningLibrary');
        }
        break;
      case 'continue_journey':
        window.location.href = createPageUrl('MyJourneys');
        break;
      case 'update_profile':
        window.location.href = createPageUrl('Profile');
        break;
      case 'view_career_path':
        window.location.href = createPageUrl('CareerPathExplorer');
        break;
      case 'download_report':
        if (personalInsights?.lastAssessmentDate) {
          toast.info('Generating assessment report...');
          // TODO: Implement actual report generation/download logic
        } else {
          toast.error('No assessment available to export');
        }
        break;
      default:
        toast.info('Action not yet implemented: ' + action);
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      if (isUserLevel1) {
        if (!personalInsights) {
          toast.error('No data available to export');
          return;
        }

        const csvData = [
          ['Personal Insights Report'],
          ['Generated:', new Date().toLocaleString()],
          ['Time Range:', timeRange === 'custom' ? getTimeRangeLabel() : timeRange],
          [''],
          ['Key Metrics'],
          ['Metric', 'Value'],
          ['Current Assessment Score', personalInsights.personalMetrics?.currentAssessmentScore || 'N/A'],
          ['Goal Completion Rate', `${personalInsights.personalMetrics?.goalCompletionRate || 0}%`],
          ['Learning Completion Rate', `${personalInsights.personalMetrics?.learningCompletionRate || 0}%`],
          ['Active Goals', personalInsights.personalMetrics?.activeGoalsCount || 0],
          [''],
          ['Key Insights'],
          ['Title', 'Description', 'Category', 'Priority'],
          ...(personalInsights.keyInsights || []).map(i => [
            `"${(i.title || '').replace(/"/g, '""')}"`,
            `"${(i.description || '').replace(/"/g, '""')}"`,
            (i.category || 'N/A').replace(/_/g, ' '),
            i.priority || 'N/A'
          ]),
          [''],
          ['Prioritized To-Dos'],
          ['Title', 'Description', 'Category', 'Priority', 'Estimated Time', 'Completed'],
          ...todos.map(t => [
            `"${(t.title || '').replace(/"/g, '""')}"`,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            (t.category || 'N/A').replace(/_/g, ' '),
            t.priority || 'N/A',
            t.estimated_time || 'N/A',
            t.completed ? 'Yes' : 'No'
          ])
        ];

        if (personalInsights.hierarchicalComparison) {
          csvData.push(['']);
          csvData.push(['Hierarchical Performance Ranking']);
          csvData.push(['Metric', 'Value']);
          csvData.push(['Your Rank', personalInsights.hierarchicalComparison.userRank]);
          csvData.push(['Total Peers', personalInsights.hierarchicalComparison.totalCount]);
          csvData.push(['Your Percentile', personalInsights.hierarchicalComparison.percentile]);
          csvData.push(['Your Score', personalInsights.hierarchicalComparison.userScore + '%']);
          csvData.push(['Your Tier', personalInsights.hierarchicalComparison.userTier]);
          csvData.push(['Organization Average Score', personalInsights.hierarchicalComparison.averageScore + '%']);
          csvData.push(['Median Score', personalInsights.hierarchicalComparison.medianScore + '%']);
          csvData.push(['Top Performers (80%+) Count', personalInsights.hierarchicalComparison.distribution.topPerformers]);
          csvData.push(['High Performers (60-79%) Count', personalInsights.hierarchicalComparison.distribution.highPerformers]);
          csvData.push(['Developing (40-59%) Count', personalInsights.hierarchicalComparison.distribution.developingPerformers]);
          csvData.push(['Needs Support (<40%) Count', personalInsights.hierarchicalComparison.distribution.needsSupport]);
        }

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `personal-insights-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('CSV exported successfully!');
      } else if (isUserLevel2) {
        if (!managerInsights) {
          toast.error('No data available to export');
          return;
        }

        const csvData = [
          ['Team Insights Report'],
          ['Generated:', new Date().toLocaleString()],
          ['Time Range:', timeRange === 'custom' ? getTimeRangeLabel() : timeRange],
          [''],
        ];

        if (managerInsights.teamMetrics) {
          csvData.push(['Team Overview Metrics']);
          csvData.push(['Metric', 'Value']);
          csvData.push(['Total Team Members', managerInsights.teamMetrics.totalDirectReports || 0]);
          csvData.push(['Avg Team Score', `${managerInsights.teamMetrics.avgTeamScore || 0}%`]);
          csvData.push(['Team Goal Completion Rate', `${managerInsights.teamMetrics.teamGoalCompletionRate || 0}%`]);
          csvData.push(['Team Learning Completion Rate', `${managerInsights.teamMetrics.teamLearningCompletionRate || 0}%`]);
          csvData.push(['']);
        }

        if (managerInsights.managementEffectiveness) {
          csvData.push(['Management Effectiveness Score']);
          csvData.push(['Overall Score', managerInsights.managementEffectiveness.overallScore]);
          csvData.push(['Tier', managerInsights.managementEffectiveness.tier]);
          csvData.push(['Factor', 'Score', 'Max Score', 'Percentage']);
          managerInsights.managementEffectiveness.factors.forEach(f => {
            csvData.push([f.factor, f.score, f.maxScore, `${f.percentage}%`]);
          });
          csvData.push(['']);
        }

        if (managerInsights.benchmarkComparison) {
          csvData.push(['Manager Benchmark Comparison']);
          csvData.push(['Metric', 'Value']);
          csvData.push(['Your Team Avg Score', `${managerInsights.benchmarkComparison.yourTeamAvgScore}%`]);
          csvData.push(['Organization Avg Team Score', `${managerInsights.benchmarkComparison.orgAvgTeamScore}%`]);
          csvData.push(['Your Rank', `#${managerInsights.benchmarkComparison.rank}`]);
          csvData.push(['Total Managers', managerInsights.benchmarkComparison.managerCount]);
          csvData.push(['Score Difference vs Org Avg', `${managerInsights.benchmarkComparison.scoreDiff}%`]);
          csvData.push(['']);
        }

        if (managerInsights.teamInsights && managerInsights.teamInsights.length > 0) {
          csvData.push(['AI-Powered Team Insights']);
          csvData.push(['Title', 'Description', 'Category', 'Priority', 'Impact Score', 'Recommended Action']);
          managerInsights.teamInsights.forEach(i => {
            csvData.push([
              `"${(i.title || '').replace(/"/g, '""')}"`,
              `"${(i.description || '').replace(/"/g, '""')}"`,
              (i.category || '').replace(/_/g, ' '),
              i.priority || 'N/A',
              i.impact_score !== undefined && i.impact_score !== null ? i.impact_score : 'N/A',
              `"${(i.recommended_action || 'N/A').replace(/"/g, '""')}"`
            ]);
          });
          csvData.push(['']);
        }

        if (managerInsights.oneOnOneRecommendations && managerInsights.oneOnOneRecommendations.length > 0) {
          csvData.push(['1-on-1 Recommendations']);
          csvData.push(['Team Member', 'Reason', 'Priority']);
          managerInsights.oneOnOneRecommendations.forEach(r => {
            csvData.push([
              `"${(r.member_name || '').replace(/"/g, '""')}"`,
              `"${(r.reason || 'N/A').replace(/"/g, '""')}"`,
              r.priority || 'N/A'
            ]);
          });
          csvData.push(['']);
        }

        if (managerInsights.teamMemberProfiles && managerInsights.teamMemberProfiles.length > 0) {
          csvData.push(['Team Member Details']);
          csvData.push(['Name', 'Role/Department', 'Assessment Score', 'Goal Progress', 'Active Goals', 'Learning Progress', 'Is At Risk', 'Risk Factors']);
          managerInsights.teamMemberProfiles.forEach(member => {
            csvData.push([
              `"${(member.full_name || '').replace(/"/g, '""')}"`,
              `"${(member.current_role || member.department || 'Team Member').replace(/"/g, '""')}"`,
              member.latestAssessmentScore || 'Not taken',
              `${member.goalCompletionRate || 0}%`,
              member.activeGoalsCount || 0,
              `${member.learningCompletionRate || 0}%`,
              member.isAtRisk ? 'Yes' : 'No',
              `"${(member.riskFactors || []).join('; ').replace(/"/g, '""')}"`
            ]);
          });
          csvData.push(['']);
        }

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-insights-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('CSV exported successfully!');

      } else if (isUserLevel3) {
        if (!orgLeaderInsights) {
          toast.error('No data available to export');
          return;
        }

        const csvData = [
          ['Executive Leadership Report'],
          ['Generated:', new Date().toLocaleString()],
          ['Time Range:', timeRange === 'custom' ? getTimeRangeLabel() : timeRange],
          ['Department Filter:', selectedDeptFilter === 'all' ? 'All' : selectedDeptFilter],
          [''],
        ];

        if (orgLeaderInsights.orgMetrics) {
          csvData.push(['Organization Overview Metrics']);
          csvData.push(['Metric', 'Value']);
          csvData.push(['Total Employees', orgLeaderInsights.orgMetrics.totalEmployees || 0]);
          csvData.push(['Avg Organization Score', `${orgLeaderInsights.orgMetrics.avgOrgScore || 0}%`]);
          csvData.push(['Assessment Completion Rate', `${orgLeaderInsights.orgMetrics.assessmentCompletionRate || 0}%`]);
          csvData.push(['Org Goal Completion Rate', `${orgLeaderInsights.orgMetrics.orgGoalCompletionRate || 0}%`]);
          csvData.push(['Org Learning Completion Rate', `${orgLeaderInsights.orgMetrics.orgLearningCompletionRate || 0}%`]);
          csvData.push(['']);
        }

        if (orgLeaderInsights.developmentROI) {
          csvData.push(['Development ROI Score']);
          csvData.push(['Overall Development ROI', orgLeaderInsights.developmentROI.overallROI]);
          csvData.push(['Factor', 'Score']);
          csvData.push(['Platform Investment', orgLeaderInsights.developmentROI.investmentScore]);
          csvData.push(['Performance Impact', orgLeaderInsights.developmentROI.performanceImpact]);
          csvData.push(['Engagement Impact', orgLeaderInsights.developmentROI.engagementImpact]);
          csvData.push(['Retention Impact', orgLeaderInsights.developmentROI.retentionImpact]);
          csvData.push(['']);
        }

        if (orgLeaderInsights.leadershipPipeline) {
          csvData.push(['Leadership Pipeline & Succession']);
          csvData.push(['Metric', 'Value']);
          csvData.push(['Total Leaders', orgLeaderInsights.leadershipPipeline.totalLeaders]);
          csvData.push(['High Potential Count', orgLeaderInsights.leadershipPipeline.highPotentialCount]);
          csvData.push(['Ready Now Count', orgLeaderInsights.leadershipPipeline.readyNowCount]);
          csvData.push(['Succession Coverage', `${orgLeaderInsights.leadershipPipeline.successionCoverage}%`]);
          csvData.push(['']);
        }

        if (orgLeaderInsights.departmentBreakdown && orgLeaderInsights.departmentBreakdown.length > 0) {
          csvData.push(['Department Performance']);
          csvData.push(['Department', 'Employees', 'Avg Score', 'Assessment Rate', 'Goal Completion Rate', 'Learning Completion Rate']);
          orgLeaderInsights.departmentBreakdown.forEach(dept => {
            csvData.push([
              `"${(dept.name || '').replace(/"/g, '""')}"`,
              dept.employeeCount || 0,
              `${dept.avgScore || 0}%`,
              `${dept.assessmentCompletionRate || 0}%`,
              `${dept.goalCompletionRate || 0}%`,
              `${dept.learningCompletionRate || 0}%`
            ]);
          });
          csvData.push(['']);
        }

        if (orgLeaderInsights.strategicInsights && orgLeaderInsights.strategicInsights.length > 0) {
          csvData.push(['Strategic Insights']);
          csvData.push(['Title', 'Description', 'Category', 'Priority', 'Impact Score', 'KPI', 'Recommended Action']);
          orgLeaderInsights.strategicInsights.forEach(i => {
            csvData.push([
              `"${(i.title || '').replace(/"/g, '""')}"`,
              `"${(i.description || '').replace(/"/g, '""')}"`,
              (i.category || '').replace(/_/g, ' '),
              i.priority || 'N/A',
              i.impact_score !== undefined && i.impact_score !== null ? i.impact_score : 'N/A',
              `"${(i.kpi || 'N/A').replace(/"/g, '""')}"`,
              `"${(i.recommended_action || 'N/A').replace(/"/g, '""')}"`
            ]);
          });
          csvData.push(['']);
        }

        if (orgLeaderInsights.executiveRecommendations && orgLeaderInsights.executiveRecommendations.length > 0) {
          csvData.push(['Executive Action Items']);
          csvData.push(['Title', 'Description', 'Priority', 'Timeframe', 'Estimated Impact']);
          orgLeaderInsights.executiveRecommendations.forEach(r => {
            csvData.push([
              `"${(r.title || '').replace(/"/g, '""')}"`,
              `"${(r.description || '').replace(/"/g, '""')}"`,
              r.priority || 'N/A',
              r.timeframe || 'N/A',
              r.estimatedImpact || 'N/A'
            ]);
          });
          csvData.push(['']);
        }

        if (orgLeaderInsights.talentRisks) {
          csvData.push(['Talent Risk Assessment']);
          csvData.push(['Risk Category', 'Count']);
          csvData.push(['Flight Risk', orgLeaderInsights.talentRisks.flightRisk?.length || 0]);
          csvData.push(['Low Performers', orgLeaderInsights.talentRisks.lowPerformers?.length || 0]);
          csvData.push(['Disengaged', orgLeaderInsights.talentRisks.disengaged?.length || 0]);
          csvData.push(['Skill Gaps', orgLeaderInsights.talentRisks.skillGaps?.length || 0]);
          csvData.push(['']);
        }

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive-insights-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('CSV exported successfully!');

      } else {
        // Existing export logic for other roles
        if (!filteredInsights || (!filteredInsights.keyInsights?.length && !filteredInsights.recommendations?.length && !filteredInsights.metrics)) {
          toast.error('No data available to export');
          return;
        }

        const csvData = [
          ['AI Insights Report'],
          ['Generated:', new Date().toLocaleString()],
          ['Time Range:', timeRange === 'custom' ? getTimeRangeLabel() : timeRange],
          ['Client:', selectedClient === 'all' ? 'All' : clients.find(c => c.id === selectedClient)?.name || 'N/A'],
          ['Department:', selectedDepartment === 'all' ? 'All' : selectedDepartment],
          ['Focus Area:', focusArea === 'all' ? 'All' : focusArea.replace(/_/g, ' ')],
          [''],
        ];
  
        if (filteredInsights.keyInsights && filteredInsights.keyInsights.length > 0) {
          csvData.push(['AI-Generated Key Insights']);
          csvData.push(['Title', 'Description', 'Category', 'Priority', 'Impact Score', 'Recommended Action']);
          filteredInsights.keyInsights.forEach(i => {
            csvData.push([
              `"${(i.title || '').replace(/"/g, '""')}"`,
              `"${(i.description || '').replace(/"/g, '""')}"`,
              (i.category || '').replace(/_/g, ' '),
              i.priority || 'N/A',
              i.impact_score !== undefined && i.impact_score !== null ? i.impact_score : 'N/A',
              `"${(i.recommended_action || 'N/A').replace(/"/g, '""')}"`
            ]);
          });
          csvData.push(['']);
        }
  
        if (filteredInsights.recommendations && filteredInsights.recommendations.length > 0) {
          csvData.push(['Priority Recommendations']);
          csvData.push(['Title', 'Description', 'Impact', 'Effort', 'Affected Count']);
          filteredInsights.recommendations.forEach(r => {
            csvData.push([
              `"${(r.title || '').replace(/"/g, '""')}"`,
              `"${(r.description || '').replace(/"/g, '""')}"`,
              r.impact || 'N/A',
              r.effort || 'N/A',
              r.affected_count !== undefined && r.affected_count !== null ? r.affected_count : 'N/A'
            ]);
          });
          csvData.push(['']);
        }
  
        if (filteredInsights.metrics) {
          csvData.push(['Key Metrics']);
          csvData.push(['Metric', 'Value']);
          Object.entries(filteredInsights.metrics).forEach(([key, value]) => {
            csvData.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), value]);
          });
          csvData.push(['']);
        }
  
        if (filteredInsights.leadershipPipeline) {
          csvData.push(['Leadership Pipeline Analysis']);
          csvData.push(['Total Leaders', 'Avg Leadership Score', 'Succession Readiness Score']);
          csvData.push([
            filteredInsights.leadershipPipeline.totalLeaders || 0,
            filteredInsights.leadershipPipeline.avgLeadershipScore || 0,
            filteredInsights.leadershipPipeline.successionReadinessScore || 0
          ]);
          csvData.push(['']);
        }
  
        if (filteredInsights.engagementRisks?.atRiskUsers && filteredInsights.engagementRisks.atRiskUsers.length > 0) {
          csvData.push(['At-Risk Users']);
          csvData.push(['Full Name', 'Department', 'Reason']);
          filteredInsights.engagementRisks.atRiskUsers.forEach(u => {
            csvData.push([
              `"${(u.full_name || '').replace(/"/g, '""')}"`,
              `"${(u.department || 'N/A').replace(/"/g, '""')}"`,
              `"${(u.reason || 'N/A').replace(/"/g, '""')}"`
            ]);
          });
          csvData.push(['']);
        }
  
        if (filteredInsights.anomalies && filteredInsights.anomalies.length > 0) {
          csvData.push(['Anomalies Detected']);
          csvData.push(['Department', 'Metric', 'Current Value', 'Expected Value', 'Severity']);
          filteredInsights.anomalies.forEach(a => {
            csvData.push([
              `"${(a.department || '').replace(/"/g, '""')}"`,
              `"${(a.metric || '').replace(/"/g, '""')}"`,
              a.value || 'N/A',
              a.expected || 'N/A',
              a.severity || 'N/A'
            ]);
          });
          csvData.push(['']);
        }
  
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-insights-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('CSV exported successfully!');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV: ' + error.message);
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      if (!insights && !personalInsights && !managerInsights && !orgLeaderInsights) {
        toast.error('No data available to export');
        return;
      }
      
      const exportPayload = {
        timeRange,
        clientId: selectedClient,
        department: selectedDepartment, // This is for main admin view, might be different for org leader
        focusArea,
        clientName: client?.name || 'N/A',
        isAdmin: isPlatformAdmin || isSuperAdmin,
        isPersonal: isUserLevel1,
        isManager: isUserLevel2,
        isOrgLeader: isUserLevel3, // New
        // For OrgLeader specific filter
        orgLeaderDeptFilter: isUserLevel3 ? selectedDeptFilter : undefined
      };

      if (isUserLevel1) {
        exportPayload.insights = personalInsights;
      } else if (isUserLevel2) {
        exportPayload.insights = managerInsights;
      } else if (isUserLevel3) { // New condition
        exportPayload.insights = orgLeaderInsights;
      } else {
        exportPayload.insights = insights;
      }

      const response = await base44.functions.invoke('exportAIInsightsPDF', exportPayload);
      
      if (response?.data?.success && response.data.pdfBase64) {
        const pdfBase64 = response.data.pdfBase64;
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-insights-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('PDF exported successfully!');
      } else {
        throw new Error(response?.data?.error || 'Failed to generate PDF: No PDF data received.');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF: ' + error.message);
    } finally {
      setExportingPDF(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (score) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'leadership_development':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'engagement':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'learning_effectiveness':
        return <BookOpen className="w-4 h-4 text-purple-600" />;
      case 'goal_achievement':
        return <Target className="w-4 h-4 text-purple-600" />;
      case 'career_progression':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      default:
        return <Brain className="w-4 h-4 text-purple-600" />;
    }
  };

  const getTodoIcon = (category) => {
    switch (category) {
      case 'assessment':
        return <BarChart3 className="w-4 h-4" />;
      case 'goals':
        return <Target className="w-4 h-4" />;
      case 'learning':
        return <BookOpen className="w-4 h-4" />;
      case 'profile':
        return <UserIcon className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  console.log('[AIInsightsDashboard] Render state:', { loading, insights: !!insights, personalInsights: !!personalInsights, managerInsights: !!managerInsights, orgLeaderInsights: !!orgLeaderInsights, error, isUserLevel1, isUserLevel2, isUserLevel3 });

  if (loading && !insights && !personalInsights && !managerInsights && !orgLeaderInsights && !error) { 
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  if (error && !insights && !personalInsights && !managerInsights && !orgLeaderInsights) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Insights</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => initializeDashboard()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

  // User Level 1 Personal View
  if (isUserLevel1 && personalInsights) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <PageHeader
              title="My Personal Insights"
              subtitle="AI-powered recommendations to accelerate your leadership development"
              badges={pageHeaderBadges}
              onRefresh={() => loadPersonalInsights(true)}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              loadingRefresh={refreshing}
              loadingExportCSV={exportingCSV}
              loadingExportPDF={exportingPDF}
              lastUpdated={lastUpdated}
              exportDisabled={!hasData}
            />
          </motion.div>

          {/* Refresh Prompt */}
          <AnimatePresence>
            {showRefreshPrompt && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-2 border-yellow-300 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-semibold text-yellow-900">Your insights may be outdated</p>
                          <p className="text-sm text-yellow-700">It's been over a week since your last refresh. Update now for the latest recommendations.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => loadPersonalInsights(true)} className="bg-yellow-600 hover:bg-yellow-700">
                          Refresh Now
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowRefreshPrompt(false)}>
                          Later
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Time Range Filter with Custom Range */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-medium text-gray-600">Time Range</label>
                  <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="12mo">Last 12 Months</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="custom">Custom Range...</SelectItem>
                    </SelectContent>
                  </Select>
                  {timeRange === 'custom' && getTimeRangeLabel() && (
                    <Badge variant="outline" className="text-xs">
                      {getTimeRangeLabel()}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Personal Metrics Overview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Your Performance Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {personalInsights.personalMetrics?.currentAssessmentScore || 'N/A'}
                      {personalInsights.personalMetrics?.currentAssessmentScore && '%'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Assessment Score</div>
                    {personalInsights.personalMetrics?.scoreChange !== null && personalInsights.personalMetrics?.scoreChange !== undefined && personalInsights.personalMetrics?.scoreChange !== 0 && (
                      <div className={`text-xs mt-2 flex items-center justify-center gap-1 ${personalInsights.personalMetrics.scoreChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {personalInsights.personalMetrics.scoreChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(personalInsights.personalMetrics.scoreChange)}% since last
                      </div>
                    )}
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {personalInsights.personalMetrics?.goalCompletionRate || 0}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Goal Completion</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {personalInsights.personalMetrics?.completedGoalsCount || 0} of {(personalInsights.personalMetrics?.activeGoalsCount || 0) + (personalInsights.personalMetrics?.completedGoalsCount || 0)} goals
                    </div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {personalInsights.personalMetrics?.learningCompletionRate || 0}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Learning Completion</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {personalInsights.personalMetrics?.completedLearningCount || 0} of {(personalInsights.personalMetrics?.activeLearningCount || 0) + (personalInsights.personalMetrics?.completedLearningCount || 0)} assignments
                    </div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <div className="text-3xl font-bold text-amber-600">
                      {personalInsights.personalMetrics?.activeJourneysCount || 0}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Active Journeys</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {personalInsights.personalMetrics?.avgJourneyCompletion || 0}% avg progress
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Peer Benchmarks */}
          {personalInsights.peerBenchmarks?.yourScore && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    How You Compare to Peers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Same Role Level</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Your Score</span>
                        <span className="font-bold text-blue-600">{personalInsights.peerBenchmarks.yourScore}%</span>
                      </div>
                      <Progress value={personalInsights.peerBenchmarks.yourScore} className="h-2 mb-3" />
                      
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Peer Average</span>
                        <span className="font-bold text-gray-600">{personalInsights.peerBenchmarks.sameLevelAvgScore}%</span>
                      </div>
                      <Progress value={personalInsights.peerBenchmarks.sameLevelAvgScore} className="h-2 mb-3" />
                      
                      <div className={`text-sm font-medium ${personalInsights.peerBenchmarks.scoreDiffLevel > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {personalInsights.peerBenchmarks.scoreDiffLevel > 0 ? '↑' : '↓'} {Math.abs(personalInsights.peerBenchmarks.scoreDiffLevel)}% {personalInsights.peerBenchmarks.scoreDiffLevel > 0 ? 'above' : 'below'} average
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Compared to {personalInsights.peerBenchmarks.sameLevelCount} peers</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Same Department</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Your Score</span>
                        <span className="font-bold text-blue-600">{personalInsights.peerBenchmarks.yourScore}%</span>
                      </div>
                      <Progress value={personalInsights.peerBenchmarks.yourScore} className="h-2 mb-3" />
                      
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Dept Average</span>
                        <span className="font-bold text-gray-600">{personalInsights.peerBenchmarks.sameDeptAvgScore}%</span>
                      </div>
                      <Progress value={personalInsights.peerBenchmarks.sameDeptAvgScore} className="h-2 mb-3" />
                      
                      <div className={`text-sm font-medium ${personalInsights.peerBenchmarks.scoreDiffDept > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {personalInsights.peerBenchmarks.scoreDiffDept > 0 ? '↑' : '↓'} {Math.abs(personalInsights.peerBenchmarks.scoreDiffDept)}% {personalInsights.peerBenchmarks.scoreDiffDept > 0 ? 'above' : 'below'} average
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Compared to {personalInsights.peerBenchmarks.sameDeptCount} colleagues</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Competency Radar Chart */}
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
                        { competency: 'SI', score: personalInsights.competencyBreakdown.si },
                        { competency: 'DM', score: personalInsights.competencyBreakdown.dm },
                        { competency: 'Comm', score: personalInsights.competencyBreakdown.comm },
                        { competency: 'RM', score: personalInsights.competencyBreakdown.rm },
                        { competency: 'SM', score: personalInsights.competencyBreakdown.sm },
                        { competency: 'PM', score: personalInsights.competencyBreakdown.pm }
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="competency" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar name="Your Scores" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {personalInsights.competencyBreakdown.lowest && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-900">
                        Development Opportunity: {personalInsights.competencyBreakdown.lowest.name} ({personalInsights.competencyBreakdown.lowest.score}%)
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Focus on resources that strengthen this competency for the greatest impact.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Career Readiness */}
          {personalInsights.careerReadiness && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-green-600" />
                      Career Progression Readiness
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => handleQuickAction('view_career_path')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Explore Career Paths
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Readiness for {personalInsights.careerReadiness.nextRole}</span>
                        <span className="text-2xl font-bold text-green-600">{personalInsights.careerReadiness.percentage}%</span>
                      </div>
                      <Progress value={personalInsights.careerReadiness.percentage} className="h-3" />
                    </div>
                    <p className="text-sm text-gray-600">{personalInsights.careerReadiness.message}</p>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <p className="text-sm font-medium text-green-900">Recommended Action:</p>
                      <p className="text-sm text-green-800">{personalInsights.careerReadiness.action}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* NEW: Hierarchical Performance Ranking */}
          {personalInsights.hierarchicalComparison && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <Card className="border-0 shadow-lg border-l-4 border-l-indigo-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-indigo-600" />
                    Your Performance Ranking
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    See where you stand among all {personalInsights.hierarchicalComparison.totalCount} User Level 1 peers in your organization
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Overall Ranking */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-indigo-600">
                            #{personalInsights.hierarchicalComparison.userRank}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Your Rank</div>
                          <div className="text-xs text-gray-500 mt-1">
                            out of {personalInsights.hierarchicalComparison.totalCount} peers
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-4xl font-bold text-purple-600">
                            {personalInsights.hierarchicalComparison.percentile}th
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Percentile</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {personalInsights.hierarchicalComparison.percentile >= 75 ? 'Top Quarter' : 
                             personalInsights.hierarchicalComparison.percentile >= 50 ? 'Upper Half' :
                             personalInsights.hierarchicalComparison.percentile >= 25 ? 'Lower Half' : 'Bottom Quarter'}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${
                            personalInsights.hierarchicalComparison.userTier === 'Top Performer' ? 'text-green-600' :
                            personalInsights.hierarchicalComparison.userTier === 'High Performer' ? 'text-blue-600' :
                            personalInsights.hierarchicalComparison.userTier === 'Developing' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {personalInsights.hierarchicalComparison.userScore}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Your Score</div>
                          <Badge className={`mt-2 ${
                            personalInsights.hierarchicalComparison.userTier === 'Top Performer' ? 'bg-green-100 text-green-800' :
                            personalInsights.hierarchicalComparison.userTier === 'High Performer' ? 'bg-blue-100 text-blue-800' :
                            personalInsights.hierarchicalComparison.userTier === 'Developing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {personalInsights.hierarchicalComparison.userTier}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Performance Distribution */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance Distribution</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm font-medium text-gray-700">Top Performers (80%+)</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {personalInsights.hierarchicalComparison.distribution.topPerformers}
                            </span>
                          </div>
                          <Progress 
                            value={(personalInsights.hierarchicalComparison.distribution.topPerformers / personalInsights.hierarchicalComparison.totalCount) * 100} 
                            className="h-2 bg-gray-200"
                            indicatorClassName="bg-green-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm font-medium text-gray-700">High Performers (60-79%)</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {personalInsights.hierarchicalComparison.distribution.highPerformers}
                            </span>
                          </div>
                          <Progress 
                            value={(personalInsights.hierarchicalComparison.distribution.highPerformers / personalInsights.hierarchicalComparison.totalCount) * 100} 
                            className="h-2 bg-gray-200"
                            indicatorClassName="bg-blue-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span className="text-sm font-medium text-gray-700">Developing (40-59%)</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {personalInsights.hierarchicalComparison.distribution.developingPerformers}
                            </span>
                          </div>
                          <Progress 
                            value={(personalInsights.hierarchicalComparison.distribution.developingPerformers / personalInsights.hierarchicalComparison.totalCount) * 100} 
                            className="h-2 bg-gray-200"
                            indicatorClassName="bg-yellow-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-sm font-medium text-gray-700">Needs Support (&lt;40%)</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {personalInsights.hierarchicalComparison.distribution.needsSupport}
                            </span>
                          </div>
                          <Progress 
                            value={(personalInsights.hierarchicalComparison.distribution.needsSupport / personalInsights.hierarchicalComparison.totalCount) * 100} 
                            className="h-2 bg-gray-200"
                            indicatorClassName="bg-red-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Statistical Insights */}
                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">Organization Average</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {personalInsights.hierarchicalComparison.averageScore}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {personalInsights.hierarchicalComparison.userScore > personalInsights.hierarchicalComparison.averageScore ? 
                            `You're ${personalInsights.hierarchicalComparison.userScore - personalInsights.hierarchicalComparison.averageScore}% above average` :
                            `${personalInsights.hierarchicalComparison.averageScore - personalInsights.hierarchicalComparison.userScore}% below average`
                          }
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">Median Score</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {personalInsights.hierarchicalComparison.medianScore}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {personalInsights.hierarchicalComparison.userScore > personalInsights.hierarchicalComparison.medianScore ?
                            `Above median by ${personalInsights.hierarchicalComparison.userScore - personalInsights.hierarchicalComparison.medianScore}%` :
                            `Below median by ${personalInsights.hierarchicalComparison.medianScore - personalInsights.hierarchicalComparison.userScore}%`
                          }
                        </div>
                      </div>
                    </div>

                    {/* Motivational Message */}
                    {personalInsights.hierarchicalComparison.percentile >= 75 && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-start gap-3">
                          <Trophy className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-900">Outstanding Performance!</p>
                            <p className="text-sm text-green-700 mt-1">
                              You're in the top 25% of all User Level 1 peers. Consider sharing your knowledge through mentoring or leading team initiatives.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {personalInsights.hierarchicalComparison.percentile < 50 && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start gap-3">
                          <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">Room for Growth</p>
                            <p className="text-sm text-blue-700 mt-1">
                              Focus on your development areas to move up in the rankings. Check your competency gaps and prioritize learning resources that address them.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Enhanced AI-Generated Insights with Action Buttons */}
          {personalInsights.keyInsights && personalInsights.keyInsights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI-Powered Insights
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Personalized recommendations based on your activity and performance
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {personalInsights.keyInsights.map((insight, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getCategoryIcon(insight.category)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                        </div>
                        {insight.impact_score !== undefined && insight.impact_score !== null && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Impact Score</span>
                              <span className={getImpactColor(insight.impact_score)}>
                                {insight.impact_score}/100
                              </span>
                            </div>
                            <Progress value={insight.impact_score} className="h-2" />
                          </div>
                        )}
                        {insight.recommended_action && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900 mb-1">Recommended Action:</p>
                                <p className="text-sm text-blue-800">{insight.recommended_action}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleInsightAction(insight)}
                                className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                              >
                                <PlayCircle className="w-3 h-3 mr-1" />
                                Take Action
                              </Button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Prioritized To-Do List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      Your Prioritized To-Do List
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      AI-suggested actions you can reorder, edit, or customize
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddTodoModal(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add To-Do
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {todos.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-600">All caught up! Add custom to-dos to stay organized.</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="todos">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                          {todos.map((todo, index) => (
                            <Draggable key={todo.id} draggableId={todo.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`p-4 rounded-lg border transition-all flex items-start gap-3 ${
                                    snapshot.isDragging ? 'shadow-lg bg-blue-50 border-blue-300' : 'bg-white hover:shadow-md'
                                  } ${todo.completed ? 'opacity-60' : ''}`}
                                >
                                  <div {...provided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-5 h-5 text-gray-400" />
                                  </div>
                                  
                                  <button
                                    onClick={() => handleToggleTodo(todo.id)}
                                    className="mt-1"
                                  >
                                    {todo.completed ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-gray-400 hover:text-green-600" />
                                    )}
                                  </button>

                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <h4 className={`font-semibold text-gray-900 ${todo.completed ? 'line-through' : ''}`}>
                                          {todo.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                                      </div>
                                      <Badge className={getPriorityColor(todo.priority)}>
                                        {todo.priority}
                                      </Badge>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <div className="flex items-center gap-1">
                                        {getTodoIcon(todo.category)}
                                        <span className="capitalize">{todo.category.replace(/_/g, ' ')}</span>
                                      </div>
                                      {todo.estimated_time && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          <span>{todo.estimated_time}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-3">
                                      {todo.action !== 'custom' && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleQuickAction(todo.action, todo)}
                                          className="bg-blue-600 hover:bg-blue-700"
                                        >
                                          <PlayCircle className="w-3 h-3 mr-1" />
                                          Take Action
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingTodo(todo);
                                          setNewTodoTitle(todo.title);
                                          setNewTodoDescription(todo.description);
                                          setNewTodoPriority(todo.priority);
                                          setNewTodoCategory(todo.category);
                                          setShowEditTodoModal(true);
                                        }}
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteTodo(todo.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-3">
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
                    className="h-auto py-4 flex-col items-start hover:bg-amber-50"
                    onClick={() => handleQuickAction('continue_journey')}
                  >
                    <Map className="w-5 h-5 text-amber-600 mb-2" />
                    <span className="font-semibold">Continue Journey</span>
                    <span className="text-xs text-gray-500 mt-1">Resume learning</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col items-start hover:bg-indigo-50"
                    onClick={() => handleQuickAction('view_career_path')}
                  >
                    <Award className="w-5 h-5 text-indigo-600 mb-2" />
                    <span className="font-semibold">Career Paths</span>
                    <span className="text-xs text-gray-500 mt-1">Plan your future</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col items-start hover:bg-gray-50"
                    onClick={() => handleQuickAction('update_profile')}
                  >
                    <UserIcon className="w-5 h-5 text-gray-600 mb-2" />
                    <span className="font-semibold">Update Profile</span>
                    <span className="text-xs text-gray-500 mt-1">Keep info current</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Custom Date Range Modal */}
        <Dialog open={showCustomDateModal} onOpenChange={setShowCustomDateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Custom Date Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="customStartDate">Start Date</Label>
                <Input
                  id="customStartDate"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]} // Cannot select future dates
                />
              </div>
              <div>
                <Label htmlFor="customEndDate">End Date</Label>
                <Input
                  id="customEndDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]} // Cannot select future dates
                  min={customStartDate} // End date cannot be before start date
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomDateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCustomDateRangeApply} className="bg-blue-600 hover:bg-blue-700">
                Apply Range
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add To-Do Modal */}
        <Dialog open={showAddTodoModal} onOpenChange={setShowAddTodoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom To-Do</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="newTodoTitle">Title</Label>
                <Input
                  id="newTodoTitle"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  placeholder="What needs to be done?"
                />
              </div>
              <div>
                <Label htmlFor="newTodoDescription">Description</Label>
                <Textarea
                  id="newTodoDescription"
                  value={newTodoDescription}
                  onChange={(e) => setNewTodoDescription(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="newTodoPriority">Priority</Label>
                <Select value={newTodoPriority} onValueChange={setNewTodoPriority}>
                  <SelectTrigger id="newTodoPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="newTodoCategory">Category</Label>
                <Select value={newTodoCategory} onValueChange={setNewTodoCategory}>
                  <SelectTrigger id="newTodoCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goals">Goals</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="profile">Profile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTodoModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTodo} className="bg-blue-600 hover:bg-blue-700">
                Add To-Do
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit To-Do Modal */}
        <Dialog open={showEditTodoModal} onOpenChange={setShowEditTodoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit To-Do</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="editTodoTitle">Title</Label>
                <Input
                  id="editTodoTitle"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  placeholder="What needs to be done?"
                />
              </div>
              <div>
                <Label htmlFor="editTodoDescription">Description</Label>
                <Textarea
                  id="editTodoDescription"
                  value={newTodoDescription}
                  onChange={(e) => setNewTodoDescription(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="editTodoPriority">Priority</Label>
                <Select value={newTodoPriority} onValueChange={setNewTodoPriority}>
                  <SelectTrigger id="editTodoPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editTodoCategory">Category</Label>
                <Select value={newTodoCategory} onValueChange={setNewTodoCategory}>
                  <SelectTrigger id="editTodoCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goals">Goals</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="profile">Profile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditTodoModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditTodo} className="bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // User Level 2 Manager View
  if (isUserLevel2 && managerInsights) {
    if (!managerInsights.hasDirectReports) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Team Members Found</h3>
              <p className="text-gray-600 mb-4">
                Team insights will be available once team members are assigned to you.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <PageHeader
              title="Team Insights Dashboard"
              subtitle="Manage and develop your team with AI-powered recommendations"
              badges={pageHeaderBadges}
              onRefresh={() => loadManagerInsights(true)}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              loadingRefresh={refreshing}
              loadingExportCSV={exportingCSV}
              loadingExportPDF={exportingPDF}
              lastUpdated={lastUpdated}
              exportDisabled={!hasData}
            />
          </motion.div>

          {/* Time Range Filter */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-medium text-gray-600">Time Range</label>
                  <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="12mo">Last 12 Months</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="custom">Custom Range...</SelectItem>
                    </SelectContent>
                  </Select>
                  {timeRange === 'custom' && getTimeRangeLabel() && (
                    <Badge variant="outline" className="text-xs">
                      {getTimeRangeLabel()}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Overview Metrics */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Team Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <div className="text-3xl font-bold text-indigo-600">
                      {managerInsights.teamMetrics.totalDirectReports}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Team Members</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {managerInsights.teamMetrics.avgTeamScore || 'N/A'}
                      {managerInsights.teamMetrics.avgTeamScore && '%'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Avg Team Score</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {managerInsights.teamMetrics.teamGoalCompletionRate}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Goal Completion</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <div className="text-3xl font-bold text-amber-600">
                      {managerInsights.teamMetrics.teamLearningCompletionRate}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Learning Completion</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Management Effectiveness Score */}
          {managerInsights.managementEffectiveness && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-lg border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    Management Effectiveness Score
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Based on team performance, engagement, and development metrics
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6">
                      <div className="text-center mb-4">
                        <div className={`text-5xl font-bold mb-2 ${
                          managerInsights.managementEffectiveness.tier === 'Excellent' ? 'text-green-600' :
                          managerInsights.managementEffectiveness.tier === 'Good' ? 'text-blue-600' :
                          managerInsights.managementEffectiveness.tier === 'Developing' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {managerInsights.managementEffectiveness.overallScore}/100
                        </div>
                        <Badge className={`${
                          managerInsights.managementEffectiveness.tier === 'Excellent' ? 'bg-green-100 text-green-800' :
                          managerInsights.managementEffectiveness.tier === 'Good' ? 'bg-blue-100 text-blue-800' :
                          managerInsights.managementEffectiveness.tier === 'Developing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {managerInsights.managementEffectiveness.tier}
                        </Badge>
                      </div>
                      <Progress 
                        value={managerInsights.managementEffectiveness.overallScore} 
                        className="h-3"
                      />
                    </div>

                    <div className="space-y-3">
                      {managerInsights.managementEffectiveness.factors.map((factor, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{factor.factor}</span>
                            <span className="text-gray-600">
                              {factor.score}/{factor.maxScore} pts ({factor.percentage}%)
                            </span>
                          </div>
                          <Progress 
                            value={factor.percentage} 
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Benchmark Comparison */}
          {managerInsights.benchmarkComparison && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Manager Benchmark
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Compare your team's performance with {managerInsights.benchmarkComparison.managerCount - 1} other managers
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Your Team's Avg Score</div>
                      <div className="text-3xl font-bold text-blue-600">
                        {managerInsights.benchmarkComparison.yourTeamAvgScore}%
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Org Avg Score</div>
                      <div className="text-3xl font-bold text-gray-900">
                        {managerInsights.benchmarkComparison.orgAvgTeamScore}%
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Your Rank</div>
                      <div className="text-3xl font-bold text-purple-600">
                        #{managerInsights.benchmarkComparison.rank}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        out of {managerInsights.benchmarkComparison.managerCount} managers
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className={`text-center p-3 rounded-lg ${
                      managerInsights.benchmarkComparison.scoreDiff > 0 
                        ? 'bg-green-50 text-green-800' 
                        : 'bg-orange-50 text-orange-800'
                    }`}>
                      <p className="text-sm font-medium">
                        {managerInsights.benchmarkComparison.scoreDiff > 0 ? '↑' : '↓'} 
                        {' '}{Math.abs(managerInsights.benchmarkComparison.scoreDiff)}% 
                        {' '}{managerInsights.benchmarkComparison.scoreDiff > 0 ? 'above' : 'below'} organization average
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Team Insights */}
          {managerInsights.teamInsights && managerInsights.teamInsights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI-Powered Team Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {managerInsights.teamInsights.map((insight, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getCategoryIcon(insight.category)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                        </div>
                        {insight.impact_score !== undefined && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Impact Score</span>
                              <span className={getImpactColor(insight.impact_score)}>
                                {insight.impact_score}/100
                              </span>
                            </div>
                            <Progress value={insight.impact_score} className="h-2" />
                          </div>
                        )}
                        {insight.recommended_action && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-sm font-medium text-blue-900 mb-1">Recommended Action:</p>
                            <p className="text-sm text-blue-800">{insight.recommended_action}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 1-on-1 Recommendations */}
          {managerInsights.oneOnOneRecommendations && managerInsights.oneOnOneRecommendations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    1-on-1 Recommendations
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Team members who would benefit from a check-in
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {managerInsights.oneOnOneRecommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{rec.member_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority}
                          </Badge>
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                          >
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

          {/* Team Member Profiles */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
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
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-4 rounded-lg border-2 ${
                        member.isAtRisk 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{member.full_name}</h4>
                          <p className="text-sm text-gray-600">{member.current_role || member.department || 'Team Member'}</p>
                        </div>
                        {member.isAtRisk && (
                          <Badge className="bg-red-100 text-red-800">At Risk</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Assessment Score</p>
                          <p className="font-bold text-gray-900">
                            {member.latestAssessmentScore || 'Not taken'}
                            {member.latestAssessmentScore && '%'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Goal Progress</p>
                          <p className="font-bold text-gray-900">{member.goalCompletionRate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Active Goals</p>
                          <p className="font-bold text-gray-900">{member.activeGoalsCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Learning Progress</p>
                          <p className="font-bold text-gray-900">{member.learningCompletionRate}%</p>
                        </div>
                      </div>

                      {member.riskFactors && member.riskFactors.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-gray-700 mb-2">Risk Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {member.riskFactors.map((factor, fIdx) => (
                              <Badge key={fIdx} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Custom Date Range Modal */}
        <Dialog open={showCustomDateModal} onOpenChange={setShowCustomDateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Custom Date Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="customStartDate">Start Date</Label>
                <Input
                  id="customStartDate"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="customEndDate">End Date</Label>
                <Input
                  id="customEndDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  min={customStartDate}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomDateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCustomDateRangeApply} className="bg-blue-600 hover:bg-blue-700">
                Apply Range
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // User Level 3 Org Leader View
  if (isUserLevel3 && orgLeaderInsights) {
    // Dynamically get departments from loaded data if available, otherwise fallback to global departments state
    const availableDepartments = orgLeaderInsights.departmentBreakdown?.map(d => d.name) || departments;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <PageHeader
              title="Executive Leadership Dashboard"
              subtitle="Strategic insights and organizational performance analytics"
              badges={pageHeaderBadges}
              onRefresh={() => loadOrgLeaderInsights(true)}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              loadingRefresh={refreshing}
              loadingExportCSV={exportingCSV}
              loadingExportPDF={exportingPDF}
              lastUpdated={lastUpdated}
              exportDisabled={!hasData}
            />
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-medium text-gray-600">Time Range</label>
                  <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="12mo">Last 12 Months</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="custom">Custom Range...</SelectItem>
                    </SelectContent>
                  </Select>

                  {availableDepartments.length > 0 && (
                    <>
                      <label className="text-sm font-medium text-gray-600">Department</label>
                      <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {availableDepartments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {timeRange === 'custom' && getTimeRangeLabel() && (
                    <Badge variant="outline" className="text-xs">
                      {getTimeRangeLabel()}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Organization Metrics */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Organization Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <div className="text-3xl font-bold text-emerald-600">
                      {orgLeaderInsights.orgMetrics.totalEmployees}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Employees</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {orgLeaderInsights.orgMetrics.avgOrgScore || 'N/A'}
                      {orgLeaderInsights.orgMetrics.avgOrgScore && '%'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Avg Performance</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {orgLeaderInsights.orgMetrics.assessmentCompletionRate}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Assessment Rate</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {orgLeaderInsights.orgMetrics.orgGoalCompletionRate}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Goal Completion</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <div className="text-3xl font-bold text-amber-600">
                      {orgLeaderInsights.orgMetrics.orgLearningCompletionRate}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Learning Completion</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Development ROI */}
          {orgLeaderInsights.developmentROI && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Development ROI Score
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Measuring the impact of leadership development investments
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
                      <div className="text-center mb-4">
                        <div className={`text-5xl font-bold mb-2 ${
                          orgLeaderInsights.developmentROI.overallROI >= 80 ? 'text-green-600' :
                          orgLeaderInsights.developmentROI.overallROI >= 60 ? 'text-blue-600' :
                          orgLeaderInsights.developmentROI.overallROI >= 40 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {orgLeaderInsights.developmentROI.overallROI}/100
                        </div>
                        <p className="text-sm text-gray-600">Overall Development ROI</p>
                      </div>
                      <Progress 
                        value={orgLeaderInsights.developmentROI.overallROI} 
                        className="h-3"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">Platform Investment</span>
                          <span className="text-gray-600">{orgLeaderInsights.developmentROI.investmentScore}%</span>
                        </div>
                        <Progress value={orgLeaderInsights.developmentROI.investmentScore} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">Active user engagement</p>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">Performance Impact</span>
                          <span className="text-gray-600">{orgLeaderInsights.developmentROI.performanceImpact}%</span>
                        </div>
                        <Progress value={orgLeaderInsights.developmentROI.performanceImpact} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">Leadership capability growth</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">Engagement Impact</span>
                          <span className="text-gray-600">{orgLeaderInsights.developmentROI.engagementImpact}%</span>
                        </div>
                        <Progress value={orgLeaderInsights.developmentROI.engagementImpact} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">Employee engagement levels</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">Retention Impact</span>
                          <span className="text-gray-600">{orgLeaderInsights.developmentROI.retentionImpact}%</span>
                        </div>
                        <Progress value={orgLeaderInsights.developmentROI.retentionImpact} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">High performer retention</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Leadership Pipeline */}
          {orgLeaderInsights.leadershipPipeline && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Leadership Pipeline & Succession
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Total Leaders</div>
                      <div className="text-3xl font-bold text-indigo-600">
                        {orgLeaderInsights.leadershipPipeline.totalLeaders}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">High Potential</div>
                      <div className="text-3xl font-bold text-green-600">
                        {orgLeaderInsights.leadershipPipeline.highPotentialCount}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Ready Now</div>
                      <div className="text-3xl font-bold text-blue-600">
                        {orgLeaderInsights.leadershipPipeline.readyNowCount}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Succession Coverage</div>
                      <div className={`text-3xl font-bold ${
                        orgLeaderInsights.leadershipPipeline.successionCoverage >= 80 ? 'text-green-600' :
                        orgLeaderInsights.leadershipPipeline.successionCoverage >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {orgLeaderInsights.leadershipPipeline.successionCoverage}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">Succession Pipeline Strength</span>
                      <span className="text-gray-600">{orgLeaderInsights.leadershipPipeline.successionCoverage}%</span>
                    </div>
                    <Progress value={orgLeaderInsights.leadershipPipeline.successionCoverage} className="h-3" />
                    {orgLeaderInsights.leadershipPipeline.successionCoverage < 60 && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-900 font-medium">⚠️ Critical: Insufficient succession coverage</p>
                        <p className="text-sm text-red-700 mt-1">Accelerate high-potential development programs immediately.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Department Performance */}
          {orgLeaderInsights.departmentBreakdown && orgLeaderInsights.departmentBreakdown.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Department Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orgLeaderInsights.departmentBreakdown.map((dept, idx) => (
                      <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                            <p className="text-sm text-gray-600">{dept.employeeCount} employees</p>
                          </div>
                          <Badge className={`${
                            dept.avgScore >= 80 ? 'bg-green-100 text-green-800' :
                            dept.avgScore >= 60 ? 'bg-blue-100 text-blue-800' :
                            dept.avgScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {dept.avgScore}% Avg Score
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">Assessment Rate</p>
                            <Progress value={dept.assessmentCompletionRate} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">{dept.assessmentCompletionRate}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Goal Completion</p>
                            <Progress value={dept.goalCompletionRate} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">{dept.goalCompletionRate}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Performance</p>
                            <Progress value={dept.avgScore} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">{dept.avgScore}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Strategic Insights */}
          {orgLeaderInsights.strategicInsights && orgLeaderInsights.strategicInsights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Strategic Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orgLeaderInsights.strategicInsights.map((insight, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-4 border-2 rounded-lg hover:shadow-md transition-shadow ${
                          insight.type === 'critical' ? 'border-red-300 bg-red-50' :
                          insight.priority === 'high' ? 'border-orange-300 bg-orange-50' :
                          'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getCategoryIcon(insight.category)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                        </div>
                        {insight.impact_score !== undefined && insight.impact_score !== null && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Impact Score</span>
                              <span className={getImpactColor(insight.impact_score)}>
                                {insight.impact_score}/100
                              </span>
                            </div>
                            <Progress value={insight.impact_score} className="h-2" />
                          </div>
                        )}
                        {insight.kpi && (
                          <div className="mb-3">
                            <Badge variant="outline" className="text-xs">{insight.kpi}</Badge>
                          </div>
                        )}
                        {insight.recommended_action && (
                          <div className={`rounded-lg p-3 border ${
                            insight.type === 'critical' ? 'bg-red-100 border-red-300' :
                            insight.priority === 'high' ? 'bg-orange-100 border-orange-300' :
                            'bg-blue-50 border-blue-200'
                          }`}>
                            <p className="text-sm font-medium text-gray-900 mb-1">Executive Action Required:</p>
                            <p className="text-sm text-gray-800">{insight.recommended_action}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Executive Recommendations */}
          {orgLeaderInsights.executiveRecommendations && orgLeaderInsights.executiveRecommendations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-0 shadow-lg border-l-4 border-l-emerald-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-emerald-600" />
                    Executive Action Items
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Strategic recommendations for organizational leadership development
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orgLeaderInsights.executiveRecommendations.map((rec, idx) => (
                      <div key={idx} className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{rec.timeframe}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>Impact: {rec.estimatedImpact}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Talent Risks Summary */}
          {orgLeaderInsights.talentRisks && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    Talent Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Flight Risk</h4>
                        <Badge className="bg-red-100 text-red-800">
                          {orgLeaderInsights.talentRisks.flightRisk?.length || 0}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">High performers showing disengagement</p>
                    </div>

                    <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Low Performers</h4>
                        <Badge className="bg-orange-100 text-orange-800">
                          {orgLeaderInsights.talentRisks.lowPerformers?.length || 0}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">Employees with scores below 50%</p>
                    </div>

                    <div className="p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Disengaged</h4>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {orgLeaderInsights.talentRisks.disengaged?.length || 0}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">No activity in past 60 days</p>
                    </div>

                    <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Skill Gaps</h4>
                        <Badge className="bg-blue-100 text-blue-800">
                          {orgLeaderInsights.talentRisks.skillGaps?.length || 0}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">Critical competency deficiencies</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Custom Date Range Modal */}
        <Dialog open={showCustomDateModal} onOpenChange={setShowCustomDateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Custom Date Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="customStartDate">Start Date</Label>
                <Input
                  id="customStartDate"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="customEndDate">End Date</Label>
                <Input
                  id="customEndDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  min={customStartDate}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomDateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCustomDateRangeApply} className="bg-blue-600 hover:bg-blue-700">
                Apply Range
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Original organizational view for other roles (Platform Admin, Super Admin, etc.)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* PageHeader Component */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }}>
          <PageHeader
            title="AI Insights Dashboard"
            subtitle={
              isPlatformAdmin
                ? 'Platform Intelligence & Recommendations'
                : `Strategic Insights for ${client?.name || 'Your Organization'}`
            }
            badges={pageHeaderBadges}
            onRefresh={() => loadInsights(true)}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            loadingRefresh={refreshing}
            loadingExportCSV={exportingCSV}
            loadingExportPDF={exportingPDF}
            lastUpdated={lastUpdated}
            exportDisabled={!hasData}
          />
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Time Range</label>
                  <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="12mo">Last 12 Months</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="custom">Custom Range...</SelectItem>
                    </SelectContent>
                  </Select>
                  {timeRange === 'custom' && getTimeRangeLabel() && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {getTimeRangeLabel()}
                    </Badge>
                  )}
                </div>

                {(isPlatformAdmin || clients.length > 1) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      {isPlatformAdmin ? 'Organization' : 'Client'}
                    </label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isPlatformAdmin && <SelectItem value="all">All Organizations</SelectItem>}
                        {clients.map(cl => (
                          <SelectItem key={cl.id} value={cl.id}>
                            {cl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {departments.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Department</label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Focus Area</label>
                  <Select value={focusArea} onValueChange={setFocusArea}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Insights</SelectItem>
                      <SelectItem value="leadership_development">Leadership Development</SelectItem>
                      <SelectItem value="engagement">Engagement & Retention</SelectItem>
                      <SelectItem value="learning_effectiveness">Learning Effectiveness</SelectItem>
                      <SelectItem value="goal_achievement">Goal Achievement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Empty State */}
        {!hasData && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Brain className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Insights Available Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  AI insights will be generated once there's sufficient data from assessments, goals, and learning activities.
                </p>
                <Button onClick={() => loadInsights(true)} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Insights Content */}
        {hasData && (
          <>
            {/* Key Metrics */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {filteredInsights.metrics?.totalUsers || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {filteredInsights.metrics?.avgAssessmentScore || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Avg Assessment Score</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {filteredInsights.metrics?.goalCompletionRate || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Goal Completion</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <div className="text-2xl font-bold text-amber-600">
                        {filteredInsights.metrics?.learningCompletionRate || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Learning Completion</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI-Generated Key Insights */}
            {filteredInsights.keyInsights && filteredInsights.keyInsights.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      AI-Generated Insights
                      {focusArea !== 'all' && (
                        <Badge variant="outline" className="ml-2 capitalize">
                          Filtered: {focusArea.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Strategic recommendations based on your organizational data
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredInsights.keyInsights.map((insight, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-1">
                                {getCategoryIcon(insight.category)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                              </div>
                            </div>
                            <Badge className={getPriorityColor(insight.priority)}>
                              {insight.priority}
                            </Badge>
                          </div>
                          {insight.impact_score !== undefined && insight.impact_score !== null && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Impact Score</span>
                                <span className={getImpactColor(insight.impact_score)}>
                                  {insight.impact_score}/100
                                </span>
                              </div>
                              <Progress value={insight.impact_score} className="h-2" />
                            </div>
                          )}
                          {insight.recommended_action && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <p className="text-sm font-medium text-blue-900 mb-1">Recommended Action:</p>
                              <p className="text-sm text-blue-800">{insight.recommended_action}</p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Show message when focus area has no insights */}
            {focusArea !== 'all' && filteredInsights.keyInsights && filteredInsights.keyInsights.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Insights for This Focus Area
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Try selecting "All Insights" or a different focus area to see recommendations.
                    </p>
                    <Button variant="outline" onClick={() => setFocusArea('all')}>
                      View All Insights
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Priority Recommendations */}
            {filteredInsights.recommendations && filteredInsights.recommendations.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="border-0 shadow-lg border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Priority Recommendations
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Actionable steps to improve platform engagement and effectiveness
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredInsights.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                          <div className="mt-1">
                            {rec.impact === 'high' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                            {rec.impact === 'medium' && <Info className="w-5 h-5 text-yellow-600" />}
                            {rec.impact === 'low' && <CheckCircle className="w-5 h-5 text-green-600" />}
                            {rec.impact === 'critical' && <AlertTriangle className="w-5 h-5 text-red-700" />}
                            {!['high', 'medium', 'low', 'critical'].includes(rec.impact) && <Info className="w-5 h-5 text-gray-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {rec.effort}
                                </Badge>
                                <Badge className={rec.impact === 'high' ? 'bg-red-100 text-red-800' : rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' : rec.impact === 'low' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                  {rec.impact} impact
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{rec.description}</p>
                            {rec.affected_count > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                Affects {rec.affected_count} {rec.affected_count === 1 ? 'user' : 'users'}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Leadership Pipeline (if available) */}
            {filteredInsights.leadershipPipeline && filteredInsights.leadershipPipeline.totalLeaders > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-600" />
                      Leadership Pipeline Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <div className="text-2xl font-bold text-amber-600">
                          {filteredInsights.leadershipPipeline.totalLeaders}
                        </div>
                        <div className="text-sm text-gray-600">Leaders</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {filteredInsights.leadershipPipeline.avgLeadershipScore}%
                        </div>
                        <div className="text-sm text-gray-600">Avg Score</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {filteredInsights.leadershipPipeline.successionReadinessScore}%
                        </div>
                        <div className="text-sm text-gray-600">Succession Ready</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Engagement Risks */}
            {filteredInsights.engagementRisks?.atRiskUsers && filteredInsights.engagementRisks.atRiskUsers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      At-Risk Users ({filteredInsights.engagementRisks.atRiskUsers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filteredInsights.engagementRisks.atRiskUsers.slice(0, 5).map((user, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-600">{user.department || 'No department'}</p>
                          </div>
                          <Badge variant="destructive">{user.reason || 'Flagged'}</Badge>
                        </div>
                      ))}
                      {filteredInsights.engagementRisks.atRiskUsers.length > 5 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          +{filteredInsights.engagementRisks.atRiskUsers.length - 5} more users
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Anomalies */}
            {filteredInsights.anomalies && filteredInsights.anomalies.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-orange-600" />
                      Anomalies Detected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredInsights.anomalies.map((anomaly, idx) => (
                        <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-gray-900">{anomaly.department} - {anomaly.metric}</p>
                            <Badge className="bg-orange-100 text-orange-800">
                              {anomaly.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">Current: {anomaly.value}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600">Expected: {anomaly.expected}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default withAuthProtection(AIInsightsDashboard, ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Analyst', 'Admin Level 1', 'Admin Level 2', 'User Level 1', 'User Level 2', 'User Level 3']);
