
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Award,
  BarChart3,
  Filter,
  Download,
  Loader2,
  CheckCircle,
  Clock,
  Eye
} from "lucide-react";
import { User } from "@/entities/User"; // Keep existing import if not explicitly told to remove, but not strictly needed for types now.
import { Assessment } from "@/entities/Assessment"; // Keep existing import
import { Cohort } from "@/entities/Cohort"; // Keep existing import
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import UserDetailPanel from "./UserDetailPanel";
import InterventionActionsMenu from "./InterventionActionsMenu";
import BulkActionsBar from "./BulkActionsBar";
import SendNudgeModal from "./SendNudgeModal";
import MarkAtRiskModal from "./MarkAtRiskModal";
import InterventionHistoryTab from "./InterventionHistoryTab";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/useAuth"; // New import

export default function OrganizationalView() {
  const [users, setUsers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('');
  const [filters, setFilters] = useState({
    minScore: 0,
    department: 'all',
    roleLevel: 'all',
    searchQuery: ''
  });
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const { user } = useAuth(); // Replaced useState with useAuth hook

  // New intervention state
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showSendNudge, setShowSendNudge] = useState(false);
  const [showMarkAtRisk, setShowMarkAtRisk] = useState(false);
  const [targetUser, setTargetUser] = useState(null); // Can be a single user object or an array of user objects
  const [activeTab, setActiveTab] = useState('overview');


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    try {
      setLoadingStep('Loading organizational data...');
      
      // Try using the backend function first for better performance and security
      try {
        const response = await base44.functions.invoke('getOrganizationalAnalytics');
        
        if (response.data?.success) {
          const { users: loadedUsers, assessments: loadedAssessments, cohorts: loadedCohorts } = response.data.data;
          
          setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
          setAssessments(Array.isArray(loadedAssessments) ? loadedAssessments : []);
          setCohorts(Array.isArray(loadedCohorts) ? loadedCohorts : []);
          
          setLoadingStep('Complete!');
        } else {
          // If the backend function returned an explicit failure
          throw new Error(response.data?.error || 'Backend analytics function failed without specific error message.');
        }
      } catch (backendError) {
        // Backend function call failed (e.g., network error, function execution error, or explicit throw above)
        console.warn('Backend analytics function failed, falling back to direct entity access:', backendError);
        toast.info('Analytics service unavailable, loading data directly (this may take longer).');
        
        // Fallback to direct entity access with individual error handling
        setLoadingStep('Loading individual data sources...');
        const [usersResult, assessmentsResult, cohortsResult] = await Promise.allSettled([
          base44.entities.User.list(),
          base44.entities.Assessment.list(),
          base44.entities.Cohort.list()
        ]);

        const loadedUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
        const loadedAssessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
        const loadedCohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];

        setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
        setAssessments(Array.isArray(loadedAssessments) ? loadedAssessments : []);
        setCohorts(Array.isArray(loadedCohorts) ? loadedCohorts : []);

        if (usersResult.status === 'rejected') {
          console.error('Failed to load users:', usersResult.reason);
          toast.error('Failed to load user data.');
        }
        if (assessmentsResult.status === 'rejected') {
          console.error('Failed to load assessments:', assessmentsResult.reason);
          toast.error('Failed to load assessment data.');
        }
        if (cohortsResult.status === 'rejected') {
          console.error('Failed to load cohorts:', cohortsResult.reason);
          toast.error('Failed to load cohort data.');
        }
        
        setLoadingStep('Complete!');
      }
    } catch (error) {
      // General error catch for any unhandled errors during the entire process
      console.error('Critical error loading organizational data:', error);
      toast.error('A critical error occurred while loading data. Please refresh the page.');
      
      // Ensure state is cleared or reset on critical failure
      setUsers([]);
      setAssessments([]);
      setCohorts([]);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // PERFORMANCE FIX: Memoize expensive calculations
  const metrics = useMemo(() => {
    const leaders = users.filter(u => u.app_role && u.app_role.startsWith('User Level'));
    const leaderAssessments = assessments.filter(a =>
      leaders.some(l => l.email === a.email)
    );

    const totalLeaders = leaders.length;
    const avgScore = leaderAssessments.length > 0
      ? Math.round(leaderAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / leaderAssessments.length)
      : 0;

    const distribution = {
      expert: leaderAssessments.filter(a => a.overall_pct >= 85).length,
      proficient: leaderAssessments.filter(a => a.overall_pct >= 70 && a.overall_pct < 85).length,
      developing: leaderAssessments.filter(a => a.overall_pct >= 55 && a.overall_pct < 70).length,
      needsSupport: leaderAssessments.filter(a => a.overall_pct < 55).length
    };

    const competencyAverages = {
      decisionMaking: Math.round(leaderAssessments.reduce((sum, a) => sum + (a.dm_pct || 0), 0) / leaderAssessments.length) || 0,
      communication: Math.round(leaderAssessments.reduce((sum, a) => sum + (a.comm_pct || 0), 0) / leaderAssessments.length) || 0,
      resourceManagement: Math.round(leaderAssessments.reduce((sum, a) => sum + (a.rm_pct || 0), 0) / leaderAssessments.length) || 0,
      stakeholderManagement: Math.round(leaderAssessments.reduce((sum, a) => sum + (a.sm_pct || 0), 0) / leaderAssessments.length) || 0,
      performanceManagement: Math.round(leaderAssessments.reduce((sum, a) => sum + (a.pm_pct || 0), 0) / leaderAssessments.length) || 0,
      situationalIntelligence: Math.round(leaderAssessments.reduce((sum, a) => sum + (a.si_pct || 0), 0) / leaderAssessments.length) || 0
    };

    const successionPipeline = {
      readyNow: leaderAssessments.filter(a => a.overall_pct >= 85).length,
      nearlyReady: leaderAssessments.filter(a => a.overall_pct >= 75 && a.overall_pct < 85).length,
      developing: leaderAssessments.filter(a => a.overall_pct >= 60 && a.overall_pct < 75).length,
      building: leaderAssessments.filter(a => a.overall_pct < 60).length
    };

    return {
      totalLeaders,
      avgScore,
      distribution,
      competencyAverages,
      successionPipeline,
      assessmentCompletion: totalLeaders > 0 ? Math.round((leaderAssessments.length / totalLeaders) * 100) : 0
    };
  }, [users, assessments]);

  // PERFORMANCE FIX: Memoize filtered leaders
  const filteredLeaders = useMemo(() => {
    let filtered = users.filter(u => u.app_role && u.app_role.startsWith('User Level'));

    if (filters.minScore > 0) {
      filtered = filtered.filter(u => {
        const assessment = assessments.find(a => a.email === u.email);
        return assessment && assessment.overall_pct >= filters.minScore;
      });
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(u => u.department === filters.department);
    }

    if (filters.roleLevel !== 'all') {
      filtered = filtered.filter(u => u.role_level === filters.roleLevel);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.current_role?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, assessments, filters]);

  const getLeaderWithAssessment = useCallback((leader) => {
    const assessment = assessments.find(a => a.email === leader.email);
    return { ...leader, assessment };
  }, [assessments]);

  const handleSelectUser = (userEmail, isChecked) => {
    setSelectedUsers(prev =>
      isChecked ? [...prev, userEmail] : prev.filter(e => e !== userEmail)
    );
  };

  const handleSelectAll = (isChecked) => {
    // Only select/deselect users currently displayed on the first page (max 50)
    setSelectedUsers(isChecked ? filteredLeaders.slice(0, 50).map(l => l.email) : []);
  };

  const handleSingleAction = (action, leader) => {
    setTargetUser(leader);
    if (action === 'send_nudge') setShowSendNudge(true);
    if (action === 'mark_at_risk') setShowMarkAtRisk(true);
    // For actions without dedicated modals, show a toast
    if (action === 'assign_learning') toast.info(`Assigning learning to ${leader.full_name}`);
    if (action === 'create_goal') toast.info(`Creating goal for ${leader.full_name}`);
    if (action === 'schedule_1on1') toast.info(`Scheduling 1-on-1 with ${leader.full_name}`);
  };

  const handleBulkAction = (action) => {
    const usersToTarget = filteredLeaders.filter(l => selectedUsers.includes(l.email));
    if (usersToTarget.length === 0) {
      toast.error("Please select at least one leader for bulk action.");
      return;
    }
    setTargetUser(usersToTarget); // targetUser will now be an array of users
    if (action === 'send_nudge') setShowSendNudge(true);
    // For actions without dedicated modals, show a toast
    if (action === 'assign_learning') toast.info(`Assigning learning to ${usersToTarget.length} leaders.`);
    if (action === 'create_goals') toast.info(`Creating goals for ${usersToTarget.length} leaders.`);
    if (action === 'schedule_1on1s') toast.info(`Scheduling 1-on-1s with ${usersToTarget.length} leaders.`);
  };

  const closeAllModals = () => {
    setShowSendNudge(false);
    setShowMarkAtRisk(false);
    setTargetUser(null);
    setSelectedUsers([]); // Clear selection after closing modals, especially for bulk actions
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{loadingStep}</h3>
        <div className="flex gap-2">
          <div className={`w-2 h-2 rounded-full ${loadingStep.includes('users') || loadingStep.includes('organizational') || loadingStep.includes('individual') ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-2 h-2 rounded-full ${loadingStep.includes('assessments') || loadingStep.includes('organizational') || loadingStep.includes('individual') ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-2 h-2 rounded-full ${loadingStep.includes('cohorts') || loadingStep.includes('organizational') || loadingStep.includes('individual') ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Organizational Overview</TabsTrigger>
            <TabsTrigger value="interventions">My Interventions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Leaders</p>
                      <p className="text-3xl font-bold text-gray-900">{metrics.totalLeaders}</p>
                    </div>
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">{metrics.assessmentCompletion}% assessed</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Leadership Score</p>
                      <p className="text-3xl font-bold text-emerald-600">{metrics.avgScore}%</p>
                    </div>
                    <BarChart3 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Organizational average</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ready for Promotion</p>
                      <p className="text-3xl font-bold text-purple-600">{metrics.successionPipeline.readyNow}</p>
                    </div>
                    <Award className="w-10 h-10 text-purple-600" />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Score ≥ 85%</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Need Support</p>
                      <p className="text-3xl font-bold text-red-600">{metrics.distribution.needsSupport}</p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-red-600" />
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Score &lt; 55%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leadership Distribution */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Leadership Effectiveness Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{metrics.distribution.expert}</p>
                    <p className="text-sm text-gray-600">Expert (85-100%)</p>
                    <p className="text-xs text-gray-500 mt-1">{Math.round((metrics.distribution.expert / metrics.totalLeaders) * 100)}% of leaders</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{metrics.distribution.proficient}</p>
                    <p className="text-sm text-gray-600">Proficient (70-84%)</p>
                    <p className="text-xs text-gray-500 mt-1">{Math.round((metrics.distribution.proficient / metrics.totalLeaders) * 100)}% of leaders</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{metrics.distribution.developing}</p>
                    <p className="text-sm text-gray-600">Developing (55-69%)</p>
                    <p className="text-xs text-gray-500 mt-1">{Math.round((metrics.distribution.developing / metrics.totalLeaders) * 100)}% of leaders</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{metrics.distribution.needsSupport}</p>
                    <p className="text-sm text-gray-600">Needs Support (&lt;55%)</p>
                    <p className="text-xs text-gray-500 mt-1">{Math.round((metrics.distribution.needsSupport / metrics.totalLeaders) * 100)}% of leaders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competency Heatmap */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Organizational Competency Averages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.competencyAverages).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize text-gray-700">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center gap-3 flex-1 max-w-md">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-1000 ${
                              value >= 80 ? 'bg-green-500' :
                              value >= 70 ? 'bg-blue-500' :
                              value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${value}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold w-12 text-right">{value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Succession Pipeline */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Succession Readiness Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{metrics.successionPipeline.readyNow}</p>
                    <p className="text-sm text-gray-700 font-medium">Ready Now</p>
                    <p className="text-xs text-gray-500 mt-1">Score ≥ 85%</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{metrics.successionPipeline.nearlyReady}</p>
                    <p className="text-sm text-gray-700 font-medium">Nearly Ready</p>
                    <p className="text-xs text-gray-500 mt-1">6-12 months</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                    <TrendingUp className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">{metrics.successionPipeline.developing}</p>
                    <p className="text-sm text-gray-700 font-medium">Developing</p>
                    <p className="text-xs text-gray-500 mt-1">12-18 months</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
                    <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-600">{metrics.successionPipeline.building}</p>
                    <p className="text-sm text-gray-700 font-medium">Building</p>
                    <p className="text-xs text-gray-500 mt-1">18+ months</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filters and Leader List with Interventions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filter Leaders
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{filteredLeaders.length} results</Badge>
                    {filteredLeaders.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-leaders"
                          checked={selectedUsers.length > 0 && selectedUsers.length === filteredLeaders.slice(0, 50).length}
                          onCheckedChange={handleSelectAll}
                        />
                        <label htmlFor="select-all-leaders" className="text-sm text-gray-600">Select All (Page)</label>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <Input
                    placeholder="Search by name or email..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                  />

                  <Select value={String(filters.minScore)} onValueChange={(value) => setFilters({...filters, minScore: Number(value)})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Min Score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Scores</SelectItem>
                      <SelectItem value="85">Expert (85%+)</SelectItem>
                      <SelectItem value="70">Proficient (70%+)</SelectItem>
                      <SelectItem value="55">Developing (55%+)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.roleLevel} onValueChange={(value) => setFilters({...filters, roleLevel: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Leadership Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="leading_others">Leading Others</SelectItem>
                      <SelectItem value="leading_managers">Leading Managers</SelectItem>
                      <SelectItem value="leading_functions">Leading Functions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Leader List */}
                <div className="space-y-3 mt-6">
                  {filteredLeaders.slice(0, 50).map((leader, idx) => {
                    const leaderData = getLeaderWithAssessment(leader);
                    const assessment = leaderData.assessment;
                    const isSelected = selectedUsers.includes(leader.email);

                    return (
                      <motion.div
                        key={leader.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`p-4 border rounded-lg hover:shadow-md transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectUser(leader.email, checked)}
                            onClick={(e) => e.stopPropagation()} // Prevent card's onClick from firing
                            aria-label={`Select ${leader.full_name}`}
                          />

                          <div
                            className="flex items-center justify-between flex-1 cursor-pointer"
                            onClick={() => setSelectedUserEmail(leader.email)} // This opens the UserDetailPanel
                          >
                            <div>
                              <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                {leader.full_name}
                              </h4>
                              <p className="text-sm text-gray-600">{leader.email}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">{leader.app_role}</Badge>
                                {leader.department && <Badge variant="outline" className="text-xs">{leader.department}</Badge>}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                {assessment ? (
                                  <>
                                    <p className="text-2xl font-bold text-blue-600">{assessment.overall_pct}%</p>
                                    <p className="text-sm text-gray-600">Leadership Score</p>
                                    <Badge className={`mt-2 ${
                                      assessment.overall_pct >= 85 ? 'bg-green-100 text-green-800' :
                                      assessment.overall_pct >= 70 ? 'bg-blue-100 text-blue-800' :
                                      assessment.overall_pct >= 55 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {assessment.archetype_label}
                                    </Badge>
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-xs">No Assessment</Badge>
                                )}
                              </div>

                              {/* New: InterventionActionsMenu */}
                              <InterventionActionsMenu
                                user={leader}
                                onAssignLearning={() => handleSingleAction('assign_learning', leader)}
                                onCreateGoal={() => handleSingleAction('create_goal', leader)}
                                onSchedule1on1={() => handleSingleAction('schedule_1on1', leader)}
                                onSendNudge={() => handleSingleAction('send_nudge', leader)}
                                onMarkAtRisk={() => handleSingleAction('mark_at_risk', leader)}
                                viewContext="organizational"
                              />

                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-blue-50"
                                onClick={(e) => { // Added onClick for explicit button to open detail panel
                                  e.stopPropagation(); // Prevent card's onClick from triggering twice
                                  setSelectedUserEmail(leader.email);
                                }}
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {filteredLeaders.length > 50 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">
                        Showing 50 of {filteredLeaders.length} leaders.
                        <Button variant="link" className="ml-2">Load more</Button>
                      </p>
                    </div>
                  )}

                  {filteredLeaders.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-600">No leaders found matching your filters.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interventions">
            {/* The managerEmail prop would typically come from an authentication context */}
            <InterventionHistoryTab managerEmail={user?.email} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedUsers.length}
          onClearSelection={() => setSelectedUsers([])}
          onBulkAssignLearning={() => handleBulkAction('assign_learning')}
          onBulkCreateGoals={() => handleBulkAction('create_goals')}
          onBulkSendNudge={() => handleBulkAction('send_nudge')}
          onBulkSchedule1on1s={() => handleBulkAction('schedule_1on1s')}
        />
      )}

      {/* User Detail Panel */}
      <AnimatePresence>
        {selectedUserEmail && (
          <UserDetailPanel
            userEmail={selectedUserEmail}
            onClose={() => setSelectedUserEmail(null)}
            viewContext="organizational"
          />
        )}
      </AnimatePresence>

      {/* Intervention Modals */}
      {showSendNudge && (
        <SendNudgeModal
          open={showSendNudge}
          onClose={closeAllModals}
          onSuccess={closeAllModals}
          // Ensure 'users' prop is always an array for the SendNudgeModal
          users={Array.isArray(targetUser) ? targetUser : (targetUser ? [targetUser] : [])}
          senderName={user?.full_name || user?.email}
        />
      )}

      {showMarkAtRisk && targetUser && !Array.isArray(targetUser) && ( // MarkAtRisk is typically for a single user
        <MarkAtRiskModal
          open={showMarkAtRisk}
          onClose={closeAllModals}
          onSuccess={() => {
            closeAllModals();
            loadData(); // Potentially reload data to reflect the 'at-risk' status
          }}
          user={targetUser}
          flaggedBy={user?.email}
        />
      )}
    </>
  );
}
