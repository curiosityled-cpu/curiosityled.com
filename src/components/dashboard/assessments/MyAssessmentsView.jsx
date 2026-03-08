import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  BarChart3,
  ArrowRight,
  Loader2,
  Calendar,
  Award,
  Sparkles,
  Target,
  TrendingUp,
  Lock
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function MyAssessmentsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myAssessments, setMyAssessments] = useState([]);
  const [latestAssessment, setLatestAssessment] = useState(null);

  useEffect(() => {
    if (user?.email) {
      loadMyAssessments();
    }
  }, [user]);

  const loadMyAssessments = async () => {
    setLoading(true);
    try {
      const assessments = await base44.entities.Assessment.filter(
        { email: user.email },
        '-created_date'
      );
      setMyAssessments(assessments || []);
      if (assessments && assessments.length > 0) {
        setLatestAssessment(assessments[0]);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProficiencyLevel = (score) => {
    if (score >= 85) return { label: 'Expert', position: 95 };
    if (score >= 70) return { label: 'Proficient', position: 75 };
    if (score >= 55) return { label: 'Developing', position: 55 };
    if (score >= 40) return { label: 'Emerging', position: 35 };
    return { label: 'Foundation', position: 15 };
  };

  const getReadinessLevel = (score) => {
    if (score >= 85) return 'Ready Now';
    if (score >= 70) return 'Nearly Ready';
    if (score >= 55) return 'Developing';
    return 'Emerging';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  if (!latestAssessment) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-lg text-center py-12">
          <CardContent>
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assessments Yet</h3>
            <p className="text-gray-600 mb-6">Take your first leadership assessment to get personalized insights</p>
            <Link to={createPageUrl('Assessment')}>
              <Button style={{ backgroundColor: '#0202ff' }} className="text-white">
                <Brain className="w-4 h-4 mr-2" />
                Take Assessment
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const proficiency = getProficiencyLevel(latestAssessment.overall_pct || 0);
  const siScore = latestAssessment.si_pct || 0;
  const avgCompetency = Math.round(
    ((latestAssessment.dm_pct || 0) + 
     (latestAssessment.comm_pct || 0) + 
     (latestAssessment.rm_pct || 0) + 
     (latestAssessment.sm_pct || 0) + 
     (latestAssessment.pm_pct || 0)) / 5
  );

  // Determine top strengths and development areas
  const competencies = [
    { name: 'Decision Making', score: latestAssessment.dm_pct || 0 },
    { name: 'Communication', score: latestAssessment.comm_pct || 0 },
    { name: 'Time/Resource Management', score: latestAssessment.rm_pct || 0 },
    { name: 'Collaboration', score: latestAssessment.sm_pct || 0 },
    { name: 'Performance Management', score: latestAssessment.pm_pct || 0 }
  ].sort((a, b) => b.score - a.score);

  const topStrengths = competencies.slice(0, 2);
  const developmentAreas = competencies.slice(-2).reverse();

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Assessment Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-lg h-full">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Leadership Index Assessment</h2>
                  </div>
                  <p className="text-sm text-gray-500">Your core leadership evaluation across 6 competencies</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {myAssessments.length} Record{myAssessments.length !== 1 ? 's' : ''}
                </Button>
              </div>

              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-3xl font-bold text-purple-700">{latestAssessment.overall_pct || 0}%</div>
                  <div className="text-xs text-purple-600 mt-1">Overall Leadership Score</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-3xl font-bold text-blue-700">{siScore}%</div>
                  <div className="text-xs text-blue-600 mt-1">Situational Intelligence</div>
                  <div className="text-[10px] text-gray-500">Your ability to read situations and adapt</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-3xl font-bold text-green-700">{avgCompetency}%</div>
                  <div className="text-xs text-green-600 mt-1">Leadership Proficiency</div>
                  <div className="text-[10px] text-gray-500">Average across all competencies</div>
                </div>
              </div>

              {/* Proficiency Level Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Proficiency Level</span>
                  <Badge className="bg-purple-100 text-purple-800">{proficiency.label}</Badge>
                </div>
                <div className="relative h-3 bg-gradient-to-r from-gray-200 via-yellow-200 via-blue-200 to-green-200 rounded-full">
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-600 rounded-full border-2 border-white shadow-md"
                    style={{ left: `${proficiency.position}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Foundation</span>
                  <span>Emerging</span>
                  <span>Developing</span>
                  <span>Proficient</span>
                  <span>Expert</span>
                </div>
                <p className="text-xs text-gray-600 mt-2 bg-purple-50 p-2 rounded">
                  Strong leadership capabilities
                </p>
              </div>

              {/* Leadership Archetype */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-700">Leadership Archetype</span>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                  <Badge className="bg-amber-500 text-white mb-2">
                    {latestAssessment.archetype_label || 'The Resourceful Optimizer'}
                  </Badge>
                  <p className="text-sm text-gray-700">
                    You make the most of resources—keeping teams focused, efficient, and calm under pressure. 
                    Your exceptional ability to see inefficiencies often miss and create elegant solutions that maximize results.
                  </p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Based on your competency pattern and behavioral indicators
                  </p>
                </div>
              </div>

              {/* View Full Results Button */}
              <Link to={`${createPageUrl('AssessmentResults')}?assessmentId=${latestAssessment.id}`}>
                <Button className="w-full text-white" style={{ backgroundColor: '#0202ff' }}>
                  View Full Results
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <div className="flex items-center justify-center gap-4 mt-3">
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <Lock className="w-3 h-3 mr-1" />
                  Upgrade
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Quick Insights */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg h-full">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>

              {/* Top Strengths */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Top Strengths</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topStrengths.map((comp, idx) => (
                    <Badge key={idx} className="bg-green-100 text-green-800 border border-green-200">
                      {comp.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">These competencies place you in the top 25% of leaders in your peer group</p>
              </div>

              {/* Development Focus */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Development Focus</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {developmentAreas.map((comp, idx) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-800 border border-blue-200">
                      {comp.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Targeted development in these areas will maximize your leadership effectiveness</p>
              </div>

              {/* Succession Readiness */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Succession Readiness</span>
                  <Badge variant="outline" className="text-xs">{getReadinessLevel(latestAssessment.overall_pct || 0)}</Badge>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Readiness Score</span>
                    <span className="font-semibold text-purple-600">{latestAssessment.overall_pct || 0}%</span>
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute h-full bg-gradient-to-r from-yellow-400 via-blue-400 to-green-400 rounded-full"
                      style={{ width: `${latestAssessment.overall_pct || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                    <span>Emerging</span>
                    <span>Developing</span>
                    <span>Nearly Ready</span>
                    <span>Ready Now</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  {latestAssessment.overall_pct >= 70 
                    ? '6-12 months with targeted development'
                    : '12-18 months with focused improvement'}
                </p>
              </div>

              {/* Contributing Factors */}
              <div className="space-y-2 mb-5">
                <span className="text-sm font-medium text-gray-700">Contributing Factors</span>
                {[
                  { label: 'Assessment Score', value: latestAssessment.overall_pct || 0 },
                  { label: 'Learning Progress', value: 67 },
                  { label: 'Goal Achievement', value: 75 },
                  { label: 'Experience Level', value: 80 }
                ].map((factor, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{factor.label}</span>
                      <span className="font-medium">{factor.value}%</span>
                    </div>
                    <Progress value={factor.value} className="h-1.5" />
                  </div>
                ))}
              </div>

              {/* Next Action */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900">Next Action</p>
                <p className="text-xs text-blue-700">Focus on leadership competency gaps</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Last completed: {latestAssessment.submission_ts 
                    ? format(new Date(latestAssessment.submission_ts), 'M/d/yyyy')
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Previous Assessments */}
      {myAssessments.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Assessments</h3>
              <div className="space-y-3">
                {myAssessments.slice(1, 4).map((assessment) => (
                  <div key={assessment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {assessment.submission_ts 
                            ? format(new Date(assessment.submission_ts), 'MMMM d, yyyy')
                            : 'Date unknown'}
                        </p>
                        <p className="text-sm text-gray-500">Leadership Index Assessment</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-purple-600">{assessment.overall_pct || 0}%</p>
                      </div>
                      <Link to={`${createPageUrl('AssessmentResults')}?assessmentId=${assessment.id}`}>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}