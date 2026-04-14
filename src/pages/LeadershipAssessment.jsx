import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle, Clock, Loader2, AlertCircle, ArrowRight, BarChart3, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client"; // Added base44 import
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
// import { createTestAssessment } from "@/functions/createTestAssessment"; // This import is removed as per the changes

const POLLING_INTERVAL = 2000;
const MAX_POLLING_TIME = 60000;
const TYPEFORM_URL = "https://leadershipindexassessment.typeform.com/to/ANSx7zGW"; // Updated Typeform URL

function LeadershipAssessment() {
  const [user, setUser] = useState(null);
  const [existingAssessment, setExistingAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingResults, setProcessingResults] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [processingTimeout, setProcessingTimeout] = useState(false); // Corrected this line
  const [testMode, setTestMode] = useState(false);
  const navigate = useNavigate();

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me(); // Changed from User.me()
      setUser(currentUser);

      if (currentUser?.email) {
        const assessments = await base44.entities.Assessment.filter( // Changed from Assessment.filter
          { email: currentUser.email },
          '-created_date',
          1
        );
        
        if (assessments.length > 0) {
          setExistingAssessment(assessments[0]);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const startPollingForResults = React.useCallback(() => {
    if (!user?.email) return;

    setProcessingResults(true);
    setPollingAttempts(0);
    setProcessingTimeout(false);
    
    const startTime = Date.now();
    const pollInterval = setInterval(async () => {
      try {
        const assessments = await base44.entities.Assessment.filter( // Changed from Assessment.filter
          { email: user.email },
          '-created_date',
          1
        );

        if (assessments.length > 0) {
          const latestAssessment = assessments[0];
          
          const assessmentAge = Date.now() - new Date(latestAssessment.created_date).getTime();
          // Check if the assessment is recent enough (e.g., created within the last 5 minutes)
          // This prevents picking up an old assessment if a new one is being processed.
          if (assessmentAge < 5 * 60 * 1000) { 
            clearInterval(pollInterval);
            toast.success('Assessment results ready!');
            
            setTimeout(() => {
              navigate(createPageUrl('AssessmentResults'));
            }, 1000);
            return;
          }
        }

        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > MAX_POLLING_TIME) {
          clearInterval(pollInterval);
          setProcessingTimeout(true);
          setProcessingResults(false);
          toast.error('Processing is taking longer than expected');
        } else {
          setPollingAttempts(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error polling for assessment:', error);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [user, navigate]);

  const createMockAssessment = async (scenario = 'average') => {
    try {
      setProcessingResults(true);
      toast.info(`Creating test assessment (${scenario})...`);

      // Changed from createTestAssessment function to base44.functions.invoke
      const { data } = await base44.functions.invoke('createTestAssessment', { 
        scenario,
        replace_existing: true 
      });

      if (data.success) { // Changed from result.success
        toast.success('Test assessment created!');
        setTimeout(() => {
          navigate(createPageUrl('AssessmentResults'));
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to create test assessment'); // Changed from result.error
      }
    } catch (error) {
      console.error('Error creating mock assessment:', error);
      toast.error('Failed to create test assessment');
      setProcessingResults(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromTypeform = urlParams.get('from_typeform');
    
    if (fromTypeform === 'true' && user) {
      startPollingForResults();
    }
  }, [user, startPollingForResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-12 h-12 animate-pulse mx-auto mb-4" style={{ color: '#0043ef' }} />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-700">Loading assessment...</h2>
        </div>
      </div>
    );
  }

  if (processingResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto mb-6"
            >
              <Brain className="w-20 h-20" style={{ color: '#0043ef' }} />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing Your Results
            </h2>
            <p className="text-gray-600 mb-6">
              Our AI is analyzing your responses and generating personalized insights...
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-700">Attempt {pollingAttempts}/{Math.ceil(MAX_POLLING_TIME / POLLING_INTERVAL)}</span>
              </div>
              <Progress value={Math.min(100, (pollingAttempts / (MAX_POLLING_TIME / POLLING_INTERVAL)) * 100)} className="h-2" />
            </div>

            <div className="flex justify-center gap-1">
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

            <p className="text-xs text-gray-500 mt-6">
              This usually takes 5-15 seconds
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (processingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing is Taking Longer Than Expected
            </h2>
            <p className="text-gray-600 mb-6">
              Your assessment is still being processed. This can occasionally take a few minutes.
            </p>

            <div className="space-y-3">
              <Link to={createPageUrl('AssessmentResults')} className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Check Results Now
                </Button>
              </Link>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setProcessingTimeout(false);
                  startPollingForResults();
                }}
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Link to={createPageUrl('Dashboard')} className="block">
                <Button variant="ghost" className="w-full">
                  Return to Dashboard
                </Button>
              </Link>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              If you continue to experience issues, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingAssessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl mb-2">Assessment Already Completed</CardTitle>
              <p className="text-gray-600">
                You completed your leadership assessment on{' '}
                {new Date(existingAssessment.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6 pb-8">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600 mb-1">
                    {existingAssessment.overall_pct ? `${existingAssessment.overall_pct}%` : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">Overall Score</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-lg font-semibold text-purple-600 mb-1">
                    {existingAssessment.archetype_label || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">Leadership Archetype</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link to={createPageUrl('AssessmentResults')} className="block">
                  <Button 
                    className="w-full"
                    style={{ backgroundColor: '#0043ef' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0038cc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0043ef'}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Full Results
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setTestMode(!testMode)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {testMode ? 'Hide' : 'Show'} Test Options
                </Button>

                <AnimatePresence>
                  {testMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-4 bg-gray-50 rounded-lg space-y-2 overflow-hidden"
                    >
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Test Assessment Scenarios:
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => createMockAssessment('high_performer')}
                      >
                        High Performer (87%)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => createMockAssessment('average')}
                      >
                        Average Leader (72%)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => createMockAssessment('developing')}
                      >
                        Developing Leader (58%)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => createMockAssessment('at_risk')}
                      >
                        At Risk (45%)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => createMockAssessment('incomplete')}
                      >
                        Incomplete Data
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        These test buttons replace your existing assessment with mock data
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Link to={createPageUrl('Dashboard')} className="block">
                  <Button variant="ghost" className="w-full">
                    Return to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Leadership Index Assessment
          </h1>
          <p className="text-gray-600">
            Complete this assessment to discover your leadership strengths and opportunities
          </p>
        </div>

        <Card className="shadow-xl border-0" style={{ height: '700px' }}>
          <CardContent className="p-0 h-full">
            {user?.email && (
              <iframe
                src={`${TYPEFORM_URL}?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.full_name || '')}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Leadership Assessment"
                allow="geolocation; microphone; camera; fullscreen"
              />
            )}
            {!user?.email && (
              <div className="flex items-center justify-center h-full text-gray-500">
                Loading Typeform... ensure you are logged in.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTestMode(!testMode)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {testMode ? 'Hide' : 'Show'} Test Mode
          </Button>

          <AnimatePresence>
            {testMode && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden"
              >
                <p className="text-sm font-medium text-yellow-800 mb-3">
                  🧪 Test Mode: Create Mock Assessments
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createMockAssessment('high_performer')}
                  >
                    High Performer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createMockAssessment('average')}
                  >
                    Average
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createMockAssessment('developing')}
                  >
                    Developing
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createMockAssessment('at_risk')}
                  >
                    At Risk
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createMockAssessment('incomplete')}
                  >
                    Incomplete
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Click any scenario to create a test assessment and see the results immediately
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default withAuthProtection(LeadershipAssessment, {
  checkAccess: (user) => {
    // Users and Team Leaders can always access
    if (['User Level 1', 'User Level 2'].includes(user.app_role)) {
      return true;
    }
    
    // Admins can only access if they have User or Team Leader add-on permission
    if (['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'].includes(user.app_role)) {
      // Check for personal assessment permissions (indicates User add-on)
      const hasUserAddon = user.permissions?.includes('personal.assessments.view') || 
                          user.permissions?.includes('personal.assessments.take');
      
      // Check for team permissions (indicates Team Leader add-on)
      const hasTeamLeaderAddon = user.permissions?.includes('team.assessments.view');
      
      return hasUserAddon || hasTeamLeaderAddon;
    }
    
    return false;
  }
});