import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minimize2, Send, FlaskConical, Loader2, CheckCircle, ArrowRight, AlertCircle, ChevronRight, Target, Lightbulb, Clock, XCircle, FileDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import CoachMessage from "@/components/ai/CoachMessage";
import TypingIndicator from "@/components/ai/TypingIndicator";
import FeatureSuggestionModal from "./FeatureSuggestionModal";
import GuidedNavigation from "./GuidedNavigation";
import GuidedOverlay from "./GuidedOverlay";

export default function UATTestingCoach({ onClose, onMinimize, user, assignedTests = [] }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [completedTests, setCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [isGuidedMode, setIsGuidedMode] = useState(true);
  const [showGuidedNav, setShowGuidedNav] = useState(false);
  const [isMinimizedForTesting, setIsMinimizedForTesting] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const nextTestTimeoutRef = useRef(null);
  const jumpOperationInProgress = useRef(false);
  const actionInProgress = useRef(false);

  const currentTest = assignedTests[currentTestIndex];
  const progressPercentage = assignedTests.length > 0 
    ? (completedTests.length / assignedTests.length) * 100 
    : 0;

  useEffect(() => {
    if (assignedTests.length === 0) {
      toast.error('No test cases assigned');
      setLoading(false);
      return;
    }
    
    let mounted = true;
    
    const init = async () => {
      if (mounted) {
        await initializeUATSession();
      }
    };
    
    init();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (nextTestTimeoutRef.current) {
        clearTimeout(nextTestTimeoutRef.current);
        nextTestTimeoutRef.current = null;
      }
      jumpOperationInProgress.current = false;
      actionInProgress.current = false;
      
      // Close guided overlay if active
      setShowGuidedNav(false);
      setIsMinimizedForTesting(false);
    };
  }, []);

  // Handle assignedTests prop changes
  useEffect(() => {
    if (assignedTests.length > 0 && currentTestIndex >= assignedTests.length) {
      setCurrentTestIndex(assignedTests.length - 1);
    }
  }, [assignedTests.length]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      // Delay scroll to ensure DOM is updated
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const initializeUATSession = async () => {
    if (!user?.email) {
      toast.error('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      // Check for existing UAT conversation for this user
      const existingConv = await base44.entities.Conversation.filter({
        type: 'uat_testing',
        status: 'active',
        created_by: user.email
      }, '-last_activity', 1);

      if (existingConv.length > 0) {
        // Resume existing session
        const conv = existingConv[0];
        setConversationId(conv.id);
        setMessages(Array.isArray(conv.messages) ? conv.messages : []);
        
        const resumedIndex = conv.context?.current_test_index || 0;
        const validIndex = Math.min(Math.max(0, resumedIndex), assignedTests.length - 1);
        setCurrentTestIndex(validIndex);
        
        const completedFromContext = Array.isArray(conv.context?.completed_tests) 
          ? conv.context.completed_tests 
          : [];
        setCompletedTests(completedFromContext);
      } else {
        // Create new UAT conversation
        const greeting = `Hi ${user?.full_name?.split(' ')[0] || 'there'}! 👋 

Welcome to your UAT testing session. I'm here to guide you through testing ${assignedTests.length} test cases.

**How this works:**
- I'll walk you through each test case step-by-step
- I'll show you exactly where to click and what to test
- You'll record your results as we go
- Let's ensure quality together!

Ready to start with your first test case?`;

        const greetingMsg = { role: "assistant", content: greeting, timestamp: new Date().toISOString() };
        
        const conv = await base44.entities.Conversation.create({
          title: `UAT Testing - ${new Date().toLocaleDateString()}`,
          type: 'uat_testing',
          status: 'active',
          messages: [greetingMsg],
          context: {
            current_test_index: 0,
            completed_tests: [],
            total_tests: assignedTests.length
          },
          last_activity: new Date().toISOString()
        });

        setConversationId(conv.id);
        setMessages([greetingMsg]);
      }
    } catch (error) {
      console.error('Error initializing UAT session:', error);
      toast.error('Failed to initialize UAT session. Please refresh and try again.');
      
      // Set a basic state to prevent blank screen
      setMessages([{
        role: "assistant",
        content: "⚠️ Unable to initialize UAT session. Please close and reopen the testing assistant.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startCurrentTest = async () => {
    if (!conversationId) {
      console.error('No conversation ID available');
      toast.error('Session not initialized');
      return;
    }

    if (currentTestIndex >= assignedTests.length) {
      console.error('Test index out of bounds');
      return;
    }

    if (!currentTest) {
      // All tests complete
      const completionMsg = {
        role: "assistant",
        content: `🎉 **Congratulations!** You've completed all ${assignedTests.length} test cases!

**Summary:**
- ✅ Passed: ${completedTests.filter(t => t.status === 'Passed').length}
- ❌ Failed: ${completedTests.filter(t => t.status === 'Failed').length}
- ⚠️ Blocked: ${completedTests.filter(t => t.status === 'Blocked').length}

Your feedback is invaluable for improving our platform. Thank you!`,
        timestamp: new Date().toISOString()
      };

      const updated = [...messages, completionMsg];
      setMessages(updated);
      
      try {
        await base44.entities.Conversation.update(conversationId, {
          messages: updated,
          status: 'completed',
          last_activity: new Date().toISOString()
        });
      } catch (convError) {
        console.warn('Failed to mark conversation as completed:', convError);
      }
      
      return;
    }

    // Introduce current test
    const hasGuidedSteps = currentTest.guided_steps && Array.isArray(currentTest.guided_steps) && currentTest.guided_steps.length > 0;

    const testIntroMsg = {
      role: "assistant",
      content: `**Test Case ${currentTestIndex + 1}/${assignedTests.length}:** ${currentTest.test_case_id || 'Unknown'}

    **Feature Area:** ${currentTest.feature_area || 'Not specified'}

    **What to test:**
    ${currentTest.description || 'No description provided'}

    **Expected outcome:**
    ${currentTest.expected_outcome || 'No expected outcome specified'}

    ${hasGuidedSteps ? `📍 I'll guide you step-by-step through this test. Click "Start Guided Test" to begin!` : `Ready to begin testing? Navigate to the feature and record your findings when done.`}`,
      timestamp: new Date().toISOString(),
      testCaseIntro: true,
      testData: currentTest
    };

    const updatedMessages = [...messages, testIntroMsg];
    setMessages(updatedMessages);

    try {
      await base44.entities.Conversation.update(conversationId, {
        messages: updatedMessages,
        last_activity: new Date().toISOString()
      });
    } catch (convError) {
      console.warn('Failed to save test intro:', convError);
      // Non-critical - message is in state
    }
    };

    const beginGuidedTest = () => {
    if (!currentTest?.guided_steps || !Array.isArray(currentTest.guided_steps) || currentTest.guided_steps.length === 0) {
      toast.error('No guided steps available for this test case');
      return;
    }

    if (showGuidedNav) {
      toast.info('Guided test is already active');
      return;
    }

    // Close any open modals before starting guided test
    setShowSuggestionModal(false);

    setShowGuidedNav(true);
    setIsMinimizedForTesting(true);
  };

  const handleGuidedComplete = async () => {
    setShowGuidedNav(false);
    setIsMinimizedForTesting(false);
    
    if (!conversationId) {
      console.error('No conversation ID available');
      return;
    }

    try {
      // Expand coach and prompt for feedback
      const feedbackMsg = {
        role: "assistant",
        content: `✅ **Test guidance completed!**

Now, please share your findings:
- Did the feature work as expected?
- Use the quick action buttons or describe what happened`,
        timestamp: new Date().toISOString()
      };

      const updated = [...messages, feedbackMsg];
      setMessages(updated);

      await base44.entities.Conversation.update(conversationId, {
        messages: updated,
        last_activity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error('Failed to update conversation');
    }
  };

  const handleNeedHelp = async () => {
    setShowGuidedNav(false);
    setIsMinimizedForTesting(false);
    
    if (!conversationId) {
      toast.info("Describe what you're experiencing in the chat");
      return;
    }

    try {
      const helpMsg = {
        role: "assistant",
        content: "I'm here to help! Describe what you're experiencing and I'll assist you.",
        timestamp: new Date().toISOString()
      };

      const updated = [...messages, helpMsg];
      setMessages(updated);

      try {
        await base44.entities.Conversation.update(conversationId, {
          messages: updated,
          last_activity: new Date().toISOString()
        });
      } catch (convError) {
        console.warn('Failed to update conversation:', convError);
      }
    } catch (error) {
      console.error('Error handling help request:', error);
    }
    
    toast.info("Describe what you're experiencing in the chat");
  };

  const navigateToTestFeature = () => {
    if (!currentTest?.navigate_to) {
      toast.error('No navigation URL specified for this test');
      return;
    }

    // Validate the page name exists (basic check)
    if (!currentTest.navigate_to.trim()) {
      toast.error('Invalid navigation URL');
      return;
    }

    // Close guided overlay if active before navigation
    if (showGuidedNav) {
      setShowGuidedNav(false);
      setIsMinimizedForTesting(false);
    }
    
    toast.success(`Navigating to ${currentTest.feature_area}...`);
    setTimeout(() => {
      try {
        window.location.href = createPageUrl(currentTest.navigate_to);
      } catch (error) {
        console.error('Navigation error:', error);
        toast.error('Failed to navigate. Please navigate manually.');
      }
    }, 1000);
  };

  const recordTestResult = async (status, severity, notes) => {
    if (!currentTest) {
      toast.error('No active test case');
      return;
    }

    if (!conversationId) {
      toast.error('No active conversation');
      return;
    }

    if (!status || !['Passed', 'Failed', 'Blocked'].includes(status)) {
      toast.error('Invalid test status');
      return;
    }

    // Prevent double-submission
    if (actionInProgress.current) {
      return;
    }
    actionInProgress.current = true;

    try {
      // Create test run record
      const testRun = {
        tester_name: user?.full_name || 'Unknown',
        tester_email: user?.email || '',
        status,
        test_date: new Date().toISOString(),
        actual_outcome: notes || '',
        severity: severity || '',
        notes: notes || ''
      };

      // Update test case with new run
      const testCase = await base44.entities.UATTestCase.filter({ 
        test_case_id: currentTest.test_case_id,
        assigned_tester_email: user.email
      });
      
      if (!testCase || testCase.length === 0) {
        toast.error('Test case not found or not assigned to you');
        return;
      }

      const existing = testCase[0];
      
      // Check for recent duplicate (within last 5 seconds)
      const existingRuns = Array.isArray(existing.test_runs) ? existing.test_runs : [];
      const now = Date.now();
      const recentDuplicate = existingRuns.find(run => {
        try {
          return run.status === status &&
                 run.tester_email === user.email &&
                 new Date(run.test_date).getTime() > now - 5000;
        } catch (e) {
          return false;
        }
      });

      if (recentDuplicate) {
        toast.info('Test already recorded');
        return;
      }

      const updatedRuns = [...existingRuns, testRun];
      
      if (!existing.id) {
        throw new Error('Test case ID is missing');
      }

      await base44.entities.UATTestCase.update(existing.id, {
        test_runs: updatedRuns
      });

      // Mark as completed (avoid duplicates)
      const alreadyCompleted = completedTests.some(t => t.test_case_id === currentTest.test_case_id);
      const newCompleted = alreadyCompleted 
        ? completedTests 
        : [...completedTests, { ...currentTest, status, severity }];
      setCompletedTests(newCompleted);

      // Add confirmation message
      const confirmMsg = {
        role: "assistant",
        content: `✅ Test result recorded: **${status}**${severity ? ` (${severity} severity)` : ''}

${notes ? `Your notes: "${notes}"` : ''}

${currentTestIndex + 1 < assignedTests.length 
  ? `Great! Moving to the next test case...` 
  : `That was the last test! Preparing your summary...`}`,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...messages, confirmMsg];
      setMessages(updatedMessages);

      // Move to next test first (optimistic update)
      const nextIndex = currentTestIndex + 1;
      setCurrentTestIndex(nextIndex);

      // Update conversation in background
      try {
        await base44.entities.Conversation.update(conversationId, {
          messages: updatedMessages,
          context: {
            current_test_index: nextIndex,
            completed_tests: newCompleted,
            total_tests: assignedTests.length
          },
          last_activity: new Date().toISOString()
        });
      } catch (convError) {
        console.warn('Failed to update conversation:', convError);
        // Non-critical - test result is already recorded
      }
      
      // Short delay before showing next test
      if (nextTestTimeoutRef.current) {
        clearTimeout(nextTestTimeoutRef.current);
        nextTestTimeoutRef.current = null;
      }
      nextTestTimeoutRef.current = setTimeout(() => {
        if (nextIndex < assignedTests.length) {
          startCurrentTest();
        }
      }, 1500);

    } catch (error) {
      console.error('Error recording test result:', error);
      toast.error(error.message || 'Failed to record test result');
    } finally {
      actionInProgress.current = false;
    }
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    setInputValue("");
    setIsTyping(true);

    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);

    try {
      // Save user message
      if (!conversationId) {
        setIsTyping(false);
        toast.error('Session not initialized');
        return;
      }
      
      try {
        await base44.entities.Conversation.update(conversationId, {
          messages: updated,
          last_activity: new Date().toISOString()
        });
      } catch (convError) {
        console.warn('Failed to save user message to conversation:', convError);
        // Continue with processing - not critical
      }

      // Check for commands
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('start') || lowerText.includes('begin') || lowerText.includes('ready')) {
        await startCurrentTest();
        setIsTyping(false);
        return;
      }

      if (lowerText.includes('pass')) {
        await recordTestResult('Passed', null, text);
        setIsTyping(false);
        return;
      }

      if (lowerText.includes('fail')) {
        const severity = lowerText.includes('critical') ? 'Critical' :
                        lowerText.includes('high') ? 'High' :
                        lowerText.includes('medium') ? 'Medium' : 'Low';
        await recordTestResult('Failed', severity, text);
        setIsTyping(false);
        return;
      }

      if (lowerText.includes('block')) {
        await recordTestResult('Blocked', 'Medium', text);
        setIsTyping(false);
        return;
      }

      // General conversational response
      if (!currentTest) {
        const response = "Please select a test case to begin, or type 'start' to begin the first test.";
        const assistantMsg = { role: "assistant", content: response, timestamp: new Date().toISOString() };
        const final = [...updated, assistantMsg];
        setMessages(final);

        try {
          if (conversationId) {
            await base44.entities.Conversation.update(conversationId, {
              messages: final,
              last_activity: new Date().toISOString()
            });
          }
        } catch (convError) {
          console.warn('Failed to save response to conversation:', convError);
        }
        setIsTyping(false);
        return;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful UAT testing assistant. The user is testing: ${currentTest.description || 'a feature'}.
        
User said: "${text}"

Provide a brief, helpful response. If they seem confused, guide them through the testing steps. If they're reporting an issue, acknowledge it and ask if they want to mark it as Failed.

Keep response under 100 words.`
      });

      const assistantMsg = { role: "assistant", content: response, timestamp: new Date().toISOString() };
      const final = [...updated, assistantMsg];
      setMessages(final);

      try {
        if (conversationId) {
          await base44.entities.Conversation.update(conversationId, {
            messages: final,
            last_activity: new Date().toISOString()
          });
        }
      } catch (convError) {
        console.warn('Failed to save response to conversation:', convError);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsTyping(false);
    }
  };

  const renderQuickActions = () => {
    if (!currentTest || completedTests.some(t => t.test_case_id === currentTest.test_case_id)) {
      return null;
    }

    return (
      <div className="px-4 pb-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => recordTestResult('Passed', null, 'Test passed as expected')}
            disabled={actionInProgress.current}
            className="text-green-600 hover:bg-green-50 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Pass
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const notes = prompt('Describe the issue:');
              if (notes && notes.trim()) {
                recordTestResult('Failed', 'Medium', notes);
              }
            }}
            disabled={actionInProgress.current}
            className="text-red-600 hover:bg-red-50 border-red-200"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Fail
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const notes = prompt('What is blocking this test?');
              if (notes && notes.trim()) {
                recordTestResult('Blocked', 'Medium', notes);
              }
            }}
            disabled={actionInProgress.current}
            className="text-orange-600 hover:bg-orange-50 border-orange-200"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Blocked
          </Button>
          {currentTest.navigate_to && (
            <Button
              size="sm"
              variant="outline"
              onClick={navigateToTestFeature}
              style={{ color: '#0202ff', borderColor: 'rgba(2, 2, 255, 0.3)' }}
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              Go to Feature
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSuggestionModal(true)}
            className="text-yellow-600 hover:bg-yellow-50 border-yellow-200"
          >
            <Lightbulb className="w-3 h-3 mr-1" />
            Suggest Feature
          </Button>
        </div>
      </div>
    );
  };

  const jumpToTest = async (index) => {
    if (!conversationId) {
      toast.error('Session not initialized');
      return;
    }

    if (index < 0 || index >= assignedTests.length) {
      toast.error('Invalid test case index');
      return;
    }

    // Prevent race conditions with concurrent jumps
    if (jumpOperationInProgress.current) {
      return;
    }
    jumpOperationInProgress.current = true;

    // Clear any pending navigation timeout
    if (nextTestTimeoutRef.current) {
      clearTimeout(nextTestTimeoutRef.current);
      nextTestTimeoutRef.current = null;
    }

    // Close guided overlay if active
    if (showGuidedNav) {
      setShowGuidedNav(false);
      setIsMinimizedForTesting(false);
    }

    try {
      setCurrentTestIndex(index);
      setIsGuidedMode(false);
      await startCurrentTest();
    } catch (error) {
      console.error('Error jumping to test:', error);
      toast.error('Failed to load test case');
    } finally {
      jumpOperationInProgress.current = false;
    }
  };

  const getTestStatus = (test) => {
    if (!test?.test_case_id) return 'pending';
    
    const completed = completedTests.find(t => t?.test_case_id === test.test_case_id);
    if (completed?.status) {
      return completed.status;
    }
    return currentTest?.test_case_id === test.test_case_id ? 'in-progress' : 'pending';
  };

  const downloadCSVTemplate = async () => {
    if (!user?.email) {
      toast.error('User not authenticated');
      return;
    }

    if (assignedTests.length === 0) {
      toast.error('No test cases to export');
      return;
    }

    let loadingToast;
    try {
      loadingToast = toast.loading('Generating CSV template...');
      
      // Call backend function that returns CSV data
      const response = await base44.functions.invoke('generateUATCsv', {});
      
      if (!response) {
        throw new Error('No data returned from server');
      }

      if (loadingToast) toast.dismiss(loadingToast);

      // Extract CSV data from response (it's wrapped in JSON)
      let csvData;
      if (typeof response === 'string') {
        csvData = response;
      } else if (response?.data && typeof response.data === 'string') {
        csvData = response.data;
      } else if (typeof response === 'object') {
        // Response might be the direct object from the function
        csvData = JSON.stringify(response);
      } else {
        throw new Error('Invalid CSV data format from server');
      }
      
      if (!csvData) {
        throw new Error('Empty CSV data from server');
      }
      
      // Create blob and download with validation
      if (!csvData || csvData.length === 0) {
        throw new Error('CSV data is empty');
      }

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      
      if (blob.size === 0) {
        throw new Error('Failed to create CSV file');
      }

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `uat-testing-template-${new Date().toISOString().split('T')[0]}.csv`;
      
      // Attempt download with error handling
      try {
        document.body.appendChild(link);
        link.click();
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        throw new Error('Failed to trigger download');
      }
      
      // Cleanup with error handling
      setTimeout(() => {
        try {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
        } catch (cleanupError) {
          console.warn('Cleanup error after CSV download:', cleanupError);
        }
      }, 100);
      
      toast.success('CSV template downloaded');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error('Failed to generate CSV template');
    }
  };

  const handleCSVUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input immediately to allow re-upload of same file
    const currentFile = file;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!conversationId) {
      toast.error('Session not initialized. Please wait for session to load.');
      return;
    }

    if (!user?.email) {
      toast.error('User not authenticated');
      return;
    }

    // Validate file extension
    if (!currentFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    // Validate MIME type
    if (currentFile.type && !['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/csv'].includes(currentFile.type)) {
      toast.error('Invalid file type. Please upload a valid CSV file.');
      return;
    }

    // Validate file size (max 5MB)
    if (currentFile.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    let loadingToast;
    try {
      loadingToast = toast.loading('Processing CSV file...');

      // Upload file first to get URL
      const uploadResult = await base44.integrations.Core.UploadFile({ file: currentFile });
      
      if (!uploadResult?.file_url) {
        throw new Error('Failed to upload file');
      }
      
      // Process CSV via backend function
      const result = await base44.functions.invoke('processUATCsv', { 
        fileUrl: uploadResult.file_url 
      });

      if (loadingToast) toast.dismiss(loadingToast);

      if (result?.success !== false) {
        const processedCount = result?.processed || 0;
        const errorDetailsArray = Array.isArray(result?.errorDetails) ? result.errorDetails : [];
        
        toast.success(result?.message || `Successfully processed ${processedCount} test result(s)`);

        if (errorDetailsArray.length > 0) {
          console.warn('CSV import warnings:', errorDetailsArray);
        }

        // Note: Test cases will be refreshed on next session load
        // No need to reload here as it could cause UI confusion

        // Refresh conversation
        const confirmMsg = {
          role: "assistant",
          content: `✅ **CSV Upload Complete**

${result?.message || 'CSV processed successfully'}

${errorDetailsArray.length > 0 
  ? `\n⚠️ Some rows had issues:\n${errorDetailsArray.slice(0, 3).map(e => `- ${e}`).join('\n')}${errorDetailsArray.length > 3 ? `\n...and ${errorDetailsArray.length - 3} more` : ''}` 
  : ''}

Your feedback has been recorded. Thank you!`,
          timestamp: new Date().toISOString()
        };

        const updated = [...messages, confirmMsg];
        setMessages(updated);

        try {
          if (conversationId) {
            await base44.entities.Conversation.update(conversationId, {
              messages: updated,
              last_activity: new Date().toISOString()
            });
          }
        } catch (convError) {
          console.warn('Failed to update conversation after CSV upload:', convError);
        }
      } else {
        throw new Error(result?.error || result?.message || 'Failed to process CSV');
      }

    } catch (error) {
      console.error('Error uploading CSV:', error);
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to process CSV file');
    }
  };

  // Validate required props — after all hooks
  if (!user?.email) return null;

  return (
    <>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: isMinimizedForTesting ? 0.8 : 1, 
          opacity: isMinimizedForTesting ? 0 : 1,
          y: isMinimizedForTesting ? 50 : 0
        }}
        transition={{ duration: 0.2 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className={`fixed bottom-6 right-6 w-full max-w-[800px] h-[600px] md:w-[800px] bg-white rounded-2xl shadow-2xl border-2 flex overflow-hidden z-50 ${isMinimizedForTesting ? 'pointer-events-none opacity-0' : ''}`}
        style={{ borderColor: '#0202ff' }}
        role="dialog"
        aria-label="UAT Testing Assistant"
        aria-hidden={isMinimizedForTesting}
      >
        {/* Left Sidebar - Test Cases List */}
        <div className="w-72 border-r bg-gray-50 flex flex-col flex-shrink-0" role="navigation" aria-label="Test cases list">
          <div className="p-4 border-b" style={{ backgroundColor: '#0202ff' }}>
            <h3 className="font-semibold text-white text-sm mb-1">Your Test Cases</h3>
            <p className="text-xs text-white/80">{completedTests.length} of {assignedTests.length} completed</p>
          </div>
          
          <div className="px-3 py-2 border-b bg-white">
            <Button
              size="sm"
              variant={isGuidedMode ? "default" : "outline"}
              onClick={() => {
                setIsGuidedMode(true);
                if (currentTest && conversationId) {
                  startCurrentTest();
                }
              }}
              className="w-full justify-start text-xs"
              style={isGuidedMode ? { backgroundColor: '#0202ff' } : {}}
              disabled={!conversationId}
              aria-label="Follow guided testing flow"
            >
              <Target className="w-3 h-3 mr-2" />
              Follow Guided Flow
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {assignedTests.map((test, index) => {
                const status = getTestStatus(test);
                const isCurrent = currentTest?.test_case_id === test.test_case_id;

                return (
                  <button
                    key={test.test_case_id || `test-${index}`}
                    onClick={() => jumpToTest(index)}
                    disabled={!conversationId}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${
                      isCurrent 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-white hover:bg-gray-50 border-gray-200'
                    } ${!conversationId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`Test case ${index + 1}: ${test.feature_area || 'Unknown'} - Status: ${status}`}
                    aria-current={isCurrent ? 'true' : 'false'}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {status === 'Passed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {status === 'Failed' && <XCircle className="w-4 h-4 text-red-600" />}
                        {status === 'Blocked' && <AlertCircle className="w-4 h-4 text-orange-600" />}
                        {status === 'in-progress' && (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                        )}
                        {status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            #{index + 1}
                          </Badge>
                          {status !== 'pending' && status !== 'in-progress' && (
                            <Badge 
                              className={`text-[10px] px-1.5 py-0 ${
                                status === 'Passed' ? 'bg-green-100 text-green-800' :
                                status === 'Failed' ? 'bg-red-100 text-red-800' :
                                status === 'Blocked' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-900 mb-1 truncate">
                          {test.feature_area || 'No feature area'}
                        </p>
                        <p className="text-[10px] text-gray-500 line-clamp-2">
                          {test.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">
                Progress
              </span>
              <span className="text-xs text-gray-500">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 border-b flex-shrink-0"
            style={{ backgroundColor: '#0202ff' }}
          >
            <div className="flex items-center gap-3">
              <FlaskConical className="w-6 h-6 text-white" />
              <div>
                <h3 className="font-semibold text-white">UAT Testing Assistant</h3>
                <p className="text-xs text-white opacity-90">
                  {currentTest ? `Testing: ${currentTest.feature_area}` : 'Select a test to begin'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onMinimize} 
                className="text-white hover:bg-white/20 h-9 w-9"
                title="Minimize"
                aria-label="Minimize testing assistant"
                disabled={showGuidedNav}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  if (showGuidedNav) {
                    setShowGuidedNav(false);
                    setIsMinimizedForTesting(false);
                  }
                  onClose();
                }}
                className="text-white hover:bg-white/20 h-9 w-9"
                title={showGuidedNav ? "Exit guided test and close" : "Close"}
                aria-label={showGuidedNav ? "Exit guided test and close assistant" : "Close testing assistant"}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#0202ff' }} />
                <p className="text-sm text-gray-500">Loading your tests...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef} role="log" aria-label="Test conversation messages">
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={`${idx}-${msg.timestamp || idx}`}>
                      <CoachMessage message={msg} />
                      
                      {/* Show action buttons after test intro */}
                      {msg.testCaseIntro && msg.testData && (
                        <div className="mt-3 flex gap-2">
                          {msg.testData.guided_steps && Array.isArray(msg.testData.guided_steps) && msg.testData.guided_steps.length > 0 ? (
                            <Button
                              size="sm"
                              onClick={beginGuidedTest}
                              style={{ backgroundColor: '#0202ff' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              Start Guided Test
                            </Button>
                          ) : msg.testData.navigate_to ? (
                            <Button
                              size="sm"
                              onClick={navigateToTestFeature}
                              style={{ backgroundColor: '#0202ff' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                            >
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Start Test
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && <TypingIndicator />}
                </div>
              </ScrollArea>

              {/* Quick Actions */}
              {renderQuickActions()}

              {/* Input */}
              <div className="p-4 border-t flex-shrink-0" role="form" aria-label="Test feedback form">
                <div className="flex gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSuggestionModal(true)}
                    className="text-yellow-600 hover:bg-yellow-50 border-yellow-200 flex-1"
                  >
                    <Lightbulb className="w-3 h-3 mr-2" />
                    Suggest Feature
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCSVTemplate}
                    className="text-blue-600 hover:bg-blue-50 border-blue-200 flex-1"
                    disabled={!user?.email || assignedTests.length === 0}
                  >
                    <FileDown className="w-3 h-3 mr-2" />
                    Download CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-green-600 hover:bg-green-50 border-green-200 flex-1"
                    disabled={!user?.email || !conversationId}
                  >
                    <Upload className="w-3 h-3 mr-2" />
                    Upload CSV
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Describe what you observed or ask for help..."
                    className="flex-1 resize-none text-sm"
                    rows={2}
                    disabled={isTyping}
                    maxLength={2000}
                    aria-label="Test feedback message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping}
                    className="h-auto self-end"
                    style={{ backgroundColor: '#0202ff' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                    size="icon"
                  >
                    {isTyping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Guided Navigation Overlay */}
      <AnimatePresence>
        {showGuidedNav && currentTest?.guided_steps && Array.isArray(currentTest.guided_steps) && currentTest.guided_steps.length > 0 && (
          <GuidedOverlay
            steps={currentTest.guided_steps}
            onComplete={handleGuidedComplete}
            onSkip={() => {
              setShowGuidedNav(false);
              setIsMinimizedForTesting(false);
            }}
            onNeedHelp={handleNeedHelp}
          />
        )}
      </AnimatePresence>

      {/* Feature Suggestion Modal */}
      <FeatureSuggestionModal
        isOpen={showSuggestionModal}
        onClose={() => setShowSuggestionModal(false)}
        userEmail={user?.email}
        uatCycle={user?.uat_cycle}
        relatedTestCaseId={currentTest?.test_case_id}
      />
    </>
  );
}