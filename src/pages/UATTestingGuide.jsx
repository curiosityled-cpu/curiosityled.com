import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { getTestCasesForRole } from "@/components/uat/testCasesData";
import { useUATProgress } from "@/components/uat/useUATProgress";
import UATWelcomeModal from "@/components/uat/UATWelcomeModal";
import UATGuidedInterface from "@/components/uat/UATGuidedInterface";
import FloatingTestOverlay from "@/components/uat/FloatingTestOverlay";
import TestResultsForm from "@/components/uat/TestResultsForm";
import CompletionCelebration from "@/components/uat/CompletionCelebration";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function UATTestingGuide() {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showGuidedInterface, setShowGuidedInterface] = useState(false);
  const [showFloatingOverlay, setShowFloatingOverlay] = useState(false);
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeTest, setActiveTest] = useState(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);

  const testCases = getTestCasesForRole(user?.app_role || '');
  const uatProgress = useUATProgress(user?.email, user?.uat_cycle, testCases);

  const handleStartTesting = () => {
    setShowWelcome(false);
    setShowGuidedInterface(true);
  };

  const handleResetProgress = () => {
    uatProgress.resetProgress();
    setShowWelcome(false);
    setShowGuidedInterface(true);
  };

  const handleStartTest = (test) => {
    setActiveTest(test);
    setShowGuidedInterface(false);
    setShowFloatingOverlay(true);
    
    // Navigate to the feature page
    if (test.navigate_to) {
      window.location.href = createPageUrl(test.navigate_to);
    }
  };

  const handleSubmitResults = async () => {
    if (!user?.email || !user?.uat_cycle) return;
    
    // Check for duplicate submission
    try {
      const submissions = await base44.entities.UATSubmission.filter({
        test_case_id: activeTest.id,
        tester_email: user.email,
        uat_cycle: user.uat_cycle
      });

      if (submissions.length > 0) {
        setExistingSubmission(submissions[0]);
        setShowDuplicateWarning(true);
      } else {
        setShowResultsForm(true);
      }
    } catch (error) {
      console.error("Error checking for duplicate:", error);
      setShowResultsForm(true);
    }
  };

  const handleDuplicateContinue = () => {
    setShowDuplicateWarning(false);
    setShowResultsForm(true);
  };

  const handleDuplicateSkip = () => {
    setShowDuplicateWarning(false);
    setShowFloatingOverlay(false);
    uatProgress.goToNext();
    setShowGuidedInterface(true);
  };

  const handleSubmitSuccess = (status) => {
    uatProgress.markComplete(activeTest.id);
    setShowResultsForm(false);
    setShowFloatingOverlay(false);
    
    // Check if UAT is complete
    if (uatProgress.isComplete()) {
      setShowCelebration(true);
    } else {
      // Go to next test
      uatProgress.goToNext();
      setShowGuidedInterface(true);
    }
  };

  const handleMinimizeOverlay = () => {
    setShowFloatingOverlay(false);
    setShowGuidedInterface(true);
  };

  const handleCloseOverlay = () => {
    setShowFloatingOverlay(false);
    setShowGuidedInterface(true);
    setActiveTest(null);
  };

  const handleCloseGuidedInterface = () => {
    setShowGuidedInterface(false);
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    setShowGuidedInterface(false);
    window.location.href = createPageUrl("Dashboard");
  };

  // Calculate stats for celebration
  const [submissionStats, setSubmissionStats] = useState({ passCount: 0, failCount: 0, blockedCount: 0 });

  const stats = submissionStats;

  useEffect(() => {
    const fetchSubmissionStats = async () => {
      if (!user?.email || !user?.uat_cycle) return;
      
      try {
        const subs = await base44.entities.UATSubmission.filter({
          tester_email: user.email,
          uat_cycle: user.uat_cycle
        });
        setSubmissionStats({
          passCount: subs.filter(s => s.status === 'pass').length,
          failCount: subs.filter(s => s.status === 'fail').length,
          blockedCount: subs.filter(s => s.status === 'blocked').length
        });
      } catch (error) {
        console.error("Error fetching submission stats:", error);
      }
    };

    if (showCelebration) {
      fetchSubmissionStats();
    }
  }, [showCelebration, user?.email, user?.uat_cycle]);

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user?.is_uat_tester) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">UAT Access Required</h1>
          <p className="text-gray-600">
            You don't have access to UAT testing. Please contact your Platform Administrator.
          </p>
        </div>
      </div>
    );
  }

  if (testCases.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Test Cases Available</h1>
          <p className="text-gray-600">
            No test cases are configured for your role ({user.app_role}).
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Welcome Modal */}
      <UATWelcomeModal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        onStartTesting={handleStartTesting}
        onResetProgress={handleResetProgress}
        uatCycle={user.uat_cycle}
        completedCount={uatProgress.completedCount}
        totalCount={uatProgress.totalTests}
        hasProgress={uatProgress.completedCount > 0}
      />

      {/* Guided Interface */}
      {showGuidedInterface && (
        <UATGuidedInterface
          testCases={testCases}
          currentTest={uatProgress.currentTest}
          progress={uatProgress.progress}
          onStartTest={handleStartTest}
          onPrevious={uatProgress.goToPrevious}
          onNext={uatProgress.goToNext}
          onSelectTest={uatProgress.goToTest}
          onClose={handleCloseGuidedInterface}
          getCompletionPercentage={uatProgress.getCompletionPercentage}
          isTestAccessible={uatProgress.isTestAccessible}
        />
      )}

      {/* Floating Overlay */}
      {showFloatingOverlay && activeTest && (
        <FloatingTestOverlay
          test={activeTest}
          onSubmitResults={handleSubmitResults}
          onMinimize={handleMinimizeOverlay}
          onClose={handleCloseOverlay}
        />
      )}

      {/* Results Form */}
      {showResultsForm && activeTest && (
        <TestResultsForm
          open={showResultsForm}
          onClose={() => setShowResultsForm(false)}
          test={activeTest}
          user={user}
          uatCycle={user.uat_cycle}
          onSubmitSuccess={handleSubmitSuccess}
        />
      )}

      {/* Completion Celebration */}
      <CompletionCelebration
        open={showCelebration}
        onClose={handleCloseCelebration}
        completedCount={uatProgress.completedCount}
        totalCount={uatProgress.totalTests}
        passCount={stats.passCount}
        failCount={stats.failCount}
        blockedCount={stats.blockedCount}
      />

      {/* Duplicate Warning */}
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Test Already Submitted</AlertDialogTitle>
            <AlertDialogDescription>
              You've already submitted a result for this test case ({activeTest?.id}) in the current UAT cycle.
              {existingSubmission && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                  <p><strong>Previous Result:</strong> {existingSubmission.status}</p>
                  <p><strong>Date:</strong> {new Date(existingSubmission.test_date || existingSubmission.created_date).toLocaleDateString()}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDuplicateSkip}>Skip to Next Test</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateContinue}>Submit New Result Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}