import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  BookOpen,
  Search,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import MultiSelectFilter from "../components/learning/MultiSelectFilter";
import AssignLearningModal from "../components/learning/AssignLearningModal";
import ResourceCard from "../components/learning/ResourceCard";
import AddToJourneyModal from "../components/development/AddToJourneyModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePageContext } from "../Layout";

function LearningLibrary() {
  const { user, isAnyAdmin, appRole, hasPermission } = useAuth();
  const { updatePageContext } = usePageContext();

  const [allResources, setAllResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [selectedCompetencies, setSelectedCompetencies] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedAccess, setSelectedAccess] = useState("all");

  // AI Recommendations
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  // Add to Journey modal
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [journeyResource, setJourneyResource] = useState(null);

  // Available filter options
  const [competencyOptions, setCompetencyOptions] = useState([]);
  const [levelOptions] = useState([
    { value: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", label: "Entry-Level Leaders" },
    { value: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", label: "Mid-Level Managers" },
    { value: "Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)", label: "Senior Managers" },
    { value: "Director / Senior Director (enterprise-level strategic oversight, multiple functions, major initiatives)", label: "Directors" },
    { value: "Executive / C-Suite (enterprise leadership, board-level strategy, organizational transformation)", label: "Executives" }
  ]);
  const [typeOptions] = useState([
    { value: "book", label: "Books" },
    { value: "course", label: "Courses" },
    { value: "article", label: "Articles" },
    { value: "video", label: "Videos" },
    { value: "whitepaper", label: "Whitepapers" },
    { value: "podcast", label: "Podcasts" },
    { value: "assessment_tool", label: "Assessment Tools" }
  ]);

  // Display limit for visible data summary
  const [displayLimit] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allResources, searchTerm, selectedCompetencies, selectedLevel, selectedType, selectedAccess, aiRecommendations]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resourcesData, assessments] = await Promise.all([
        base44.entities.LearningResource.filter({ is_active: true }),
        base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1)
      ]);

      setAllResources(resourcesData);

      // Extract unique competencies for filter
      const allCompetencies = new Set();
      resourcesData.forEach(resource => {
        resource.competencies?.forEach(comp => allCompetencies.add(comp));
      });
      setCompetencyOptions(
        Array.from(allCompetencies).map(comp => ({ value: comp, label: comp }))
      );

      // Check for assessment
      if (assessments.length > 0) {
        setHasAssessment(true);
        loadCachedRecommendations();
      }
    } catch (error) {
      console.error('Error loading learning resources:', error);
      toast.error('Failed to load learning resources');
    } finally {
      setLoading(false);
    }
  };

  const loadCachedRecommendations = () => {
    if (!user?.email) return;

    const cacheKey = `ai_learning_recommendations_${user.email}`;
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
      const [assessment, goals] = await Promise.all([
        base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1),
        base44.entities.Goal.filter({ user_email: user.email, status: 'active' })
      ]);

      const assessmentData = assessment[0];

      // Prepare resources for AI (using allResources)
      const resourcesForAI = allResources.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        type: r.type,
        competencies: r.competencies || [],
        leadership_level: r.leadership_level,
        provider: r.provider
      }));

      const prompt = `You are a leadership development expert. Analyze this leader's profile and recommend the TOP 5 most impactful learning resources.

**Leader Profile:**
- Current Role: ${user.current_role || 'N/A'}
- Department: ${user.department || 'N/A'}
- Leadership Archetype: ${assessmentData.archetype_label}
- Overall Assessment Score: ${assessmentData.overall_pct}%

**Assessment Scores by Competency:**
- Situational Intelligence: ${assessmentData.si_pct}%
- Decision Making: ${assessmentData.dm_pct}%
- Communication: ${assessmentData.comm_pct}%
- Resource Management: ${assessmentData.rm_pct}%
- Stakeholder Management: ${assessmentData.sm_pct}%
- Performance Management: ${assessmentData.pm_pct}%

**Active Development Goals:**
${goals.map(g => `- ${g.title} (Category: ${g.category})`).join('\n') || 'None'}

**Available Learning Resources:**
${JSON.stringify(resourcesForAI, null, 2)}

**Task:**
Recommend the TOP 5 learning resources that will have the biggest impact on this leader's development. Focus on:
1. Addressing their lowest-scoring competencies
2. Supporting their active goals
3. Matching their leadership level and role

For each recommendation, provide:
- resource_id: The ID of the recommended resource
- reason: A compelling 2-3 sentence explanation of why this resource is valuable for THIS leader
- priority_score: A number from 1-10 indicating importance

Return as a JSON array of recommendations.`;

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
                  resource_id: { type: "string" },
                  reason: { type: "string" },
                  priority_score: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (response.recommendations && response.recommendations.length > 0) {
        setAiRecommendations(response.recommendations);

        // Cache recommendations
        const cacheKey = `ai_learning_recommendations_${user.email}`;
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

  const applyFilters = () => {
    let filtered = [...allResources]; // Updated to use allResources

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.author?.toLowerCase().includes(term) ||
        r.provider?.toLowerCase().includes(term) ||
        r.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Competency filter
    if (selectedCompetencies.length > 0) {
      filtered = filtered.filter(r =>
        r.competencies?.some(comp => selectedCompetencies.includes(comp))
      );
    }

    // Level filter
    if (selectedLevel !== "all") {
      filtered = filtered.filter(r => r.leadership_level === selectedLevel);
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(r => r.type === selectedType);
    }

    // Access filter
    if (selectedAccess !== "all") {
      filtered = filtered.filter(r => r.access === selectedAccess);
    }

    // Sort by AI recommendations if available
    if (aiRecommendations && aiRecommendations.length > 0) {
      filtered.sort((a, b) => {
        const aRec = aiRecommendations.find(r => r.resource_id === a.id);
        const bRec = aiRecommendations.find(r => r.resource_id === b.id);

        if (aRec && !bRec) return -1;
        if (!aRec && bRec) return 1;
        if (aRec && bRec) return bRec.priority_score - aRec.priority_score;
        return 0;
      });
    }

    setFilteredResources(filtered);
  };

  const isRecommended = (resourceId) => {
    return aiRecommendations?.some(r => r.resource_id === resourceId);
  };

  const getRecommendation = (resourceId) => {
    return aiRecommendations?.find(r => r.resource_id === resourceId);
  };

  const handleAssignClick = (resource) => {
    setSelectedResource(resource);
    setShowAssignModal(true);
  };

  const handleAddToJourney = (resource) => {
    setJourneyResource(resource);
    setShowJourneyModal(true);
  };

  // Enhanced: Build comprehensive context for Atreus
  const buildAICoachContext = () => {
    const activeFiltersCount = [
      selectedCompetencies.length > 0,
      selectedLevel !== "all", // Adjusted for single-select string
      selectedType !== "all",   // Adjusted for single-select string
      searchTerm.trim() !== '',
      selectedAccess !== "all"  // Adjusted for single-select string
    ].filter(Boolean).length;

    const filterDescription = [];
    if (selectedCompetencies.length > 0) filterDescription.push(`${selectedCompetencies.join(', ')} competencies`);
    if (selectedLevel !== "all") { // Adjusted
      const levelLabel = levelOptions.find(opt => opt.value === selectedLevel)?.label || selectedLevel;
      filterDescription.push(`${levelLabel} level`);
    }
    if (selectedType !== "all") { // Adjusted
      const typeLabel = typeOptions.find(opt => opt.value === selectedType)?.label || selectedType;
      filterDescription.push(`${typeLabel} type`);
    }
    if (searchTerm) filterDescription.push(`searching for "${searchTerm}"`);
    if (selectedAccess !== "all") filterDescription.push(`${selectedAccess} access`); // Adjusted

    return {
      current_filters: {
        competencies: selectedCompetencies,
        levels: selectedLevel, // Storing as string, not array
        types: selectedType,   // Storing as string, not array
        access: selectedAccess, // Storing as string, not array
        searchTerm: searchTerm,
        activeFiltersCount,
        filterDescription: filterDescription.length > 0 ? filterDescription.join(', ') : 'viewing all resources'
      },
      visible_data_summary: {
        total_resources: allResources.length, // Renamed 'resources' to 'allResources'
        filtered_resources: filteredResources.length,
        showing_count: Math.min(filteredResources.length, displayLimit),
        has_more: filteredResources.length > displayLimit,
        free_resources: filteredResources.filter(r => r.access === 'Free').length, // Adapted to use 'access' field
        premium_resources: filteredResources.filter(r => r.access !== 'Free').length, // Adapted to use 'access' field (non-free)
        resource_types_breakdown: filteredResources.reduce((acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {})
      },
      selected_items: selectedResource ? {
        id: selectedResource.id,
        title: selectedResource.title,
        type: selectedResource.type,
        provider: selectedResource.provider
      } : null,
      modal_focus: showAssignModal ? 'assign_learning_modal' : null,
      page_specific_insights: {
        user_assessment_available: !!user?.email,
        can_assign_learning: hasPermission('learning.assign'),
        recommendations_available: !!aiRecommendations && aiRecommendations.length > 0, // Adjusted logic
        total_competencies_available: competencyOptions.length,
        total_levels_available: levelOptions.length,
        total_types_available: typeOptions.length
      },
      available_actions: getAvailableActions(),
      viewing_focus: 'library_grid'
    };
  };

  const getAvailableActions = () => {
    const actions = [];

    // Recalculate activeFiltersCount here for direct use in this function
    const currentActiveFiltersCount = [
      selectedCompetencies.length > 0,
      selectedLevel !== "all",
      selectedType !== "all",
      searchTerm.trim() !== '',
      selectedAccess !== "all"
    ].filter(Boolean).length;

    if (hasPermission('learning.assign') && filteredResources.length > 0) {
      actions.push({
        action: 'assign_learning',
        description: 'Assign learning resources to team members'
      });
    }

    if (currentActiveFiltersCount > 0) {
      actions.push({
        action: 'clear_filters',
        description: 'Clear all filters to see full library'
      });
    }

    if (!hasAssessment && user?.email) { // Changed condition from selectedCompetencies.length === 0
      actions.push({
        action: 'get_recommendations',
        description: 'Get personalized learning recommendations based on assessment'
      });
    }

    if (filteredResources.length === 0 && currentActiveFiltersCount > 0) {
      actions.push({
        action: 'adjust_filters',
        description: 'Adjust filters to find matching resources'
      });
    }

    actions.push({
      action: 'request_content',
      description: 'Request new content to be added to the library'
    });

    return actions;
  };

  // Update context whenever filters or data changes
  useEffect(() => {
    // Only update context if allResources is loaded and non-empty,
    // or if relevant states for the context have changed.
    // Adding checks for specific state changes to trigger context update.
    if (allResources.length > 0 || searchTerm || selectedCompetencies.length > 0 || selectedLevel !== "all" || selectedType !== "all" || selectedAccess !== "all" || selectedResource || showAssignModal || aiRecommendations !== null) {
      const context = buildAICoachContext();
      updatePageContext(context);
    }
  }, [
    selectedCompetencies, selectedLevel, selectedType, selectedAccess, searchTerm,
    filteredResources, selectedResource, showAssignModal, allResources, user, hasPermission,
    competencyOptions, levelOptions, typeOptions, displayLimit, hasAssessment, aiRecommendations
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveFilters = searchTerm || selectedCompetencies.length > 0 || selectedLevel !== "all" || selectedType !== "all" || selectedAccess !== "all";
  const clearFilters = () => { setSearchTerm(""); setSelectedCompetencies([]); setSelectedLevel("all"); setSelectedType("all"); setSelectedAccess("all"); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">Discover resources to accelerate your leadership development</p>
        </div>
        <div className="flex gap-2">
          {hasAssessment && (
            <Button
              onClick={generateAIRecommendations}
              disabled={recommendationsLoading}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {recommendationsLoading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating...</>
              ) : aiRecommendations ? (
                <><RefreshCw className="w-4 h-4 mr-1.5" /> Refresh AI Picks</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1.5" /> AI Recommendations</>
              )}
            </Button>
          )}
        </div>
      </motion.div>

      {/* AI Banner */}
      {aiRecommendations && aiRecommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-800">
          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span><strong>{aiRecommendations.length} AI-recommended resources</strong> are surfaced first based on your assessment results and goals.</span>
        </motion.div>
      )}

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by title, author, or topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger><SelectValue placeholder="Leadership Level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {levelOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger><SelectValue placeholder="Resource Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {typeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <MultiSelectFilter
                title="Competencies"
                options={competencyOptions}
                selectedValues={selectedCompetencies}
                onSelectionChange={setSelectedCompetencies}
              />
              <Select value={selectedAccess} onValueChange={setSelectedAccess}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Access Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Access Types</SelectItem>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Subscription">Subscription</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Program">Program</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-800 text-xs">
                  Clear filters
                </Button>
              )}
              <span className="ml-auto text-sm text-gray-400">
                {filteredResources.length} of {allResources.length} resources
                {aiRecommendations?.length > 0 && (
                  <span className="ml-2 text-purple-600 font-medium">· {aiRecommendations.length} AI picks</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Resources Grid */}
      <AnimatePresence mode="wait">
        {filteredResources.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-12 text-center">
                <BookOpen className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-1">No Resources Found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {hasActiveFilters ? "Try adjusting your search or filters." : "Learning resources will appear here once added."}
                </p>
                {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.4) }}
              >
                <ResourceCard
                  resource={resource}
                  recommendation={getRecommendation(resource.id)}
                  onAssignClick={handleAssignClick}
                  showAssignButton={isAnyAdmin}
                  onAddToJourneyClick={handleAddToJourney}
                  showSelfAssign={true}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment Modal */}
      {showAssignModal && (
        <AssignLearningModal
          open={showAssignModal}
          onClose={() => { setShowAssignModal(false); setSelectedResource(null); }}
          onSuccess={() => { setShowAssignModal(false); setSelectedResource(null); }}
          resource={selectedResource}
          assignedBy={user.email}
        />
      )}

      {/* Add to Journey Modal */}
      {showJourneyModal && (
        <AddToJourneyModal
          open={showJourneyModal}
          onClose={() => { setShowJourneyModal(false); setJourneyResource(null); }}
          resource={journeyResource}
        />
      )}
    </div>
  );
}

export default withAuthProtection(LearningLibrary);