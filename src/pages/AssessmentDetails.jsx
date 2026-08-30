import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Brain,
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  Loader2,
  FileText,
  Share2,
  Download,
  User
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function AssessmentDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [assessmentUser, setAssessmentUser] = useState(null);
  const [historicalAssessments, setHistoricalAssessments] = useState([]);

  useEffect(() => {
    loadAssessmentDetails();
  }, []);

  const loadAssessmentDetails = async () => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const assessmentId = urlParams.get('assessmentId');

      if (!assessmentId) {
        toast.error('No assessment ID provided');
        navigate(createPageUrl('AssessmentAnalytics'));
        return;
      }

      const assessmentData = await base44.entities.Assessment.filter({ id: assessmentId });
      
      if (!assessmentData || assessmentData.length === 0) {
        toast.error('Assessment not found');
        navigate(createPageUrl('AssessmentAnalytics'));
        return;
      }

      const currentAssessment = assessmentData[0];
      setAssessment(currentAssessment);

      // Load user data
      const userData = await base44.entities.User.filter({ email: currentAssessment.email });
      if (userData && userData.length > 0) {
        setAssessmentUser(userData[0]);
      }

      // Load historical assessments for this user
      const allUserAssessments = await base44.entities.Assessment.filter(
        { email: currentAssessment.email },
        'created_date',
        10
      );
      setHistoricalAssessments(allUserAssessments || []);

    } catch (error) {
      console.error('Error loading assessment details:', error);
      toast.error('Failed to load assessment details');
    } finally {
      setLoading(false);
    }
  };

  const competencies = assessment ? [
    { name: 'Situational Intelligence', key: 'si', score: assessment.si_pct || 0 },
    { name: 'Decision Making', key: 'dm', score: assessment.dm_pct || 0 },
    { name: 'Communication', key: 'comm', score: assessment.comm_pct || 0 },
    { name: 'Resource Management', key: 'rm', score: assessment.rm_pct || 0 },
    { name: 'Stakeholder Management', key: 'sm', score: assessment.sm_pct || 0 },
    { name: 'Performance Management', key: 'pm', score: assessment.pm_pct || 0 }
  ] : [];

  const strongestCompetency = competencies.length > 0 ? competencies.reduce((max, c) => c.score > max.score ? c : max) : null;
  const weakestCompetency = competencies.length > 0 ? competencies.reduce((min, c) => c.score < min.score ? c : min) : null;

  const radarData = competencies.map(c => ({
    competency: c.name,
    score: c.score,
    orgAvg: 75, // Mock org average
    target: 80
  }));

  const historicalTrendData = historicalAssessments.length > 1 ? historicalAssessments.map(a => ({
    date: format(new Date(a.created_date || a.submission_ts), 'MMM yyyy'),
    overall: a.overall_pct || 0,
    si: a.si_pct || 0,
    dm: a.dm_pct || 0,
    comm: a.comm_pct || 0,
    rm: a.rm_pct || 0,
    sm: a.sm_pct || 0,
    pm: a.pm_pct || 0
  })) : [];

  const getBand = (score) => {
    if (score >= 85) return { label: 'Expert', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { label: 'Proficient', color: 'bg-blue-100 text-blue-800' };
    if (score >= 60) return { label: 'Developing', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Development', color: 'bg-red-100 text-red-800' };
  };

  const getReadinessStatus = (score) => {
    if (score >= 85) return { label: 'Ready Now', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { label: 'High Potential', color: 'bg-blue-100 text-blue-800' };
    if (score >= 60) return { label: 'Developing', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'At Risk', color: 'bg-red-100 text-red-800' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Assessment Not Found</h2>
          <p className="text-gray-600 mb-4">The assessment you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(createPageUrl('AssessmentAnalytics'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analytics
          </Button>
        </Card>
      </div>
    );
  }

  const readiness = getReadinessStatus(assessment.overall_pct || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('AssessmentAnalytics'))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assessment Analytics
        </Button>

        {/* Assessment Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      {assessmentUser?.full_name || 'Unknown User'}
                    </h1>
                    <p className="text-gray-600">{assessment.email}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-gray-500">{assessmentUser?.department || 'N/A'}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-500">{assessmentUser?.current_role || 'N/A'}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(assessment.created_date || assessment.submission_ts), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`${readiness.color} mb-2`}>{readiness.label}</Badge>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {assessment.overall_pct || 0}%
                  </div>
                  <p className="text-sm text-gray-600">Overall Score</p>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3 mr-1" />
                      Export PDF
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="w-3 h-3 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Brain className="w-8 h-8 text-purple-600 mb-4" />
                <div className="text-3xl font-bold text-gray-900">{assessment.overall_pct || 0}%</div>
                <div className="text-sm text-gray-600 mt-1">Overall Leadership</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Target className="w-8 h-8 text-blue-600 mb-4" />
                <div className="text-3xl font-bold text-gray-900">{assessment.si_pct || 0}%</div>
                <div className="text-sm text-gray-600 mt-1">Situational Intelligence</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <TrendingUp className="w-8 h-8 text-green-600 mb-4" />
                <div className="text-lg font-bold text-gray-900 mb-1">{strongestCompetency?.name}</div>
                <div className="text-2xl font-bold text-green-600">{strongestCompetency?.score || 0}%</div>
                <div className="text-sm text-gray-600 mt-1">Strongest</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <TrendingDown className="w-8 h-8 text-orange-600 mb-4" />
                <div className="text-lg font-bold text-gray-900 mb-1">{weakestCompetency?.name}</div>
                <div className="text-2xl font-bold text-orange-600">{weakestCompetency?.score || 0}%</div>
                <div className="text-sm text-gray-600 mt-1">Development Area</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Radar Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Competency Breakdown</CardTitle>
                <p className="text-sm text-gray-600">Individual vs Organization Average</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="competency" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Your Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Radar name="Org Average" dataKey="orgAvg" stroke="#6b7280" fill="#6b7280" fillOpacity={0.2} />
                    <Radar name="Target" dataKey="target" stroke="#10b981" fill="none" strokeDasharray="5 5" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Competency Scores Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Competency Scores</CardTitle>
                <p className="text-sm text-gray-600">Detailed performance by area</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competency</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Band</TableHead>
                      <TableHead>Gap to Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competencies.map((comp, idx) => {
                      const band = getBand(comp.score);
                      const gap = 80 - comp.score;
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{comp.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={comp.score} className="w-20 h-2" />
                              <span className="font-semibold">{comp.score}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={band.color}>{band.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={gap > 0 ? 'text-orange-600' : 'text-green-600'}>
                              {gap > 0 ? `${gap}% below` : `${Math.abs(gap)}% above`}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Assessment Narratives/Insights */}
        {assessment.record?.narratives && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Assessment Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700">{assessment.record.narratives}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Development Recommendations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Development Recommendations
              </CardTitle>
              <p className="text-sm text-gray-600">Suggested actions based on assessment results</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weakestCompetency && weakestCompetency.score < 70 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">
                      Focus Area: {weakestCompetency.name}
                    </h4>
                    <p className="text-sm text-orange-800 mb-3">
                      Your {weakestCompetency.name} score of {weakestCompetency.score}% suggests this is a key development opportunity.
                    </p>
                    <Button size="sm" variant="outline">
                      View Learning Resources
                    </Button>
                  </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Recommended Goals</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Develop {weakestCompetency?.name || 'key competencies'}</li>
                      <li>• Apply learnings in real situations</li>
                      <li>• Seek mentorship from high performers</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Leverage Strengths</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Continue excelling in {strongestCompetency?.name || 'strong areas'}</li>
                      <li>• Share expertise with team members</li>
                      <li>• Take on stretch assignments</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Historical Trend */}
        {historicalTrendData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Historical Performance Trend</CardTitle>
                <p className="text-sm text-gray-600">Score progression over time</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={historicalTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="overall" stroke="#8b5cf6" strokeWidth={3} name="Overall" />
                    <Line type="monotone" dataKey="si" stroke="#3b82f6" strokeWidth={2} name="SI" />
                    <Line type="monotone" dataKey="dm" stroke="#10b981" strokeWidth={2} name="DM" />
                    <Line type="monotone" dataKey="comm" stroke="#f59e0b" strokeWidth={2} name="Comm" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}