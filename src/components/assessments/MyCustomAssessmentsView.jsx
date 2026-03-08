import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, Search, Loader2, CheckCircle, Clock, Play,
  FileText, Award, Target, ClipboardList, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MyCustomAssessmentsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');

  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    if (user?.email) {
      loadData();
    }
  }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      // RLS already handles access control - no need to double-filter
      const [assessmentsData, submissionsData] = await Promise.all([
        base44.entities.CustomAssessment.list('-created_date', 50),
        base44.entities.AssessmentSubmission.filter({ user_email: user.email }, '-submission_date', 50)
      ]);

      // Only show published assessments to end users
      const publishedAssessments = (assessmentsData || []).filter(a => a.status === 'published');
      
      setAssessments(publishedAssessments);
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForAssessment = (assessmentId) => {
    return submissions.find(s => s.assessment_id === assessmentId);
  };

  // Separate assessments into categories
  const availableAssessments = assessments.filter(a => {
    const submission = getSubmissionForAssessment(a.id);
    return !submission || submission.status === 'in_progress';
  });

  const completedAssessments = assessments.filter(a => {
    const submission = getSubmissionForAssessment(a.id);
    return submission?.status === 'completed' || submission?.status === 'graded';
  });

  const filteredAssessments = (activeTab === 'available' ? availableAssessments : completedAssessments)
    .filter(a => 
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Stats
  const totalAvailable = availableAssessments.length;
  const totalCompleted = completedAssessments.length;
  const avgScore = completedAssessments.length > 0
    ? Math.round(
        completedAssessments.reduce((sum, a) => {
          const sub = getSubmissionForAssessment(a.id);
          return sum + (sub?.percentage || 0);
        }, 0) / completedAssessments.length
      )
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="available" className="gap-2">
              <Play className="w-4 h-4" />
              Available ({availableAssessments.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedAssessments.length})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="available" className="mt-0">
          {filteredAssessments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssessments.map((assessment, idx) => (
                <AssessmentCard 
                  key={assessment.id} 
                  assessment={assessment} 
                  submission={getSubmissionForAssessment(assessment.id)}
                  index={idx}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              message="No assessments available" 
              description="Check back later for new assessments"
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          {filteredAssessments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssessments.map((assessment, idx) => (
                <AssessmentCard 
                  key={assessment.id} 
                  assessment={assessment} 
                  submission={getSubmissionForAssessment(assessment.id)}
                  index={idx}
                  showResults
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              message="No completed assessments" 
              description="Complete assessments to see your results here"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssessmentCard({ assessment, submission, index, showResults = false }) {
  const isInProgress = submission?.status === 'in_progress';
  const isCompleted = submission?.status === 'completed' || submission?.status === 'graded';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{assessment.title}</CardTitle>
              <CardDescription className="mt-1">
                {assessment.type === 'quiz' ? 'Quiz' : 
                 assessment.type === 'knowledge_check' ? 'Knowledge Check' : 'Assessment'}
              </CardDescription>
            </div>
            {assessment.visibility === 'public' ? (
              <Badge variant="outline" className="text-xs">Org-wide</Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 text-xs">Assigned</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assessment.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{assessment.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{assessment.config?.questions?.length || 0} questions</span>
              </div>
              {assessment.passing_score_percentage && (
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>Pass: {assessment.passing_score_percentage}%</span>
                </div>
              )}
            </div>

            {showResults && submission && (
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Your Score</span>
                  <span className={`font-semibold ${submission.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {submission.percentage || 0}%
                  </span>
                </div>
                <Progress value={submission.percentage || 0} className="h-2" />
                <div className="flex justify-between items-center mt-2">
                  <Badge className={submission.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {submission.passed ? 'Passed' : 'Not Passed'}
                  </Badge>
                  {submission.submission_date && (
                    <span className="text-xs text-gray-500">
                      {format(new Date(submission.submission_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!showResults && (
              <Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700">
                {isInProgress ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Continue Assessment
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Assessment
                  </>
                )}
              </Button>
            )}

            {showResults && (
              <Button variant="outline" className="w-full mt-2">
                <ArrowRight className="w-4 h-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ message, description }) {
  return (
    <div className="text-center py-12">
      <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p className="text-gray-600 font-medium">{message}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}