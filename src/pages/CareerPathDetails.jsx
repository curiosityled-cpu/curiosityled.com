import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Clock,
  Award,
  BookOpen,
  Lightbulb,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Rocket,
  Loader2,
  Info
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import { calculateReadinessScore, estimateTimeToReady } from "@/components/lib/careerPathReadiness";
import UserQualificationsBanner from "@/components/careerpath/UserQualificationsBanner";

function CareerPathDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  
  // Core data
  const [careerPath, setCareerPath] = useState(null);
  const [fromRole, setFromRole] = useState(null);
  const [toRole, setToRole] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [hasAssessment, setHasAssessment] = useState(false);
  
  // Readiness analysis
  const [readinessScore, setReadinessScore] = useState(0);
  const [timeToReady, setTimeToReady] = useState('');
  const [gapAnalysis, setGapAnalysis] = useState([]);
  
  // AI-generated plan
  const [developmentPlan, setDevelopmentPlan] = useState(null);
  const [recommendedLearning, setRecommendedLearning] = useState([]);
  
  // AI recommendation data (if this path was recommended)
  const [aiRecommendation, setAiRecommendation] = useState(null);

  useEffect(() => {
    loadPathDetails();
  }, []);

  const loadPathDetails = async () => {
    setLoading(true);
    try {
      // Get pathId from URL
      const params = new URLSearchParams(window.location.search);
      const pathId = params.get('pathId');

      if (!pathId) {
        toast.error('No career path specified');
        navigate(createPageUrl('CareerPathExplorer'));
        return;
      }

      // Fetch all required data
      const [paths, rolesData, assessments, learningResources] = await Promise.all([
        base44.entities.CareerPath.filter({ id: pathId }),
        base44.entities.Role.list(),
        base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1),
        base44.entities.LearningResource.filter({ is_active: true })
      ]);

      const path = paths[0];
      if (!path) {
        toast.error('Career path not found');
        navigate(createPageUrl('CareerPathExplorer'));
        return;
      }

      setCareerPath(path);

      const from = rolesData.find(r => r.id === path.from_role_id);
      const to = rolesData.find(r => r.id === path.to_role_id);
      setFromRole(from);
      setToRole(to);

      if (assessments.length > 0) {
        const assessment = assessments[0];
        setAssessmentData(assessment);
        setHasAssessment(true);

        // Calculate readiness
        if (to && to.required_competencies) {
          const { readinessScore: score, gapAnalysis: gaps } = calculateReadinessScore(
            assessment,
            to.required_competencies
          );
          setReadinessScore(score);
          setGapAnalysis(gaps);
          setTimeToReady(estimateTimeToReady(score, path.typical_duration_months));

          // Generate AI development plan
          await generateDevelopmentPlan(assessment, path, to, gaps, learningResources);
        }
      }

      // Check if this path was AI-recommended
      const cacheKey = `ai_career_recommendations_${user.email}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          const recommendation = data.find(r => r.path_id === pathId);
          if (recommendation) {
            setAiRecommendation(recommendation);
          }
        } catch (error) {
          console.error('Error loading recommendation data:', error);
        }
      }
    } catch (error) {
      console.error('Error loading path details:', error);
      toast.error('Failed to load career path details');
    } finally {
      setLoading(false);
    }
  };

  const generateDevelopmentPlan = async (assessment, path, targetRole, gaps, allLearningResources) => {
    try {
      // Filter learning resources by competencies with gaps
      const gapCompetencies = gaps.filter(g => g.gap > 0).map(g => g.competency);
      const relevantLearning = allLearningResources.filter(resource =>
        resource.competencies?.some(comp => gapCompetencies.includes(comp))
      ).slice(0, 6);

      setRecommendedLearning(relevantLearning);

      // Generate suggested goals using AI
      const prompt = `You are a leadership development expert. Create a development plan for a leader transitioning to: ${targetRole.title}.

**User's Current Assessment:**
- Overall Score: ${assessment.overall_pct}%
- Leadership Archetype: ${assessment.archetype_label}

**Identified Competency Gaps:**
${gaps.filter(g => g.gap > 0).map(g => `- ${g.competency}: Current ${g.currentScore}%, Target ${g.targetScore}% (Gap: ${g.gap}%)`).join('\n')}

**Target Role Requirements:**
${targetRole.key_responsibilities?.slice(0, 5).join('\n') || 'N/A'}

**Task:**
Create 3-5 SMART development goals that will help this leader close their competency gaps and prepare for the target role.

For each goal, provide:
1. title (clear, action-oriented goal statement)
2. description (specific activities and success criteria)
3. target_competency (which competency gap this addresses)
4. estimated_duration_weeks (realistic timeframe)

Make goals concrete, measurable, and achievable.`;

      const response = await base44.integrations.invoke('Core', 'InvokeLLM', {
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  target_competency: { type: "string" },
                  estimated_duration_weeks: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (response.goals && response.goals.length > 0) {
        setDevelopmentPlan(response.goals);
      }
    } catch (error) {
      console.error('Error generating development plan:', error);
      // Continue without AI plan - user can still see readiness and gaps
    }
  };

  const handleActivatePlan = async () => {
    if (!developmentPlan || developmentPlan.length === 0) {
      toast.error('No development plan available to activate');
      return;
    }

    setActivating(true);
    try {
      const createdGoals = [];

      // Create goals from the development plan
      for (const goal of developmentPlan) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (goal.estimated_duration_weeks * 7));

        const newGoal = await base44.entities.Goal.create({
          user_email: user.email,
          title: goal.title,
          description: goal.description,
          category: 'development',
          due_date: dueDate.toISOString().split('T')[0],
          status: 'active',
          completion_percentage: 0
        });
        createdGoals.push(newGoal);
      }

      // Create an OnboardingPlan to track the overall development journey
      const totalDurationDays = careerPath.typical_duration_months * 30;
      
      const milestones = createdGoals.map((goal, index) => ({
        title: developmentPlan[index].title,
        description: developmentPlan[index].description,
        due_day: (index + 1) * Math.floor(totalDurationDays / createdGoals.length),
        status: 'not_started',
        phase: `Month ${Math.ceil((index + 1) * (careerPath.typical_duration_months / createdGoals.length))}`,
        phase_label: `Development Phase ${index + 1}`,
        type: 'learning',
        related_goal_id: goal.id
      }));

      await base44.entities.OnboardingPlan.create({
        title: `Development Plan: ${careerPath.title}`,
        assigned_to_email: user.email,
        assigned_by: user.email,
        status: 'in_progress',
        target_role: toRole?.title || careerPath.title,
        duration_days: totalDurationDays,
        description: `AI-generated development plan to prepare for ${toRole?.title}`,
        milestones: milestones,
        ai_generated: true,
        completion_percentage: 0,
        started_date: new Date().toISOString()
      });

      toast.success('Development plan activated! Check your Goals and Onboarding tabs.');
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate(`${createPageUrl('Dashboard')}#journeys`);
      }, 1500);

    } catch (error) {
      console.error('Error activating development plan:', error);
      toast.error('Failed to activate development plan');
    } finally {
      setActivating(false);
    }
  };

  const getReadinessColor = (score) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-600' };
    if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-800', ring: 'ring-blue-600' };
    if (score >= 40) return { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-600' };
    return { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading career path details...</p>
        </div>
      </div>
    );
  }

  if (!careerPath) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Career Path Not Found</h3>
            <p className="text-sm text-gray-600 mb-4">The requested career path could not be loaded.</p>
            <Link to={createPageUrl('CareerPathExplorer')}>
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Explorer
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readinessColors = getReadinessColor(readinessScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to={createPageUrl('CareerPathExplorer')} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Explorer
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {careerPath.title}
              </h1>
              <p className="text-gray-600">
                {careerPath.description || careerPath.brief_description}
              </p>
            </div>
            {aiRecommendation && (
              <Badge className="bg-purple-600 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Recommended ({aiRecommendation.match_score}% Match)
              </Badge>
            )}
          </div>
        </motion.div>

        {/* AI Recommendation Rationale */}
        {aiRecommendation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Alert className="border-purple-200 bg-purple-50">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <AlertTitle className="text-purple-900">Why This Path Is Recommended For You</AlertTitle>
              <AlertDescription className="text-purple-800 mt-2">
                {aiRecommendation.reason}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Path Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Path Type</p>
              <p className="text-lg font-bold text-gray-900 capitalize">
                {careerPath.path_type}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-lg font-bold text-gray-900">
                {careerPath.typical_duration_months} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Award className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Difficulty</p>
              <p className="text-lg font-bold text-gray-900 capitalize">
                {careerPath.difficulty_level?.replace('_', ' ')}
              </p>
            </CardContent>
          </Card>

          <Card className={readinessColors.bg}>
            <CardContent className="p-4 text-center">
              <Target className={`w-8 h-8 ${readinessColors.text} mx-auto mb-2`} />
              <p className={`text-sm ${readinessColors.text}`}>Your Readiness</p>
              <p className={`text-lg font-bold ${readinessColors.text}`}>
                {hasAssessment ? `${readinessScore}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* No Assessment Warning */}
        {!hasAssessment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <AlertTitle className="text-yellow-900">Assessment Required</AlertTitle>
              <AlertDescription className="text-yellow-800">
                <div className="flex items-center justify-between">
                  <span>
                    Complete your leadership assessment to see your personalized readiness score and development plan
                  </span>
                  <Link to={createPageUrl("Assessment")}>
                    <Button size="sm" variant="outline" className="ml-4">
                      Take Assessment
                    </Button>
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* User Qualifications Banner */}
        {toRole && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            <UserQualificationsBanner userEmail={user?.email} targetRole={toRole} />
          </motion.div>
        )}

        {/* Role Transition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Role Transition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Current Role</h4>
                  <p className="text-lg text-gray-800">{fromRole?.title || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mt-1">{fromRole?.department}</p>
                  {fromRole?.description && (
                    <p className="text-sm text-gray-600 mt-2">{fromRole.description}</p>
                  )}
                </div>

                <div className="border-l-2 border-gray-200 pl-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Target Role</h4>
                  <p className="text-lg text-gray-800">{toRole?.title || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mt-1">{toRole?.department}</p>
                  {toRole?.description && (
                    <p className="text-sm text-gray-600 mt-2">{toRole.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Readiness Analysis - Only if assessment exists */}
        {hasAssessment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    Your Readiness Analysis
                  </CardTitle>
                  <Badge className={`${readinessColors.bg} ${readinessColors.text}`}>
                    {readinessScore}% Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Estimated Time to Readiness</p>
                    <p className="text-2xl font-bold text-gray-900">{timeToReady}</p>
                  </div>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${readinessColors.bg} ring-4 ${readinessColors.ring}`}>
                    <span className={`text-2xl font-bold ${readinessColors.text}`}>
                      {readinessScore}%
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Competency Gap Analysis</h4>
                  <div className="space-y-3">
                    {gapAnalysis.map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900">{item.competency}</span>
                          <span className="text-gray-600">
                            {item.currentScore}% → {item.targetScore}%
                            {item.gap > 0 && (
                              <span className="text-red-600 ml-2">
                                (-{item.gap}%)
                              </span>
                            )}
                          </span>
                        </div>
                        <Progress 
                          value={(item.currentScore / item.targetScore) * 100} 
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

        {/* AI-Generated Development Plan */}
        {developmentPlan && developmentPlan.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI-Generated Development Plan
                  </CardTitle>
                  <Button
                    onClick={handleActivatePlan}
                    disabled={activating}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {activating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Activate Development Plan
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    This personalized plan was generated by AI based on your assessment results and the requirements for {toRole?.title}. 
                    Activating this plan will create trackable goals and integrate them into your development journey.
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Suggested Development Goals
                  </h4>
                  <div className="space-y-4">
                    {developmentPlan.map((goal, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border-2 border-purple-100">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-gray-900">{goal.title}</h5>
                          <Badge className="bg-purple-100 text-purple-800">
                            <Clock className="w-3 h-3 mr-1" />
                            {goal.estimated_duration_weeks} weeks
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Targets:</span>
                          <Badge variant="outline" className="text-xs">
                            {goal.target_competency}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recommended Learning Resources */}
        {recommendedLearning.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Recommended Learning Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedLearning.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          {resource.thumbnail_url && (
                            <img
                              src={resource.thumbnail_url}
                              alt={resource.title}
                              className="w-full h-32 object-cover rounded-md mb-3"
                            />
                          )}
                          <h5 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                            {resource.title}
                          </h5>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {resource.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {resource.competencies?.slice(0, 2).map((comp, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
                
                <div className="mt-6 text-center">
                  <Link to={createPageUrl('LearningLibrary')}>
                    <Button variant="outline">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Explore All Learning Resources
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Path Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Prerequisites */}
          {careerPath.prerequisites && careerPath.prerequisites.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Prerequisites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {careerPath.prerequisites.map((prereq, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      {prereq}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Success Indicators */}
          {careerPath.success_indicators && careerPath.success_indicators.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="w-5 h-5 text-blue-600" />
                  Success Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {careerPath.success_indicators.map((indicator, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <Award className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      {indicator}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Experiential Opportunities */}
          {careerPath.experiential_opportunities && careerPath.experiential_opportunities.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  Experiential Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {careerPath.experiential_opportunities.map((opp, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <Lightbulb className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      {opp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Mentorship Suggestions */}
          {careerPath.mentorship_suggestions && careerPath.mentorship_suggestions.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                  Mentorship Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {careerPath.mentorship_suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <Users className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default withAuthProtection(CareerPathDetails);