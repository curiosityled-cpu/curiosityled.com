
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Map,
  TrendingUp,
  ArrowRight,
  Search,
  Filter,
  Sparkles,
  Target,
  Clock,
  Award,
  Info,
  Loader2,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import { calculateReadinessScore } from "@/components/lib/careerPathReadiness";
import { usePageContext } from "../Layout"; // Changed to uppercase 'Layout'

function CareerPathExplorer() {
  const { user } = useAuth();
  const { updatePageContext } = usePageContext();
  const [careerPaths, setCareerPaths] = useState([]);
  const [filteredPaths, setFilteredPaths] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    pathType: "all",
    department: "all",
    difficultyLevel: "all",
    sortBy: "best_fit"
  });

  // AI Recommendations State
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState(null); // Renamed from assessmentData
  const [hasAssessment, setHasAssessment] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null); // New state for the role being targeted for readiness
  const [readinessData, setReadinessData] = useState(null); // New state for readiness score and gaps

  useEffect(() => {
    loadData();
  }, []);

  // Effect to calculate readiness data whenever selectedRole or currentAssessment changes
  useEffect(() => {
    if (selectedRole && currentAssessment) {
      // `calculateReadinessScore` typically needs the user's assessment and the target role's required competencies.
      // `selectedRole` is assumed to be the full target role object here.
      const readiness = calculateReadinessScore(currentAssessment, selectedRole);
      setReadinessData(readiness);
    } else {
      setReadinessData(null);
    }
  }, [selectedRole, currentAssessment]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [careerPaths, searchTerm, filters, aiRecommendations]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pathsData, rolesData, assessments] = await Promise.all([
        base44.entities.CareerPath.list(),
        base44.entities.Role.list(),
        base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1)
      ]);

      setCareerPaths(pathsData);
      setRoles(rolesData);

      if (assessments.length > 0) {
        setCurrentAssessment(assessments[0]); // Renamed from setAssessmentData
        setHasAssessment(true);
        // Auto-generate recommendations if available in cache
        loadCachedRecommendations();
      }

      // Default selectedRole for context (e.g., the 'to' role of the first career path, if available)
      if (pathsData.length > 0 && rolesData.length > 0) {
          const firstPathToRoleId = pathsData[0].to_role_id;
          const defaultTargetRole = rolesData.find(r => r.id === firstPathToRoleId);
          if (defaultTargetRole) {
              setSelectedRole(defaultTargetRole);
          }
      }

    } catch (error) {
      console.error('Error loading career paths:', error);
      toast.error('Failed to load career paths');
    } finally {
      setLoading(false);
    }
  };

  const loadCachedRecommendations = () => {
    if (!user?.email) return;

    const cacheKey = `ai_career_recommendations_${user.email}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        // Cache valid for 24 hours
        if (age < 24 * 60 * 60 * 1000) {
          setAiRecommendations(data);
        }
      } catch (error) {
        console.error('Error loading cached recommendations:', error);
      }
    }
  };

  const generateAIRecommendations = async () => {
    if (!hasAssessment) {
      toast.error('Please complete your leadership assessment first');
      return;
    }

    setRecommendationsLoading(true);
    try {
      // Prepare data for AI
      const pathsForAI = careerPaths.map(path => {
        const fromRole = roles.find(r => r.id === path.from_role_id);
        const toRole = roles.find(r => r.id === path.to_role_id);

        return {
          id: path.id,
          title: path.title,
          brief_description: path.brief_description,
          path_type: path.path_type,
          from_role: fromRole?.title || '',
          to_role: toRole?.title || '',
          difficulty_level: path.difficulty_level,
          typical_duration_months: path.typical_duration_months,
          core_competencies: path.core_competencies || []
        };
      });

      const prompt = `You are a career development AI advisor. Analyze this leader's profile and recommend the BEST career paths for them.

**User Profile:**
- Current Role: ${user.current_role || 'N/A'}
- Department: ${user.department || 'N/A'}
- Assessment Archetype: ${currentAssessment.archetype_label || 'N/A'}
- Overall Score: ${currentAssessment.overall_pct || 0}%
- Situational Intelligence: ${currentAssessment.si_pct || 0}%
- Decision Making: ${currentAssessment.dm_pct || 0}%
- Communication: ${currentAssessment.comm_pct || 0}%
- Resource Management: ${currentAssessment.rm_pct || 0}%
- Stakeholder Management: ${currentAssessment.sm_pct || 0}%
- Performance Management: ${currentAssessment.pm_pct || 0}%

**Available Career Paths:**
${JSON.stringify(pathsForAI, null, 2)}

**Task:**
Recommend the TOP 3 most suitable career paths for this user. For each recommendation, provide:
1. The path ID
2. A compelling reason why this path is a good fit (2-3 sentences)
3. A match score (0-100) indicating how well aligned this path is with their profile

Consider:
- Their current strengths (high assessment scores)
- Alignment with their current role and department
- Realistic difficulty levels
- Competency requirements that match their profile

Return your response as a JSON array of objects with these fields: path_id, reason, match_score`;

      const response = await base44.integrations.invoke('Core', 'InvokeLLM', {
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path_id: { type: "string" },
                  reason: { type: "string" },
                  match_score: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (response.recommendations && response.recommendations.length > 0) {
        setAiRecommendations(response.recommendations);

        // Cache recommendations
        const cacheKey = `ai_career_recommendations_${user.email}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          data: response.recommendations,
          timestamp: Date.now()
        }));

        toast.success('AI recommendations generated!');
      } else {
        toast.error('No recommendations could be generated');
      }
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...careerPaths];

    // Apply search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(path =>
        path.title.toLowerCase().includes(term) ||
        path.description?.toLowerCase().includes(term) ||
        path.brief_description?.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.pathType !== "all") {
      filtered = filtered.filter(p => p.path_type === filters.pathType);
    }

    if (filters.department !== "all") {
      filtered = filtered.filter(p => {
        const toRole = roles.find(r => r.id === p.to_role_id);
        return toRole?.department === filters.department;
      });
    }

    if (filters.difficultyLevel !== "all") {
      filtered = filtered.filter(p => p.difficulty_level === filters.difficultyLevel);
    }

    // Apply sorting
    if (filters.sortBy === "best_fit" && aiRecommendations) {
      // Sort by AI recommendations first, then by readiness score
      filtered.sort((a, b) => {
        const aRec = aiRecommendations.find(r => r.path_id === a.id);
        const bRec = aiRecommendations.find(r => r.path_id === b.id);

        if (aRec && !bRec) return -1;
        if (!aRec && bRec) return 1;
        if (aRec && bRec) return bRec.match_score - aRec.match_score;
        return 0;
      });
    } else if (filters.sortBy === "duration") {
      filtered.sort((a, b) => a.typical_duration_months - b.typical_duration_months);
    } else if (filters.sortBy === "difficulty") {
      const diffOrder = { easy: 0, moderate: 1, challenging: 2, high_stretch: 3 };
      filtered.sort((a, b) => diffOrder[a.difficulty_level] - diffOrder[b.difficulty_level]);
    }

    setFilteredPaths(filtered);
  }, [careerPaths, searchTerm, filters, aiRecommendations, roles]);

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.title || 'Unknown Role';
  };

  const getDepartments = () => {
    const depts = new Set(roles.map(r => r.department).filter(Boolean));
    return Array.from(depts);
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      moderate: 'bg-blue-100 text-blue-800',
      challenging: 'bg-orange-100 text-orange-800',
      high_stretch: 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  const getPathTypeIcon = (type) => {
    return type === 'vertical' ? TrendingUp : ArrowRight;
  };

  const isRecommended = (pathId) => {
    return aiRecommendations?.some(r => r.path_id === pathId);
  };

  const getRecommendation = (pathId) => {
    return aiRecommendations?.find(r => r.path_id === pathId);
  };

  // Enhanced: Build comprehensive context for Atreus
  const buildAICoachContext = useCallback(() => {
    if (!selectedRole || !currentAssessment) return {};

    const readinessScore = readinessData?.readiness_score || 0;
    const gapCount = readinessData?.gap_areas?.length || 0;
    const strengthCount = readinessData?.strong_areas?.length || 0;

    return {
      current_filters: {
        selected_role: selectedRole.title,
        selected_role_level: selectedRole.level,
        department: selectedRole.department
      },
      visible_data_summary: {
        readiness_score: readinessScore,
        readiness_level: readinessScore >= 85 ? 'ready_now' :
                         readinessScore >= 70 ? 'nearly_ready' :
                         readinessScore >= 50 ? 'developing' : 'early_stage',
        gap_count: gapCount,
        strength_count: strengthCount,
        career_paths_available: careerPaths.length,
        has_current_assessment: !!currentAssessment,
        current_role: user?.current_role,
        target_role: selectedRole.title
      },
      selected_items: {
        role: {
          id: selectedRole.id,
          title: selectedRole.title,
          level: selectedRole.level,
          department: selectedRole.department
        }
      },
      modal_focus: null,
      page_specific_insights: {
        readiness_assessment_complete: !!readinessData,
        has_development_path: careerPaths.length > 0,
        ready_for_transition: readinessScore >= 85,
        needs_significant_development: readinessScore < 50,
        top_gap_area: readinessData?.gap_areas?.[0]?.name || null,
        top_strength_area: readinessData?.strong_areas?.[0]?.name || null
      },
      available_actions: getAvailableActions(),
      viewing_focus: 'career_path_details'
    };
  }, [selectedRole, currentAssessment, readinessData, careerPaths, user, roles]); // Added roles as dependency for selectedRole info

  const getAvailableActions = useCallback(() => {
    const actions = [];

    if (!selectedRole) {
      actions.push({
        action: 'select_target_role',
        description: 'Choose a target role to explore career paths'
      });
      return actions;
    }

    const readinessScore = readinessData?.readiness_score || 0;

    if (readinessScore < 50) {
      actions.push({
        action: 'create_development_plan',
        description: 'Create an intensive development plan to close gaps'
      });
    }

    if (readinessData?.gap_areas?.length > 0) {
      actions.push({
        action: 'find_gap_resources',
        description: `Find learning resources for ${readinessData.gap_areas.length} gap areas`
      });
    }

    if (careerPaths.length > 0) {
      actions.push({
        action: 'view_career_path_details',
        description: 'Explore detailed career path recommendations'
      });
    }

    if (readinessScore >= 70) {
      actions.push({
        action: 'discuss_with_manager',
        description: 'Schedule discussion with manager about career progression'
      });
    }

    actions.push({
      action: 'browse_other_roles',
      description: 'Explore other career opportunities'
    });

    return actions;
  }, [selectedRole, readinessData, careerPaths]);

  // Update context when role selection or readiness data changes
  useEffect(() => {
    if (selectedRole && currentAssessment) {
      const context = buildAICoachContext();
      updatePageContext(context);
    } else {
        // Clear context if prerequisites are not met
        updatePageContext({});
    }
  }, [selectedRole, readinessData, careerPaths, currentAssessment, buildAICoachContext, updatePageContext]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading career paths...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Career Path Explorer
              </h1>
              <p className="text-gray-600">
                Discover and plan your leadership career trajectory
              </p>
            </div>
            {hasAssessment && (
              <Button
                onClick={generateAIRecommendations}
                disabled={recommendationsLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {recommendationsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : aiRecommendations ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh AI Picks
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get AI Recommendations
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Assessment Required Alert */}
          {!hasAssessment && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>Complete your assessment</strong> to unlock AI-powered career path recommendations tailored to your leadership profile
                  </span>
                  <Link to={createPageUrl("Assessment")}>
                    <Button size="sm" variant="outline" className="ml-4">
                      Take Assessment
                      <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* AI Recommendations Summary */}
          {aiRecommendations && aiRecommendations.length > 0 && (
            <Alert className="border-purple-200 bg-purple-50">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-900">
                <strong>AI found {aiRecommendations.length} personalized career paths</strong> that align with your leadership profile and strengths
              </AlertDescription>
            </Alert>
          )}
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search career paths..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best_fit">Best Fit (AI + Readiness)</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="difficulty">Difficulty Level</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.pathType} onValueChange={(value) => setFilters(prev => ({ ...prev, pathType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Path Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vertical">Vertical (Promotion)</SelectItem>
                <SelectItem value="lateral">Lateral (Cross-functional)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.difficultyLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, difficultyLevel: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="challenging">Challenging</SelectItem>
                <SelectItem value="high_stretch">High Stretch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {getDepartments().length > 0 && (
            <div className="mt-4">
              <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {getDepartments().map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </motion.div>

        {/* Career Paths Grid */}
        <AnimatePresence mode="wait">
          {filteredPaths.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No Career Paths Found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || filters.pathType !== "all" || filters.department !== "all" || filters.difficultyLevel !== "all"
                      ? 'Try adjusting your search or filters'
                      : 'Career paths will appear here once created by administrators'
                    }
                  </p>
                  {(searchTerm || filters.pathType !== "all" || filters.department !== "all" || filters.difficultyLevel !== "all") && (
                    <Button
                      onClick={() => {
                        setSearchTerm("");
                        setFilters({ pathType: "all", department: "all", difficultyLevel: "all", sortBy: "best_fit" });
                      }}
                      variant="outline"
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredPaths.map((path, index) => {
                const fromRole = roles.find(r => r.id === path.from_role_id);
                const toRole = roles.find(r => r.id === path.to_role_id);
                const PathIcon = getPathTypeIcon(path.path_type);
                const recommendation = getRecommendation(path.id);
                const recommended = isRecommended(path.id);

                return (
                  <motion.div
                    key={path.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`${createPageUrl("CareerPathDetails")}?pathId=${path.id}`}>
                      <Card className={`border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer h-full ${
                        recommended ? 'ring-2 ring-purple-500' : ''
                      }`}>
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <PathIcon className="w-6 h-6 text-blue-600" />
                            {recommended && (
                              <Badge className="bg-purple-600 text-white">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Recommended
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{path.title}</CardTitle>
                          <p className="text-sm text-gray-600 mt-2">
                            {path.brief_description}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">From:</span>
                              <Badge variant="outline">{fromRole?.title || 'N/A'}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">To:</span>
                              <Badge variant="outline">{toRole?.title || 'N/A'}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Duration:</span>
                              <div className="flex items-center gap-1 text-gray-900">
                                <Clock className="w-3 h-3" />
                                {path.typical_duration_months} months
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Difficulty:</span>
                              <Badge className={getDifficultyColor(path.difficulty_level)}>
                                {path.difficulty_level?.replace('_', ' ')}
                              </Badge>
                            </div>

                            {/* AI Recommendation Reason */}
                            {recommendation && (
                              <div className="mt-4 pt-4 border-t border-purple-100">
                                <div className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-purple-900 mb-1">
                                      Why this fits you:
                                    </p>
                                    <p className="text-xs text-purple-800">
                                      {recommendation.reason}
                                    </p>
                                    <div className="mt-2">
                                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                                        <Award className="w-3 h-3 mr-1" />
                                        {recommendation.match_score}% Match
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <Button className="w-full mt-4" variant="outline">
                              View Details
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-6 mt-8"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="p-6">
              <Target className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Plan Your Next Move
              </h3>
              <p className="text-sm text-gray-600">
                Each career path shows you exactly what competencies you need,
                recommended learning resources, and realistic timelines to help you prepare for your next role.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-teal-50">
            <CardContent className="p-6">
              <Sparkles className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                AI-Powered Guidance
              </h3>
              <p className="text-sm text-gray-600">
                Get personalized path recommendations based on your assessment results,
                current role, and leadership strengths. Let AI guide your career decisions.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default withAuthProtection(CareerPathExplorer);
