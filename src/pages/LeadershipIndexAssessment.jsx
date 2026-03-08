import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import AssessmentIntake from "@/components/assessment/AssessmentIntake";
import AssessmentQuestion from "@/components/assessment/AssessmentQuestion";

export default function LeadershipIndexAssessment() {
  const { user } = useAuth();
  
  const [stage, setStage] = useState('intake'); // intake, assessment, processing, complete
  const [assessmentConfig, setAssessmentConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkExistingSubmission();
  }, [user]);

  const checkExistingSubmission = async () => {
    if (!user?.email) return;

    try {
      // Check for incomplete submission
      const existing = await base44.entities.AssessmentSubmission.filter({
        user_email: user.email,
        status: 'in_progress'
      }, '-created_date', 1);

      if (existing.length > 0) {
        const sub = existing[0];
        setSubmission(sub);
        setAssessmentConfig({
          leadership_level: sub.leadership_level,
          sector: sub.sector
        });
        setResponses(sub.user_responses || []);
        
        // Load questions
        const questionsLoaded = await loadQuestions(sub.leadership_level, sub.sector);
        if (questionsLoaded) {
          setStage('assessment');
        }
      }
    } catch (error) {
      console.error('Error checking existing submission:', error);
    }
  };

  const handleIntakeComplete = async (config) => {
    setLoading(true);
    try {
      console.log('Starting assessment with config:', config);
      setAssessmentConfig(config);
      
      // Load questions first
      const loadedQuestions = await base44.entities.AssessmentQuestion.filter({
        leadership_level: config.leadership_level,
        sector: config.sector
      });
      
      console.log('Questions loaded:', loadedQuestions.length);
      
      if (loadedQuestions.length === 0) {
        toast.error('No questions found for your profile. Please contact support.');
        setLoading(false);
        return;
      }
      
      // Create new submission
      const newSubmission = await base44.entities.AssessmentSubmission.create({
        user_email: user.email,
        custom_assessment_id: 'leadership-index-native',
        client_id: user.client_id,
        leadership_level: config.leadership_level,
        sector: config.sector,
        submission_date: new Date().toISOString(),
        status: 'in_progress',
        user_responses: []
      });

      console.log('Submission created:', newSubmission.id);
      
      // Set everything at once
      setSubmission(newSubmission);
      setQuestions(loadedQuestions);
      setCurrentQuestionIndex(0);
      setStage('assessment');
      
      console.log('Stage changed to assessment');
    } catch (error) {
      console.error('Error starting assessment:', error);
      toast.error('Failed to start assessment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (level, sector) => {
    try {
      console.log('Loading questions for:', { level, sector });
      const allQuestions = await base44.entities.AssessmentQuestion.filter({
        leadership_level: level,
        sector: sector
      });

      console.log('Questions loaded:', allQuestions.length);
      
      if (allQuestions.length === 0) {
        toast.error('No questions found for your profile. Please contact support.');
        return false;
      }
      
      setQuestions(allQuestions);
      setCurrentQuestionIndex(0);
      return true;
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load assessment questions');
      return false;
    }
  };

  const handleResponse = async (questionId, selectedOption, proficiencyValue, competencyId) => {
    const newResponse = {
      question_id: questionId,
      competency_id: competencyId,
      selected_option: selectedOption,
      proficiency_value: proficiencyValue
    };

    const updatedResponses = [...responses.filter(r => r.question_id !== questionId), newResponse];
    setResponses(updatedResponses);

    // Auto-save to submission
    try {
      await base44.entities.AssessmentSubmission.update(submission.id, {
        user_responses: updatedResponses
      });
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStage('processing');

    try {
      // Update submission status
      await base44.entities.AssessmentSubmission.update(submission.id, {
        status: 'submitted',
        submission_date: new Date().toISOString()
      });

      // Score the assessment
      const { scoreAssessmentSubmission } = await import('@/functions/scoreAssessmentSubmission');
      const result = await scoreAssessmentSubmission({ submission_id: submission.id });

      if (result.data?.success) {
        setStage('complete');
        toast.success('Assessment scored successfully!');
      } else {
        throw new Error('Scoring failed');
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment. Please try again.');
      setStage('assessment');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses.find(r => r.question_id === currentQuestion?.id);
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const allQuestionsAnswered = questions.length > 0 && responses.length === questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {stage === 'intake' && (
            <motion.div
              key="intake"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AssessmentIntake onComplete={handleIntakeComplete} loading={loading} />
            </motion.div>
          )}

          {stage === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {!currentQuestion ? (
                <Card className="border-0 shadow-xl">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading assessment questions...</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Header */}
                  <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-gray-900">Leadership Index Assessment</h1>
                        <p className="text-sm text-gray-600">
                          Question {currentQuestionIndex + 1} of {questions.length}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      {Math.round(progress)}% Complete
                    </Badge>
                  </div>
                  <Progress value={progress} className="h-2" />
                </CardContent>
              </Card>

              {/* Question */}
              <AssessmentQuestion
                question={currentQuestion}
                selectedOption={currentResponse?.selected_option}
                onSelect={(option, proficiency) => 
                  handleResponse(currentQuestion.id, option, proficiency, currentQuestion.competency_id)
                }
                  />

                  {/* Navigation */}
                  <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>

                    <div className="text-sm text-gray-600">
                      {responses.length} of {questions.length} answered
                    </div>

                    {currentQuestionIndex === questions.length - 1 ? (
                      <Button
                        onClick={handleSubmit}
                        disabled={!allQuestionsAnswered || loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Submit Assessment
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        disabled={!currentResponse}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                    </div>
                  </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          )}

          {stage === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <Card className="border-0 shadow-xl">
                <CardContent className="p-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 mx-auto mb-6"
                  >
                    <Brain className="w-20 h-20 text-purple-600" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Analyzing Your Results
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Our AI is calculating your proficiency scores, determining your leadership archetype, and generating personalized insights...
                  </p>
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="w-3 h-3 rounded-full bg-purple-600"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {stage === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <Card className="border-0 shadow-xl">
                <CardContent className="p-12">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Assessment Complete!
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Your Leadership Index results are ready to view.
                  </p>
                  <Button
                    onClick={() => window.location.href = createPageUrl('AssessmentResults')}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    View My Results
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}