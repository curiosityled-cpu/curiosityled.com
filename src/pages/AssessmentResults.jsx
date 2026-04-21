import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "@/entities/User";
import { Assessment } from "@/entities/Assessment";
import { Brain, AlertCircle, Loader2, ArrowRight, FileText, Download, BarChart3, ClipboardList, CheckCircle, TrendingUp, Users, Route } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { base44 } from "@/api/base44Client";
import { usePageContext } from "../Layout";
import { useAuth } from "@/components/useAuth";
import TeamAssessmentsView from "@/components/dashboard/assessments/TeamAssessmentsView";
import PageHeader from "@/components/common/PageHeader";

import ResultsDashboard from "../components/results/ResultsDashboard";
import CompetencyRadarChart from "../components/results/CompetencyRadarChart";
import SituationalIntelligenceCard from "../components/results/SituationalIntelligenceCard";
import DevelopmentGoals from "../components/results/DevelopmentGoals";
import AIInsightsCard from "../components/results/AIInsightsCard";
import CompetencyExplanations from "../components/results/CompetencyExplanations";
import SuccessionReadinessCard from "../components/results/SuccessionReadinessCard";
import ArchetypeProfileCard from "../components/results/ArchetypeProfileCard";
import ProficiencyScoresCard from "../components/results/ProficiencyScoresCard";
import DevelopmentInsightsCard from "../components/results/DevelopmentInsightsCard";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import AssignLearningModal from "@/components/learning/AssignLearningModal";

