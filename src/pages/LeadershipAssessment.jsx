import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle, Clock, Loader2, AlertCircle, ArrowRight, BarChart3, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const POLLING_INTERVAL = 3000;
const MAX_POLLING_TIME = 45000;
const TYPEFORM_FORM_ID = "01KPER4JBCGJ85PG55KACC0K85";

// Typeform embed component using the official embed.js script
function TypeformEmbed({ formId, email, onSubmit }) {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!email) return;

    // Listen for Typeform submit message — catch all event types from Typeform
    const handleMessage = (event) => {
      if (!event.origin.includes('typeform.com')) return;
      const type = event.data?.type || event.data;
      if (type === 'form-submit' || type === 'typeform:submit' || (typeof type === 'string' && type.includes('submit'))) {
        if (onSubmit) onSubmit();
      }
    };
    window.addEventListener('message', handleMessage);

    // Inject embed script
    const scriptId = 'typeform-embed-script';
    const existing = document.getElementById(scriptId);
    if (existing) {
      // Script already loaded — just re-init
      if (window.tf) window.tf.load();
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = '//embed.typeform.com/next/embed.js';
      script.async = true;
      script.onload = () => { if (window.tf) window.tf.load(); };
      document.body.appendChild(script);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [email, onSubmit]);

  return (
    <div
      ref={containerRef}
      data-tf-live={formId}
      data-tf-hidden={`email=${encodeURIComponent(email)}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function LeadershipAssessment() {
  const [user, setUser] = useState(null);
  const [existingAssessment, setExistingAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingResults, setProcessingResults] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [processingTimeout, setProcessingTimeout] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const navigate = useNavigate();

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser?.email) {
        const assessments = await base44.entities.Assessment.filter(
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

  const startPollingForResults = useCallback(() => {
    if (!user?.email) return;

    setProcessingResults(true);
    setPollingAttempts(0);
    setProcessingTimeout(false);

    // Record what we had before so we can detect a NEW assessment
    const submittedAt = Date.now();
    
    const startTime = Date.now();
    const pollInterval = setInterval(async () => {
      try {
        const assessments = await base44.entities.Assessment.filter(
          { email: user.email },
          '-created_date',
          1
        );

        if (assessments.length > 0) {
          const latestAssessment = assessments[0];
          const createdAt = new Date(latestAssessment.created_date).getTime();
          // Accept any assessment created after we started polling (new submission)
          // Allow 60s back-window to catch webhook processing delay
          if (createdAt >= submittedAt - 60000) {
            clearInterval(pollInterval);
            toast.success('Assessment results ready!');
            setTimeout(() => {
              navigate('/my-leadership', { replace: true });
            }, 800);
            return;
          }
        }

        const elapsedTime = Date.now() - startTime;
        setPollingAttempts(Math.round((elapsedTime / MAX_POLLING_TIME) * 100));

        if (elapsedTime > MAX_POLLING_TIME) {
          clearInterval(pollInterval);
          setProcessingResults(false);
          navigate('/my-leadership', { replace: true });
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

      const { data } = await base44.functions.invoke('createTestAssessment', { 
        scenario,
        replace_existing: true 
      });

      if (data.success) {
        toast.success('Test assessment created!');
        setTimeout(() => {
          navigate(createPageUrl('AssessmentResults'));
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to create test assessment');
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
    if (urlParams.get('from_typeform') === 'true' && user) {
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
              <Progress value={Math.min(95, pollingAttempts)} className="h-2" />
              <p className="text-xs text-gray-500">Analyzing your responses...</p>
            </div>

            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
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
              <Link to="/my-leadership" className="block">
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

              <Link to="/my-leadership" className="block">
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
                <Link to="/my-leadership" className="block">
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
                      {['high_performer', 'average', 'developing', 'at_risk', 'incomplete'].map((scenario) => (
                        <Button
                          key={scenario}
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => createMockAssessment(scenario)}
                        >
                          {scenario.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Button>
                      ))}
                      <p className="text-xs text-gray-500 mt-2">
                        These test buttons replace your existing assessment with mock data
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Link to="/my-leadership" className="block">
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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
      <div className="px-6 pt-4 pb-2 bg-gradient-to-br from-slate-50 to-blue-50 shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Leadership Index Assessment
        </h1>
        <p className="text-gray-600 text-sm">
          Complete this assessment to discover your leadership strengths and opportunities
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <style>{`
          [data-tf-live] { width: 100% !important; height: 100% !important; display: block !important; }
          [data-tf-live] iframe { width: 100% !important; height: 100% !important; border: none !important; display: block !important; }
        `}</style>
        {user?.email ? (
          <TypeformEmbed formId={TYPEFORM_FORM_ID} email={user.email} onSubmit={startPollingForResults} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading Typeform... ensure you are logged in.
          </div>
        )}
      </div>

      <div className="px-6 py-3 bg-gradient-to-br from-slate-50 to-blue-50 text-center">
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
              className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden"
            >
              <p className="text-sm font-medium text-yellow-800 mb-3">
                🧪 Test Mode: Create Mock Assessments
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: 'High Performer', scenario: 'high_performer' },
                  { label: 'Average', scenario: 'average' },
                  { label: 'Developing', scenario: 'developing' },
                  { label: 'At Risk', scenario: 'at_risk' },
                  { label: 'Incomplete', scenario: 'incomplete' },
                ].map(({ label, scenario }) => (
                  <Button
                    key={scenario}
                    size="sm"
                    variant="outline"
                    onClick={() => createMockAssessment(scenario)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Click any scenario to create a test assessment and see the results immediately
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default withAuthProtection(LeadershipAssessment, {
  checkAccess: (user) => {
    if (['User Level 1', 'User Level 2'].includes(user.app_role)) {
      return true;
    }
    if (['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'].includes(user.app_role)) {
      const hasUserAddon = user.permissions?.includes('personal.assessments.view') || 
                          user.permissions?.includes('personal.assessments.take');
      const hasTeamLeaderAddon = user.permissions?.includes('team.assessments.view');
      return hasUserAddon || hasTeamLeaderAddon;
    }
    return false;
  }
});