function AssessmentResults() {
  const { updatePageContext } = usePageContext();
  const { appRole, hasTeamAccess } = useAuth();

  const [user, setUser] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [activeView, setActiveView] = useState('results');
  const [refreshing, setRefreshing] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);

  // Team Leaders (User Level 2) can see team assessments
  const canSeeTeamAssessments = appRole === 'User Level 2' || hasTeamAccess;

  // Get role display name
  const roleDisplayName = {
    'User Level 1': 'User',
    'User Level 2': 'Team Leader',
    'Analyst': 'Analyst',
    'Admin Level 1': 'Program Administrator',
    'Admin Level 2': 'HR Administrator',
    'Super Administrator': 'Super Administrator',
    'Partner Business Administrator': 'Partner Business Administrator',
    'Platform Admin': 'Platform Administrator'
  }[appRole] || appRole;

  // Available assessments that users can take (moved up to be available for getHeaderContent)
  const availableAssessments = [
    {
      id: 'leadership-index',
      title: 'Leadership Index Assessment',
      description: 'Comprehensive evaluation of your leadership capabilities across 6 core competencies.',
      duration: '20-30 min',
      status: assessment ? 'completed' : 'available',
      url: 'LeadershipAssessment',
      icon: Brain,
      color: '#A25DDC'
    },
    {
      id: 'situational-leadership',
      title: 'Situational Leadership Style',
      description: 'Discover your preferred leadership style and how to adapt to different situations.',
      duration: '15-20 min',
      status: 'coming_soon',
      url: null,
      icon: BarChart3,
      color: '#0202ff'
    },
    {
      id: 'emotional-intelligence',
      title: 'Emotional Intelligence (EQ)',
      description: 'Measure your emotional awareness, empathy, and interpersonal skills.',
      duration: '15-20 min',
      status: 'coming_soon',
      url: null,
      icon: TrendingUp,
      color: '#10B981'
    }
  ];

  // When Typeform redirects here with ?response_id=..., poll for the new assessment
  // and redirect to /my-leadership once it's ready
  const pollingRef = useRef(null);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const responseId = urlParams.get('response_id');
    if (!responseId) {
      loadAssessmentData();
      return;
    }

    // Typeform just redirected here — start polling for the new assessment
    setLoading(true);
    const startTime = Date.now();
    pollingRef.current = setInterval(async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser?.email) return;
        const assessments = await base44.entities.Assessment.filter(
          { email: currentUser.email },
          '-created_date',
          1
        );
        if (assessments.length > 0) {
          const age = Date.now() - new Date(assessments[0].created_date).getTime();
          if (age < 10 * 60 * 1000) { // created within last 10 min
            clearInterval(pollingRef.current);
            window.location.href = '/my-leadership';
            return;
          }
        }
        if (Date.now() - startTime > 90000) {
          clearInterval(pollingRef.current);
          loadAssessmentData(); // fallback: just show whatever we have
        }
      } catch (e) { /* keep polling */ }
    }, 3000);

    return () => clearInterval(pollingRef.current);
  }, []);

  const loadAssessmentData = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (!currentUser?.email) {
        throw new Error('User email not found');
      }

      const assessments = await Assessment.filter(
        { email: currentUser.email },
        '-created_date',
        1
      );

      if (assessments.length === 0) {
        setError('no_assessment');
        setLoading(false);
        return;
      }

      const latestAssessment = assessments[0];

      const requiredFields = [
        'overall_pct',
        'si_pct',
        'dm_pct',
        'comm_pct',
        'rm_pct',
        'sm_pct',
        'pm_pct',
        'archetype_label'
      ];

      const missingFields = requiredFields.filter(field => {
        const value = latestAssessment[field];
        return value === undefined || value === null;
      });

      if (missingFields.length > 0) {
        console.warn('Assessment missing fields:', missingFields);
      }

      setAssessment(latestAssessment);
      setProcessingComplete(true);
    } catch (err) {
      console.error('Error loading assessment data:', err);
      setError('load_error');
      toast.error('Failed to load assessment results');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!assessment?.id) {
      toast.error('No assessment data available');
      return;
    }

    setExportingPDF(true);
    try {
      // Try Leadership Index PDF export first if it's a new submission
      const submissionId = assessment.id;
      const response = await base44.functions.invoke('exportLeadershipIndexPDF', {
        submissionId: submissionId
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leadership-index-${user.full_name.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const retryLoad = () => {
    loadAssessmentData();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssessmentData();
    setRefreshing(false);
  };

  const handleCreateGoalFromInsight = (insight) => {
    setSelectedInsight(insight);
    setShowGoalModal(true);
  };

  const handleAssignLearningFromInsight = (insight) => {
    setSelectedInsight(insight);
    setShowLearningModal(true);
  };

  const handleGoalSubmit = async (goalData) => {
    try {
      const newGoal = {
        ...goalData,
        linked_competency_ids: selectedInsight?.competency_id ? [selectedInsight.competency_id] : [],
        description: goalData.description || selectedInsight?.recommendation || ''
      };
      
      await base44.entities.Goal.create(newGoal);
      toast.success('Goal created from assessment insight!');
      setShowGoalModal(false);
      setSelectedInsight(null);
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const csvData = [
        ['Assessment Results Export'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Overall Score', assessment?.overall_pct || 'N/A'],
        ['Situational Intelligence', assessment?.si_pct || 'N/A'],
        ['Decision Making', assessment?.dm_pct || 'N/A'],
        ['Communication', assessment?.comm_pct || 'N/A'],
        ['Resource Management', assessment?.rm_pct || 'N/A'],
        ['Stakeholder Management', assessment?.sm_pct || 'N/A'],
        ['Performance Management', assessment?.pm_pct || 'N/A'],
        ['Archetype', assessment?.archetype_label || 'N/A'],
        ['Band', assessment?.band_overall || 'N/A']
      ];

      const csvContent = csvData.map(row => 
        Array.isArray(row) ? row.join(',') : row
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-results-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  // Adaptive header content based on active tab
  const getHeaderContent = () => {
    switch (activeView) {
      case 'team':
        return {
          title: 'Team Assessments',
          subtitle: "Monitor your team's assessment progress and results",
          badges: [
            { text: roleDisplayName, className: "bg-white text-[#0202ff]" },
            { text: 'Team View', className: "bg-white text-blue-600" }
          ]
        };
      case 'available':
        return {
          title: 'Available Assessments',
          subtitle: 'Explore assessments to gain deeper insights into your leadership capabilities',
          badges: [
            { text: roleDisplayName, className: "bg-white text-[#0202ff]" },
            { text: `${availableAssessments.length} Available`, className: "bg-white text-purple-600" }
          ]
        };
      default: // 'results'
        return {
          title: 'My Assessments',
          subtitle: 'View your leadership assessment results and track your growth',
          badges: [
            { text: roleDisplayName, className: "bg-white text-[#0202ff]" },
            assessment ? { text: `${assessment.overall_pct}% Overall`, className: "bg-white text-green-600" } : null,
            assessment?.archetype_label ? { text: assessment.archetype_label, className: "bg-white text-purple-600" } : null
          ].filter(Boolean)
        };
    }
  };

  const headerContent = getHeaderContent();

  // Enhanced: Build comprehensive context for Atreus
  const buildAICoachContext = () => {
    if (!assessment || !user) return {};

    const competencyScores = {
      decision_making: assessment.dm_pct,
      communication: assessment.comm_pct,
      resource_management: assessment.rm_pct,
      stakeholder_management: assessment.sm_pct,
      performance_management: assessment.pm_pct,
      situational_intelligence: assessment.si_pct
    };

    const lowestCompetency = Object.entries(competencyScores).reduce((min, [key, value]) =>
      value < min.value ? { name: key, value } : min,
      { name: 'decision_making', value: competencyScores.decision_making }
    );

    const highestCompetency = Object.entries(competencyScores).reduce((max, [key, value]) =>
      value > max.value ? { name: key, value } : max,
      { name: 'decision_making', value: competencyScores.decision_making }
    );

    return {
      current_filters: null,
      visible_data_summary: {
        assessment_date: assessment.submission_ts || assessment.created_date,
        overall_score: assessment.overall_pct,
        si_score: assessment.si_pct,
        archetype: assessment.archetype_label,
        band: assessment.band_overall,
        competency_scores: competencyScores,
        lowest_competency: lowestCompetency,
        highest_competency: highestCompetency,
        assessment_complete: processingComplete
      },
      selected_items: null,
      modal_focus: exportingPDF ? 'pdf_export' : null,
      page_specific_insights: {
        has_assessment: true,
        development_areas: [lowestCompetency.name],
        strengths: [highestCompetency.name],
        ready_for_export: processingComplete,
        succession_readiness: assessment.overall_pct >= 75 ? 'ready' :
                             assessment.overall_pct >= 60 ? 'developing' : 'needs_development'
      },
      available_actions: getAvailableActions(),
      viewing_focus: 'assessment_results'
    };
  };

  const getAvailableActions = () => {
    const actions = [];

    if (processingComplete) {
      actions.push({
        action: 'export_pdf',
        description: 'Download assessment results as PDF'
      });

      actions.push({
        action: 'create_development_plan',
        description: 'Create a personalized development plan based on results'
      });

      actions.push({
        action: 'browse_learning',
        description: 'Find learning resources for development areas'
      });

      if (assessment.overall_pct < 70) {
        actions.push({
          action: 'schedule_coaching',
          description: 'Schedule coaching session to discuss improvement strategies'
        });
      }

      actions.push({
        action: 'view_dashboard',
        description: 'Return to dashboard to track progress'
      });
    }

    return actions;
  };

  // Update context when assessment data loads or changes
  useEffect(() => {
    if (assessment && user && processingComplete) {
      const context = buildAICoachContext();
      updatePageContext(context);
    }
  }, [assessment, user, processingComplete, exportingPDF]); // Added exportingPDF to dependencies to reflect modal_focus changes


  // Render the toggle component
  const renderToggle = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
        <button
          onClick={() => setActiveView('results')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeView === 'results'
              ? 'bg-gray-100 text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          My Assessments
        </button>
        {canSeeTeamAssessments && (
          <button
            onClick={() => setActiveView('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeView === 'team'
                ? 'bg-gray-100 text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Team Assessments
          </button>
        )}
        <button
          onClick={() => setActiveView('available')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeView === 'available'
              ? 'bg-gray-100 text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Available Assessments
        </button>
      </div>
    </motion.div>
  );

  // Render Available Assessments content
  const renderAvailableAssessments = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Assessments</h2>
        <p className="text-gray-600">Explore assessments to gain deeper insights into your leadership capabilities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableAssessments.map((assessmentItem) => {
          const Icon = assessmentItem.icon;
          return (
            <motion.div
              key={assessmentItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${assessmentItem.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: assessmentItem.color }} />
                    </div>
                    {assessmentItem.status === 'completed' && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    {assessmentItem.status === 'coming_soon' && (
                      <Badge variant="outline" className="text-gray-500">
                        Coming Soon
                      </Badge>
                    )}
                    {assessmentItem.status === 'available' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Available
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{assessmentItem.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 flex-grow">{assessmentItem.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t">
                    <span className="text-xs text-gray-500">{assessmentItem.duration}</span>
                    {assessmentItem.status === 'completed' ? (
                      <Button variant="outline" size="sm" onClick={() => setActiveView('results')}>
                        View Results
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    ) : assessmentItem.status === 'available' ? (
                      <Link to={createPageUrl(assessmentItem.url)}>
                        <Button size="sm" style={{ backgroundColor: assessmentItem.color }} className="text-white">
                          Start
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  // Render No Assessment content
  const renderNoAssessment = () => (
    <div className="flex items-center justify-center">
      <Card className="max-w-lg w-full shadow-xl border-0">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-orange-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            No Assessment Found
          </h3>
          <p className="text-gray-600 mb-2">
            We couldn't find any completed assessments for your account.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Take the Leadership Index Assessment to get personalized insights into your leadership capabilities.
          </p>

          <div className="space-y-3">
            <Link to={createPageUrl("LeadershipAssessment")} className="block">
              <Button 
                className="w-full" 
                size="lg"
                style={{ backgroundColor: '#0043ef' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0038cc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0043ef'}
              >
                <Brain className="w-5 h-5 mr-2" />
                Take Assessment Now
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={retryLoad}
              className="w-full"
            >
              <Loader2 className="w-4 h-4 mr-2" />
              Check Again
            </Button>

            <Link to={createPageUrl("Dashboard")} className="block">
              <Button variant="ghost" className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-left">
            <p className="font-medium text-blue-900 mb-2">Just completed the assessment?</p>
            <p className="text-blue-700 text-xs">
              Your results may take a few moments to process. Click "Check Again" or refresh this page in 30-60 seconds.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-6"
            >
              <Brain className="w-16 h-16" style={{ color: '#0043ef' }} />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Your Results
            </h3>
            <p className="text-gray-600">
              Retrieving your leadership assessment data...
            </p>
            <div className="flex justify-center gap-1 mt-6">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#0043ef' }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error: Failed to load
  if (error === 'load_error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Unable to Load Results
            </h3>
            <p className="text-gray-600 mb-6">
              We encountered an error while loading your assessment results. Please try again.
            </p>

            <div className="space-y-3">
              <Button
                onClick={retryLoad}
                className="w-full"
                size="lg"
                style={{ backgroundColor: '#0043ef' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0038cc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0043ef'}
              >
                <Loader2 className="w-5 h-5 mr-2" />
                Try Again
              </Button>

              <Link to={createPageUrl("Dashboard")} className="block">
                <Button variant="outline" className="w-full">
                  Return to Dashboard
                </Button>
              </Link>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-left">
              <p className="font-medium text-gray-900 mb-2">Need help?</p>
              <p className="text-gray-600 text-xs">
                If the problem persists, please contact support or check your internet connection.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No assessment case - show toggle with either "no assessment" or "available" view
  if (error === 'no_assessment' || !assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            title={headerContent.title}
            subtitle={headerContent.subtitle}
            badges={headerContent.badges}
            onRefresh={handleRefresh}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            loadingRefresh={refreshing}
            loadingExportCSV={exportingCSV}
            loadingExportPDF={exportingPDF}
            headerColor="#0202ff"
          />
          {renderToggle()}
          {activeView === 'team' && canSeeTeamAssessments ? (
            <TeamAssessmentsView />
          ) : activeView === 'available' ? (
            renderAvailableAssessments()
          ) : (
            renderNoAssessment()
          )}
        </div>
      </div>
    );
  }

  const assessmentDate = assessment.submission_ts || assessment.created_date;
  const formattedDate = new Date(assessmentDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <PageHeader
          title={headerContent.title}
          subtitle={headerContent.subtitle}
          badges={headerContent.badges}
          onRefresh={handleRefresh}
          onExportCSV={activeView === 'results' ? handleExportCSV : null}
          onExportPDF={activeView === 'results' ? handleExportPDF : null}
          loadingRefresh={refreshing}
          loadingExportCSV={exportingCSV}
          loadingExportPDF={exportingPDF}
          headerColor="#0202ff"
        />

        {/* Toggle */}
        {renderToggle()}

        {/* Team Assessments View */}
        {activeView === 'team' && canSeeTeamAssessments && (
          <TeamAssessmentsView />
        )}

        {/* Available Assessments View */}
        {activeView === 'available' && renderAvailableAssessments()}

        {/* Main Results Content - only show when on results view */}
        {activeView === 'results' && (
          <>

            {/* Main Content - Full Width */}
            <div className="space-y-6">
          {/* Overview Dashboard */}
          <ResultsDashboard assessment={assessment} user={user} />

          {/* New Enhanced Results */}
          {assessment.record?.proficiency_scores && (
            <ProficiencyScoresCard proficiencyScores={assessment.record.proficiency_scores} />
          )}

          {assessment.record?.leadership_style_profile && (
            <ArchetypeProfileCard leadershipStyleProfile={assessment.record.leadership_style_profile} />
          )}

          {assessment.record?.development_insights && (
            <DevelopmentInsightsCard 
              developmentInsights={assessment.record.development_insights}
              onCreateGoal={handleCreateGoalFromInsight}
              onAssignLearning={handleAssignLearningFromInsight}
            />
          )}

          {/* SI Score and Radar Chart */}
          <div className="grid md:grid-cols-2 gap-6">
            <SituationalIntelligenceCard assessment={assessment} />
            <CompetencyRadarChart assessment={assessment} />
          </div>

          {/* Succession Readiness */}
          <SuccessionReadinessCard assessment={assessment} user={user} />

          {/* AI Insights */}
          <AIInsightsCard assessment={assessment} user={user} />

          {/* Competency Explanations */}
          <CompetencyExplanations assessment={assessment} />

          {/* Development Goals */}
          <DevelopmentGoals assessment={assessment} user={user} />

              {/* Bottom CTA */}
              <Card className="border-0 shadow-lg" style={{ backgroundColor: 'rgba(0, 67, 239, 0.05)' }}>
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Ready to Take Action?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Start your leadership development journey with personalized learning resources and coaching.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={() => {
                        // Navigate to JourneyBuilder with recommended resources
                        const lowestCompetencies = Object.entries({
                          decision_making: assessment.dm_pct,
                          communication: assessment.comm_pct,
                          resource_management: assessment.rm_pct,
                          stakeholder_management: assessment.sm_pct,
                          performance_management: assessment.pm_pct,
                          situational_intelligence: assessment.si_pct
                        })
                          .sort((a, b) => a[1] - b[1])
                          .slice(0, 2)
                          .map(([name]) => name);

                        // For now, just navigate - resources will be set based on competencies selected in journey builder
                        window.location.href = createPageUrl("JourneyBuilder");
                      }}
                      style={{ backgroundColor: '#0043ef' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0038cc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0043ef'}
                    >
                      <Route className="w-4 h-4 mr-2" />
                      Create Development Plan
                    </Button>
                    <Link to={createPageUrl("LearningLibrary")}>
                      <Button variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        Browse Learning Resources
                      </Button>
                    </Link>
                    <Link to={createPageUrl("Dashboard")}>
                      <Button variant="outline">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Action Planning Modals */}
      <CreateGoalModal
        isOpen={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setSelectedInsight(null);
        }}
        onSubmit={handleGoalSubmit}
      />

      <AssignLearningModal
        open={showLearningModal}
        onClose={() => {
          setShowLearningModal(false);
          setSelectedInsight(null);
        }}
        assignedBy={user?.email}
        onSuccess={() => {
          setShowLearningModal(false);
          setSelectedInsight(null);
        }}
      />
    </div>
  );
}

export default withAuthProtection(AssessmentResults, ['User Level 1', 'User Level 2', 'User Level 3', 'Admin Level 1', 'Admin Level 2', 'Admin Level 3']);