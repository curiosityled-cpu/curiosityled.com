import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minimize2, Send, Brain, Loader2, Sparkles, History, Download, FileText, ChevronDown, ChevronUp, Trash2, Plus, AlertCircle, Paperclip, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import CoachMessage from "./CoachMessage";
import { invalidateCrossSessionCache } from "./CrossSessionCache";
import TypingIndicator from "./TypingIndicator";
import SuggestionChips from "./SuggestionChips";
import ProactiveInsightsAlert from "./ProactiveInsightsAlert";
import { usePageContext } from "@/Layout";
import ScheduleCalendarEventModal from "./modals/ScheduleCalendarEventModal";
import ActionConfirmationModal from "./ActionConfirmationModal";
import SmartFormModal from "./modals/SmartFormModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { getCrossSessionContext } from "./CrossSessionCache";
import { getToolsForUser, getFileUploadTools } from "./agentTools";
import WorkflowProgressIndicator from "./WorkflowProgressIndicator";
import ConversationPagination from "./ConversationPagination";
import { queueRequest } from "./RequestQueue";
import StrategicAssistant from "./StrategicAssistant";
import LearningModuleCoach from "./LearningModuleCoach";
import WorkflowSuggestionsPanel from "./WorkflowSuggestionsPanel";
import { buildAtreusSystemPrompt } from "./atreusSystemPrompt";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AtreusCoach({
  context = {},
  isMinimized = false,
  onMinimize,
  onClose,
  strategicMode = false,
  riskData = null,
  learningModuleMode = false,
  moduleData = null
}) {
  const { user, appRole, userPermissions } = useAuth();
  const { updatePageContext } = usePageContext() || { updatePageContext: () => {} };
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [exportingText, setExportingText] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showConversationIndex, setShowConversationIndex] = useState(false);
  const scrollRef = useRef(null);

  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [showScheduleCalendarModal, setShowScheduleCalendarModal] = useState(false);
  const [suggestedCalendarEvent, setSuggestedCalendarEvent] = useState(null);

  // Agent action state
  const [pendingActionConfirmation, setPendingActionConfirmation] = useState(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  
  // Smart form state
  const [showSmartForm, setShowSmartForm] = useState(false);
  const [smartFormType, setSmartFormType] = useState(null);
  const [smartFormData, setSmartFormData] = useState({});

  // Workflow state
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [workflowSuggestions, setWorkflowSuggestions] = useState([]);

  const [isInitialized, setIsInitialized] = useState(false);
  const isMountedRef = useRef(true);
  
  // File upload state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const handleApiCall = async (apiFunc, priority = 'normal') => queueRequest(apiFunc, priority);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMinimized && !isInitialized) {
      setIsInitialized(true);
      const initializeCoach = async () => {
        try {
          await loadOrCreateConversation();
          await new Promise(resolve => setTimeout(resolve, 300));
          await loadConversationsList();
        } catch (error) {
          console.error('Error initializing coach:', error);
          if (error?.message?.includes('Rate limit')) {
            toast.error('Too many requests. Please wait a moment and try again.');
          }
        }
      };
      initializeCoach();
    }
  }, [isMinimized, isInitialized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load proactive insights when Atreus opens
  useEffect(() => {
    if (!isMinimized && user) {
      loadProactiveInsights();
    }
  }, [isMinimized, user]);

  const loadProactiveInsights = async () => {
    try {
      const response = await base44.functions.invoke('generateProactiveInsights', {
        scope: appRole === 'User Level 1' ? 'personal' : 'team'
      });

      if (response.data.success && response.data.insights.length > 0) {
        // Add insights to context for suggestions
        updatePageContext({ proactive_insights: response.data.insights });
      }
    } catch (error) {
      console.error('Error loading proactive insights:', error);
    }
  };

  useEffect(() => {
    const newSuggestions = getContextualSuggestions();
    setSuggestions(newSuggestions);
  }, [context?.pageType, context?.viewport_focus?.focused_section, context?.available_actions?.length, context?.visible_data_summary, context?.proactive_insights, appRole, messages.length, context?.visible_data_summary?.active_goals, context?.visible_data_summary?.at_risk_goals]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const allowedTypes = ['.csv', '.xlsx', '.pdf', '.png', '.jpg', '.jpeg', '.txt'];
    const invalidFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return !allowedTypes.includes(ext);
    });

    if (invalidFiles.length > 0) {
      toast.error(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Validate file sizes (10MB for data files, 5MB for images)
    const oversizedFiles = files.filter(file => {
      const isDataFile = file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
      const maxSize = isDataFile ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      return file.size > maxSize;
    });

    if (oversizedFiles.length > 0) {
      toast.error(`File(s) too large: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploadingFile(true);
    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push({
          url: result.file_url,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      }

      setAttachedFiles(prev => [...prev, ...uploadedUrls]);
      toast.success(`Uploaded ${files.length} file(s)`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file(s)');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoadMoreMessages = (olderMessages) => {
    setMessages(prev => [...olderMessages, ...prev]);
  };

  const formatPageName = (pageType) => {
    if (!pageType) return 'Untitled Conversation';
    return pageType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const loadOrCreateConversation = async () => {
    setLoadingConversation(true);
    try {
      // First, check for existing active conversation with retry
      const activeConversations = await handleApiCall(() =>
        base44.entities.Conversation.filter({
          status: 'active',
          type: 'general'
        }, '-last_activity', 1)
      );

      if (activeConversations.length > 0) {
        // Continue the most recent active conversation
        const conversation = activeConversations[0];
        if (!isMountedRef.current) return;
        setConversationId(conversation.id);
        // Limit messages to last 100 for performance
        const messages = conversation.messages || [];
        
        // DYNAMIC GREETING: Regenerate greeting based on current context
        if (messages.length > 0 && messages[0].role === 'assistant') {
          const newGreeting = getContextualGreeting();
          const updatedMessages = [...messages];
          updatedMessages[0] = {
            ...updatedMessages[0],
            content: newGreeting,
            timestamp: new Date().toISOString()
          };
          
          // Update conversation with new greeting
          await handleApiCall(() =>
            base44.entities.Conversation.update(conversation.id, {
              messages: updatedMessages,
              last_activity: new Date().toISOString()
            })
          );
          
          setMessages(updatedMessages.slice(-100));
        } else {
          setMessages(messages.slice(-100));
        }
        
        setLoadingConversation(false);
        return;
      }

      // Small delay before next API call to avoid rate limit
      await new Promise(resolve => setTimeout(resolve, 200));

      // If no active conversation, check for paused conversations
      const pausedConversations = await handleApiCall(() =>
        base44.entities.Conversation.filter({
          status: 'paused',
          type: 'general'
        }, '-last_activity', 1)
      );

      if (pausedConversations.length > 0) {
        // Resume the most recent paused conversation
        const conversation = pausedConversations[0];
        
        // Small delay before update
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const messages = conversation.messages || [];
        
        // DYNAMIC GREETING: Regenerate greeting based on current context
        const updatedMessages = [...messages];
        if (updatedMessages.length > 0 && updatedMessages[0].role === 'assistant') {
          const newGreeting = getContextualGreeting();
          updatedMessages[0] = {
            ...updatedMessages[0],
            content: newGreeting,
            timestamp: new Date().toISOString()
          };
        }
        
        await handleApiCall(() =>
          base44.entities.Conversation.update(conversation.id, {
            status: 'active',
            messages: updatedMessages,
            last_activity: new Date().toISOString()
          })
        );
        if (!isMountedRef.current) return;
        setConversationId(conversation.id);
        setMessages(updatedMessages.slice(-100));
        setLoadingConversation(false);
        return;
      }

      // Small delay before creation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Only create a new conversation if none exist
      const pageType = context?.pageType || 'dashboard';
      const greeting = getContextualGreeting();
      const greetingMessage = {
        role: "assistant",
        content: greeting,
        timestamp: new Date().toISOString()
      };

      const newConversation = await handleApiCall(() =>
        base44.entities.Conversation.create({
          title: `Conversation on ${formatPageName(pageType)}`,
          type: 'general',
          status: 'active',
          messages: [greetingMessage],
          context: {
            pageType: pageType,
            userRole: appRole,
            startedAt: new Date().toISOString()
          },
          last_activity: new Date().toISOString()
        })
      );

      if (!isMountedRef.current) return;
      setConversationId(newConversation.id);
      setMessages([greetingMessage]);
    } catch (error) {
      console.error('Error loading conversation:', error);
      if (!isMountedRef.current) return;
      
      const isRateLimit = error?.message?.includes('Rate limit') || error?.message?.includes('rate limit');
      if (isRateLimit) {
        toast.error('Too many requests. Please wait a moment before opening Atreus again.');
      }
      
      const greeting = getContextualGreeting();
      setMessages([{
        role: "assistant",
        content: greeting,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      if (isMountedRef.current) {
        setLoadingConversation(false);
      }
    }
  };

  const loadConversationsList = async () => {
    try {
      const allConversations = await handleApiCall(() =>
        base44.entities.Conversation.filter({ type: 'general' }, '-last_activity', 50)
      );
      if (!isMountedRef.current) return;
      setConversations(allConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      if (isMountedRef.current && error?.message?.includes('Rate limit')) {
        toast.error('Loading conversations failed. Please refresh in a moment.');
      }
    }
  };

  const startNewConversation = async () => {
    try {
      if (conversationId) {
        await handleApiCall(() =>
          base44.entities.Conversation.update(conversationId, {
            status: 'paused'
          })
        );
      }

      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 200));

      const greeting = getContextualGreeting();
      const greetingMessage = {
        role: "assistant",
        content: greeting,
        timestamp: new Date().toISOString()
      };

      const newConversation = await handleApiCall(() =>
        base44.entities.Conversation.create({
          title: `Conversation on ${formatPageName(context?.pageType || 'dashboard')}`,
          type: 'general',
          status: 'active',
          messages: [greetingMessage],
          context: {
            pageType: context?.pageType,
            userRole: appRole,
            startedAt: new Date().toISOString()
          },
          last_activity: new Date().toISOString()
        })
      );

      if (!isMountedRef.current) return;
      setConversationId(newConversation.id);
      setMessages([greetingMessage]);

      // Delay before loading list
      await new Promise(resolve => setTimeout(resolve, 200));
      await loadConversationsList();
      
      if (isMountedRef.current) {
        toast.success('Started new conversation');
      }
    } catch (error) {
      console.error('Error starting new conversation:', error);
      if (isMountedRef.current) {
        const isRateLimit = error?.message?.includes('Rate limit') || error?.message?.includes('rate limit');
        toast.error(isRateLimit 
          ? 'Too many requests. Please wait a moment before creating a new conversation.' 
          : 'Failed to start new conversation');
      }
    }
  };

  const loadConversation = async (conversation) => {
    try {
      if (conversationId && conversationId !== conversation.id) {
        await handleApiCall(() =>
          base44.entities.Conversation.update(conversationId, {
            status: 'paused'
          })
        );
      }

      if (!isMountedRef.current) return;
      setConversationId(conversation.id);
      
      // DYNAMIC GREETING: Regenerate greeting based on current context
      const messages = conversation.messages || [];
      const updatedMessages = [...messages];
      if (updatedMessages.length > 0 && updatedMessages[0].role === 'assistant') {
        const newGreeting = getContextualGreeting();
        updatedMessages[0] = {
          ...updatedMessages[0],
          content: newGreeting,
          timestamp: new Date().toISOString()
        };
      }
      
      setMessages(updatedMessages.slice(-100));

      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 200));

      await handleApiCall(() =>
        base44.entities.Conversation.update(conversation.id, {
          status: 'active',
          messages: updatedMessages,
          last_activity: new Date().toISOString()
        })
      );

      if (isMountedRef.current) {
        toast.success('Loaded conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      if (isMountedRef.current) {
        const isRateLimit = error?.message?.includes('Rate limit') || error?.message?.includes('rate limit');
        toast.error(isRateLimit 
          ? 'Too many requests. Please wait a moment before switching conversations.' 
          : 'Failed to load conversation');
      }
    }
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      // Delete the conversation with retry
      await handleApiCall(() =>
        base44.entities.Conversation.delete(conversationToDelete)
      );

      // Update local state first
      if (!isMountedRef.current) return;
      
      const updatedConversations = conversations.filter(c => c.id !== conversationToDelete);
      setConversations(updatedConversations);

      if (conversationToDelete === conversationId) {
        // Current conversation was deleted, need to load another one
        if (updatedConversations.length > 0) {
          // Load the most recent remaining conversation
          const nextConv = updatedConversations[0];
          setConversationId(nextConv.id);
          setMessages(nextConv.messages || []);
          
          // Small delay before update
          await new Promise(resolve => setTimeout(resolve, 200));

          // Make sure it's active
          await handleApiCall(() =>
            base44.entities.Conversation.update(nextConv.id, {
              status: 'active',
              last_activity: new Date().toISOString()
            })
          );
        } else {
          // If no conversations left, create a new one
          const pageType = context?.pageType || 'dashboard';
          const greeting = getContextualGreeting();
          const greetingMessage = {
            role: "assistant",
            content: greeting,
            timestamp: new Date().toISOString()
          };

          // Small delay before creating new conversation
          await new Promise(resolve => setTimeout(resolve, 200));

          const newConversation = await handleApiCall(() =>
            base44.entities.Conversation.create({
              title: `Conversation on ${formatPageName(pageType)}`,
              type: 'general',
              status: 'active',
              messages: [greetingMessage],
              context: {
                pageType: pageType,
                userRole: appRole,
                startedAt: new Date().toISOString()
              },
              last_activity: new Date().toISOString()
            })
          );

          if (!isMountedRef.current) return;
          setConversationId(newConversation.id);
          setMessages([greetingMessage]);
          setConversations([newConversation]);
        }
      }

      if (isMountedRef.current) {
        toast.success('Conversation deleted');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      if (isMountedRef.current) {
        toast.error('Failed to delete conversation');
      }
    } finally {
      setConversationToDelete(null);
    }
  };

  // Enhanced: Contextual greeting based on comprehensive context
  const getContextualGreeting = () => {
    const userName = context?.user_name?.split(' ')[0] || 'there';
    const pageType = context?.pageType || 'unknown';
    const userRole = context?.userRole || 'User';
    const viewportFocus = context?.viewport_focus || {};
    const visibleData = context?.visible_data_summary || {};
    const pageInsights = context?.page_specific_insights || {};
    const viewingFocus = context?.viewing_focus || '';
    
    // Role-specific titles
    const roleTitle = {
      'User Level 1': 'Leader',
      'User Level 2': 'Manager',
      'User Level 3': 'Executive',
      'Admin Level 1': 'Program Admin',
      'Admin Level 2': 'HR Admin',
      'Super Administrator': 'Organization Admin',
      'Partner Business Administrator': 'Partner Admin',
      'Platform Admin': 'Platform Admin'
    }[userRole] || 'Leader';

    // Viewport-aware greetings
    if (viewportFocus.focused_section) {
      const sectionLabels = viewportFocus.section_labels || {};
      const sectionLabel = sectionLabels[viewportFocus.focused_section] || viewportFocus.focused_section;
      
      switch (viewportFocus.focused_section) {
        case 'section-metrics':
        case 'section-top-metrics':
        case 'section-overview-metrics':
          return `Hi ${userName}! I see you're reviewing ${sectionLabel.toLowerCase()}. Let me help you interpret these insights.`;
        
        case 'section-assessment':
          return `Welcome ${userName}! Looking at your assessment section. Ready to discuss your development areas?`;
        
        case 'section-team':
        case 'section-team-summary':
          return `Hi ${userName}! I see you're reviewing your team. Want to discuss development priorities or interventions?`;
        
        case 'section-competency-impact':
        case 'section-competency-breakdown':
          return `Hello ${userName}! Analyzing competencies with you. Which area would you like to focus on?`;
        
        case 'section-strategic-risks':
          return `Hi ${userName}! I see you're reviewing strategic risks. Let's discuss mitigation strategies.`;
        
        case 'section-succession-pipeline':
          return `Welcome ${userName}! Looking at succession planning. Want to identify high-potential leaders?`;
        
        case 'section-learning':
          return `Hi ${userName}! I see you're in the learning section. Need recommendations or want to track progress?`;
        
        case 'section-goals':
          return `Hello ${userName}! Reviewing your goals? Let's make sure you're on track.`;
        
        case 'section-programs':
          return `Hi ${userName}! Looking at programs overview. Need help with deployment or analytics?`;
      }
    }

    // Page-specific greetings with data awareness
    switch (pageType) {
      case 'dashboard':
        if (userRole === 'User Level 1') {
          const hasAssessment = visibleData.has_assessment;
          if (!hasAssessment) {
            return `Hi ${userName}! 👋 Ready to discover your leadership strengths? Let's start with an assessment.`;
          }
          return `Welcome back, ${userName}! I can help you generate reports, get personalized learning recommendations, or schedule coaching sessions.`;
        } else if (userRole === 'User Level 2') {
          const teamSize = visibleData.team_size || 0;
          return `Hi ${userName}! Managing ${teamSize} team members. I can generate team reports, recommend learning paths, or help schedule team check-ins.`;
        } else if (userRole === 'User Level 3') {
          return `Welcome, ${userName}! I can generate organizational reports, provide strategic insights, and help schedule leadership reviews.`;
        } else if (userRole === 'Admin Level 1') {
          return `Hi ${userName}! I can generate program reports, recommend learning resources for cohorts, and help schedule coaching sessions.`;
        } else if (userRole === 'Admin Level 2' || userRole === 'Super Administrator') {
          return `Welcome, ${userName}! I can generate platform analytics, provide learning recommendations, and help coordinate team meetings.`;
        }
        return `Hi ${userName}! How can I help you today?`;

      case 'learning-library':
        const filters = context?.current_filters || {};
        if (filters.competency && filters.competency.length > 0) {
          return `Hi ${userName}! I see you're exploring ${filters.competency.join(', ')} resources. Want personalized recommendations?`;
        }
        if (filters.search) {
          return `Hi ${userName}! Searching for "${filters.search}"? Let me help you find the best resources.`;
        }
        return `Hi ${userName}! Ready to explore learning resources? Tell me what you're looking to develop.`;

      case 'goals-overview':
        const atRiskCount = visibleData.at_risk_goals || 0;
        const pendingCount = visibleData.pending_acceptance_goals || 0;
        if (atRiskCount > 0) {
          return `Hi ${userName}! I notice ${atRiskCount} goal${atRiskCount > 1 ? 's' : ''} need${atRiskCount === 1 ? 's' : ''} attention. Want to discuss action plans?`;
        }
        if (pendingCount > 0) {
          return `Hi ${userName}! You have ${pendingCount} goal${pendingCount > 1 ? 's' : ''} awaiting your response. Need help reviewing them?`;
        }
        return `Hi ${userName}! Let's work on your goals. Ready to track progress or set new objectives?`;

      case 'career-path-explorer':
        const targetRole = visibleData.target_role;
        const readinessScore = visibleData.readiness_score;
        if (targetRole && readinessScore !== undefined) {
          return `Hi ${userName}! I see you're exploring the ${targetRole} role (${readinessScore}% ready). Let's build your development path.`;
        }
        return `Hi ${userName}! Ready to explore your next career move? Let's assess your readiness and plan your path.`;

      case 'onboarding-builder':
        const planStatus = pageInsights.plan_ready_to_deploy ? 'ready to deploy' : 
                          pageInsights.needs_assignee ? 'ready for assignment' :
                          pageInsights.needs_generation ? 'ready to generate' : 'in progress';
        return `Hi ${userName}! Your onboarding plan is ${planStatus}. How can I help you refine it?`;

      case 'hr-assessment-dashboard':
        const totalAssessments = visibleData.total_assessments || 0;
        const completionRate = visibleData.completion_rate || 0;
        return `Hi ${userName}! You have ${totalAssessments} assessments with ${completionRate}% completion. Ready to analyze results?`;

      case 'enterprise_analytics':
        const totalLeaders = visibleData.total_leaders || 0;
        const avgScore = visibleData.avg_leadership_score || 0;
        return `Hi ${userName}! Analyzing ${totalLeaders} leaders (Avg SI: ${avgScore}%). What strategic insights do you need?`;

      case 'command-center':
        if (userRole === 'User Level 2') {
          return `Hi ${userName}! Ready to review team performance and deploy interventions?`;
        } else if (userRole === 'Admin Level 1') {
          return `Hi ${userName}! Let's review program performance and participant progress.`;
        }
        return `Hi ${userName}! Ready to dive into team analytics and insights?`;

      case 'profile':
        const profileCompletion = pageInsights.profile_completion_percentage || 0;
        if (profileCompletion < 100) {
          return `Hi ${userName}! Your profile is ${profileCompletion}% complete. Want to finish it for better recommendations?`;
        }
        return `Hi ${userName}! Your profile looks great. Ready to update your development preferences?`;

      case 'assessment-taking':
        return `Hi ${userName}! Taking your assessment? I'll be here when you finish to discuss your results.`;

      case 'assessment-results':
        const overallScore = visibleData.overall_score || 0;
        return `Hi ${userName}! Congratulations on completing your assessment (${overallScore}%)! Let's explore your results together.`;

      case 'user-management':
        const totalUsers = visibleData.total_users || 0;
        const selectedCount = visibleData.selected_count || 0;
        if (selectedCount > 0) {
          return `Hi ${userName}! You've selected ${selectedCount} user${selectedCount > 1 ? 's' : ''}. Ready for bulk actions?`;
        }
        return `Hi ${userName}! Managing ${totalUsers} users. How can I help with user administration?`;

      case 'settings':
        return `Hi ${userName}! Let's configure your preferences. What would you like to update?`;

      case 'notifications':
        const unreadCount = visibleData.unread_notifications || 0;
        if (unreadCount > 0) {
          return `Hi ${userName}! You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}. Want me to summarize them?`;
        }
        return `Hi ${userName}! All caught up on notifications. Is there anything else I can help with?`;

      case 'my-journeys-overview':
        const activeJourneys = visibleData.active_journeys || 0;
        return `Hi ${userName}! You're enrolled in ${activeJourneys} learning journey${activeJourneys !== 1 ? 's' : ''}. Ready to continue your path?`;

      case 'journey-builder':
        return `Hi ${userName}! Building a learning journey? I can help you structure content and select resources.`;

      case 'onboarding-progress':
        const progressPercentage = visibleData.progress_percentage || 0;
        return `Hi ${userName}! You're ${progressPercentage}% through your onboarding. Let's keep the momentum going!`;

      case 'billing':
        return `Hi ${userName}! Need help with billing or subscription questions? I'm here to assist.`;

      case 'business-manager':
        return `Hi ${userName}! Ready to manage clients, partners, and organizational settings?`;

      default:
        // Generic greeting with role awareness
        if (userRole === 'Platform Admin') {
          return `Hi ${userName}! Platform admin at your service. What would you like to manage today?`;
        } else if (userRole === 'Super Administrator') {
          return `Hi ${userName}! Organization admin ready. How can I help manage your platform?`;
        } else if (userRole === 'Partner Business Administrator') {
          return `Hi ${userName}! Partner admin here. Ready to manage client organizations?`;
        }
        return `Hi ${userName}! I'm Atreus, your AI leadership coach. How can I help you today?`;
    }
  };



  // Helper: Analyze context and suggest calendar events
  const getProactiveCalendarSuggestions = () => {
    const calendarSuggestions = [];
    const visibleData = context?.visible_data_summary || {};
    const pageType = context?.pageType || 'unknown';

    // Suggest coaching sessions based on goals approaching deadline
    if (visibleData.goals_approaching_deadline > 0) {
      calendarSuggestions.push({
        text: `Schedule goal review (${visibleData.goals_approaching_deadline} goals due soon)`,
        icon: '📅',
        suggestedEvent: {
          title: "Goal Review Session",
          description: "Review progress on goals approaching their deadline",
          event_type: "goal_review",
          duration_minutes: 30
        }
      });
    }

    // Suggest 1-on-1s based on team performance
    if ((appRole === 'User Level 2' || appRole === 'Admin Level 1') && visibleData.team_members_needing_attention > 0) {
      calendarSuggestions.push({
        text: `Schedule team check-ins (${visibleData.team_members_needing_attention} need attention)`,
        icon: '👥',
        suggestedEvent: {
          title: "Team Performance Check-in",
          description: "Review development progress with team members",
          event_type: "one_on_one",
          duration_minutes: 30
        }
      });
    }

    // Suggest coaching session after assessment completion
    if (pageType === 'assessment-results' || (visibleData.has_recent_assessment && !visibleData.has_scheduled_debrief)) {
      calendarSuggestions.push({
        text: 'Schedule assessment debrief session',
        icon: '🎯',
        suggestedEvent: {
          title: "Assessment Results Debrief",
          description: "Discuss assessment insights and create development plan",
          event_type: "coaching_session",
          duration_minutes: 60
        }
      });
    }

    // Suggest quarterly review
    const currentMonth = new Date().getMonth();
    if ([2, 5, 8, 11].includes(currentMonth) && !visibleData.has_scheduled_quarterly_review) {
      calendarSuggestions.push({
        text: 'Schedule quarterly development review',
        icon: '📊',
        suggestedEvent: {
          title: "Quarterly Development Review",
          description: "Review progress, update goals, and plan next quarter",
          event_type: "review_meeting",
          duration_minutes: 90
        }
      });
    }

    // Suggest team planning session for managers
    if ((appRole === 'User Level 2' || appRole === 'Admin Level 1' || appRole === 'Admin Level 2') && pageType === 'command-center') {
      calendarSuggestions.push({
        text: 'Schedule team development planning',
        icon: '🗓️',
        suggestedEvent: {
          title: "Team Development Planning Session",
          description: "Strategic planning for team growth and development",
          event_type: "team_checkin",
          duration_minutes: 60
        }
      });
    }

    return calendarSuggestions;
  };

  // Enhanced: Dynamic contextual suggestions filtered by permissions
  const getContextualSuggestions = () => {
    const pageType = context?.pageType || 'unknown';
    const filters = context?.current_filters || {};
    const visibleData = context?.visible_data_summary || {};
    const pageInsights = context?.page_specific_insights || {};
    const availableActions = context?.available_actions || [];
    const viewingFocus = context?.viewing_focus || '';
    const viewportFocus = context?.viewport_focus || {};

    // Get tools user has permission to use
    const allowedTools = getToolsForUser(userPermissions || [], appRole);

    let suggestions = [];

    // Add proactive insights-based suggestions (highest priority)
    const proactiveInsights = context?.proactive_insights || [];
    if (proactiveInsights.length > 0) {
      proactiveInsights.slice(0, 2).forEach(insight => {
        suggestions.push({
          text: insight.action_suggestion || insight.message,
          icon: insight.type === 'goals_at_risk' ? '⚠️' :
                insight.type === 'learning_overdue' ? '📚' :
                insight.type === 'team_needs_attention' ? '👥' :
                insight.type === 'upcoming_assessment' ? '📊' :
                insight.type === 'learning_opportunity' ? '💡' : '✨',
          priority: insight.priority
        });
      });
    }

    // Add proactive calendar suggestions
    const calendarSuggestions = getProactiveCalendarSuggestions();
    if (calendarSuggestions.length > 0 && suggestions.length < 4) {
      suggestions.push(calendarSuggestions[0]);
    }

    // Add viewport-specific suggestions if available (highest priority)
    if (viewportFocus.focused_section) {
      const sectionLabel = viewportFocus.section_labels?.[viewportFocus.focused_section] || viewportFocus.focused_section;
      
      // Add suggestions based on which section user is viewing
      switch (viewportFocus.focused_section) {
        case 'section-metrics':
        case 'section-top-metrics':
        case 'section-overview-metrics':
          suggestions.push({ text: `Explain these ${sectionLabel.toLowerCase()} metrics`, icon: '📊' });
          suggestions.push({ text: 'What trends should I focus on?', icon: '📈' });
          break;
        
        case 'section-assessment':
          suggestions.push({ text: 'How can I improve my scores?', icon: '🎯' });
          suggestions.push({ text: 'Compare my results to peers', icon: '👥' });
          break;
        
        case 'section-team':
        case 'section-team-summary':
        case 'section-team-grid':
          suggestions.push({ text: 'Identify team development priorities', icon: '👨‍👩‍👧‍👦' });
          suggestions.push({ text: 'Who needs immediate attention?', icon: '🚨' });
          break;
        
        case 'section-competency-impact':
        case 'section-competency-breakdown':
          suggestions.push({ text: 'Which competency should we prioritize?', icon: '🧠' });
          suggestions.push({ text: 'Show me development resources', icon: '📚' });
          break;
        
        case 'section-strategic-risks':
          suggestions.push({ text: 'Help me create a risk mitigation plan', icon: '🛡️' });
          suggestions.push({ text: 'What actions should I take first?', icon: '🔥' });
          break;
        
        case 'section-succession-pipeline':
          suggestions.push({ text: 'Identify high-potential leaders', icon: '🌱' });
          suggestions.push({ text: 'Build succession development plans', icon: '🪜' });
          break;
        
        case 'section-learning':
          suggestions.push({ text: 'Recommend relevant learning', icon: '🎓' });
          suggestions.push({ text: 'Track my learning progress', icon: '📈' });
          break;
        
        case 'section-goals':
          suggestions.push({ text: 'Help me set SMART goals', icon: '🏆' });
          suggestions.push({ text: 'Review my goal progress', icon: '📅' });
          break;
      }
    }

    // Generate suggestions from available actions (medium priority)
    if (availableActions.length > 0) {
      const actionSuggestions = availableActions.map(action => {
        // Map action types to user-friendly suggestions
        switch (action.action) {
          case 'assign_learning':
            return { text: 'Assign learning to my team', icon: '🧑‍🏫' };
          case 'clear_filters':
            return { text: 'Clear all filters', icon: '🧹' };
          case 'get_recommendations':
            return { text: 'Get learning recommendations', icon: '💡' };
          case 'create_user':
            return { text: 'Add a new user', icon: '➕' };
          case 'bulk_assign_roles':
            return { text: `Assign roles to ${context.selected_items?.length || 0} users`, icon: '👥' };
          case 'review_at_risk':
            return { text: 'Review at-risk users', icon: '⚠️' };
          case 'export_pdf':
            return { text: 'Download assessment PDF', icon: '📥' };
          case 'create_development_plan':
            return { text: 'Create development plan', icon: '📈' };
          case 'browse_learning':
            return { text: 'Find learning resources', icon: '📚' };
          case 'edit_profile':
            return { text: 'Update my profile', icon: '✏️' };
          case 'complete_profile':
            return { text: `Complete profile (${pageInsights.missing_fields || 0} fields left)`, icon: '✅' };
          case 'configure_ai_coach':
            return { text: 'Customize AI coach settings', icon: '⚙️' };
          case 'connect_teams':
            return { text: 'Connect Microsoft Teams', icon: '🔗' };
          case 'connect_slack':
            return { text: 'Connect Slack', icon: '🔗' };
          default:
            return { text: action.description || 'Take action', icon: '⚡' };
        }
      });
      suggestions.push(...actionSuggestions);
    }

    // Add page-specific intelligent suggestions (lowest priority)
    switch (pageType) {
      case 'learning-library':
        if (filters.activeFiltersCount === 0 && pageInsights.user_assessment_available) {
          suggestions.push({ text: 'Show me recommended resources', icon: '✨' });
        }
        if (visibleData.filtered_resources === 0 && filters.activeFiltersCount > 0) {
          suggestions.push({ text: 'Adjust my search filters', icon: '🔍' });
        }
        break;

      case 'user-management':
        if (visibleData.at_risk_users > 0) {
          suggestions.push({ text: `Create intervention plan for ${visibleData.at_risk_users} at-risk users`, icon: '🚨' });
        }
        if (context.selected_items?.length > 0) {
          suggestions.push({ text: `Bulk actions for ${context.selected_items.length} selected users`, icon: '🛠️' });
        }
        break;

      case 'assessment-results':
        const lowestComp = visibleData.lowest_competency;
        if (lowestComp && pageInsights.ready_for_export) {
          suggestions.push({ text: `Find ${lowestComp.name} development resources`, icon: '📚' });
        }
        if (pageInsights.succession_readiness === 'needs_development') {
          suggestions.push({ text: 'Create 90-day development plan', icon: '📅' });
        }
        break;

      case 'profile':
        if (pageInsights.profile_completeness < 100) {
          suggestions.push({ text: 'Help me complete my profile', icon: '👤' });
        }
        break;

      case 'settings':
        const activeTab = visibleData.active_tab;
        if (activeTab === 'notifications' && !pageInsights.notification_preferences_set) {
          suggestions.push({ text: 'Set up my notification preferences', icon: '🔔' });
        }
        break;

      case 'goals-overview':
        if (visibleData.at_risk_goals > 0) {
          suggestions.push({ text: `Review ${visibleData.at_risk_goals} at-risk goals`, icon: '⚠️' });
        }
        if (visibleData.active_goals === 0) {
          suggestions.push({ text: 'Help me create my first goal', icon: '🎯' });
        }
        break;

      case 'dashboard':
        if (allowedTools.generateReport) {
          suggestions.push({ text: 'Generate a performance report', icon: '📊' });
        }
        if (allowedTools.getUserAchievements) {
          suggestions.push({ text: 'Show my gamification progress', icon: '🏆' });
        }
        suggestions.push(
          { text: 'Recommend learning for my goals', icon: '📚' },
          { text: 'What should I focus on this week?', icon: '💡' }
        );
        if (allowedTools.scheduleCalendarEvent) {
          suggestions.push({ text: 'Schedule a coaching session', icon: '📅' });
        }
        break;

      case 'achievements':
        if (allowedTools.explainBadgeCriteria) {
          suggestions.push({ text: 'How do I earn more badges?', icon: '🎖️' });
        }
        suggestions.push(
          { text: 'Show me ways to level up faster', icon: '⚡' },
          { text: "What's my leaderboard standing?", icon: '🏅' },
          { text: 'Explain my recent point activities', icon: '📈' }
        );
        break;

      case 'gamification-manager':
        if (allowedTools.designBadgeStructure) {
          suggestions.push({ text: 'Design badges for our new manager program', icon: '🎨' });
        }
        if (allowedTools.suggestPointAwards) {
          suggestions.push({ text: 'Suggest point values for activities', icon: '💰' });
        }
        if (allowedTools.createCompetition) {
          suggestions.push({ text: 'Create a quarterly learning competition', icon: '🏆' });
        }
        break;

      case 'enterprise_analytics':
        const metrics = context.metrics_snapshot || {};
        const risks = context.risk_summary || {};
        const divisions = context.division_insights || {};

        if (metrics.insights?.at_risk_status === 'high') {
          suggestions.push({ text: `Address ${metrics.at_risk} at-risk leaders`, icon: "⚠️" });
        }
        if (risks.critical_risks > 0) {
          suggestions.push({ text: `Create action plan for top risk`, icon: "📋" });
        }
        if (metrics.insights?.goal_alignment_gap) {
          suggestions.push({ text: `Align goals for ${metrics.leaders_needing_goal_alignment} leaders`, icon: "🎯" });
        }
        if (filters.isFiltered) {
          suggestions.push({ text: "Explain these filtered results", icon: "🔍" });
        }
        suggestions.push({ text: "Export analytics report", icon: "📥" });
        break;

      default:
        suggestions.push(
          { text: 'What can you help me with?', icon: '❓' },
          { text: 'Explain this page', icon: '📖' },
          { text: 'Show me tips', icon: '💡' }
        );
    }

    // Ensure we return unique suggestions, limited to 4
    const uniqueSuggestions = [];
    const seenTexts = new Set();
    for (const s of suggestions) {
        if (!seenTexts.has(s.text)) {
            uniqueSuggestions.push(s);
            seenTexts.add(s.text);
        }
    }
    return uniqueSuggestions.slice(0, 4);
  };

  // Enhanced: Comprehensive system prompt with cross-session context
  const buildSystemPrompt = async () => {
    const userName = context?.user_name || user?.full_name || 'the user';
    const userRole = context?.userRole || appRole || 'User';
    const pageType = context?.pageType || 'unknown page';
    const viewportFocus = context?.viewport_focus || {};
    
    // Fetch cross-session context (cached)
    const crossSessionData = await getCrossSessionContext(base44, user.email);
    
    // Fetch external qualifications for enhanced context
    let externalQuals = null;
    try {
      const [assessments, certs] = await Promise.all([
        base44.entities.ExternalAssessmentResult.filter({ user_email: user.email, status: 'verified' }, '-created_date', 5),
        base44.entities.Certification.filter({ user_email: user.email, status: 'verified' }, '-created_date', 10)
      ]);
      externalQuals = {
        external_assessments: assessments.map(a => ({ type: a.assessment_type, result: a.designation_or_score, summary: a.ai_summary })),
        certifications: certs.map(c => ({ name: c.name, issuer: c.issuing_body, competencies: c.competency_ids }))
      };
    } catch (error) {
      console.error('Error fetching external qualifications:', error);
    }
    
    // Serialize granular context for LLM
    const contextSummary = {
      page: {
        type: pageType,
        viewing_focus: context?.viewing_focus,
        data_id: context?.dataId,
        path: context?.path
      },
      user: {
        name: userName,
        role: userRole,
        email: context?.user_email || user?.email,
        external_qualifications: externalQuals
      },
      current_state: {
        filters: context?.current_filters,
        visible_data: context?.visible_data_summary,
        selected_items: context?.selected_items,
        modal_focus: context?.modal_focus
      },
      viewport: {
        focused_section: viewportFocus.focused_section,
        visible_sections: viewportFocus.visible_sections,
        section_labels: viewportFocus.section_labels,
        total_sections: viewportFocus.section_count
      },
      insights: {
        page_specific: context?.page_specific_insights,
        available_actions: context?.available_actions
      },
      navigation: {
        previous_page: context?.previous_page ? {
          type: context.previous_page.pageType,
          navigated_at: context.previous_page.navigated_at
        } : null
      },
      cross_session: crossSessionData
    };

    const systemPrompt = buildAtreusSystemPrompt({ userName, userRole, pageType, contextSummary, viewportFocus, crossSessionData, externalQuals });


    return systemPrompt;
  };

  const handleSendMessage = async (messageText = null) => {
    const text = messageText || inputValue.trim();
    if (!text || isTyping) return;

    if (!isMountedRef.current) return;
    setInputValue("");
    setIsTyping(true);

    const userMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Clear attachments after sending
    const filesForRequest = [...attachedFiles];
    setAttachedFiles([]);

    try {
      if (conversationId) {
        // Debounce conversation updates - only save every 2 seconds
        if (window.atreusUpdateTimeout) clearTimeout(window.atreusUpdateTimeout);
        window.atreusUpdateTimeout = setTimeout(async () => {
          try {
            await handleApiCall(() =>
              base44.entities.Conversation.update(conversationId, {
                messages: updatedMessages,
                last_activity: new Date().toISOString()
              })
            );
          } catch (err) {
            console.error('Error saving conversation:', err);
          }
        }, 2000);
      }

      let response;

      // Agent-powered conversation - check if user wants to execute an action
      const agentResponse = await handleApiCall(() =>
        base44.functions.invoke('invokeAgent', {
          prompt: text,
          context: context,
          conversation_id: conversationId,
          file_attachments: filesForRequest.length > 0 ? filesForRequest : undefined
        }),
        'high' // High priority for user messages
      );

      // Handle different response statuses
      if (agentResponse.data.status === 'open_form') {
        // Smart form filling - open modal with pre-filled data
        const formMessage = {
          role: "assistant",
          content: `I've prepared a ${agentResponse.data.form_type} for you. Please review and submit.`,
          timestamp: new Date().toISOString()
        };
        
        const withFormMsg = [...updatedMessages, formMessage];
        setMessages(withFormMsg);
        setIsTyping(false);
        
        // Trigger smart form modal
        setSmartFormType(agentResponse.data.form_type);
        setSmartFormData(agentResponse.data.data || {});
        setShowSmartForm(true);
        
        return;
      } else if (agentResponse.data.status === 'workflow_started' || agentResponse.data.status === 'workflow_in_progress') {
        // Multi-step workflow - show workflow message and progress indicator
        setActiveWorkflow(agentResponse.data.workflow_state);
        
        const workflowMessage = {
          role: "assistant",
          content: agentResponse.data.message,
          timestamp: new Date().toISOString(),
          isWorkflowStep: true
        };
        
        const withWorkflowMsg = [...updatedMessages, workflowMessage];
        setMessages(withWorkflowMsg);
        setIsTyping(false);
        return;
      } else if (agentResponse.data.status === 'workflow_completed') {
        response = agentResponse.data.message;
        setActiveWorkflow(null);
        toast.success('Workflow completed successfully!');
      } else if (agentResponse.data.status === 'needs_confirmation') {
        // Show confirmation modal
        if (!isMountedRef.current) return;
        setPendingActionConfirmation(agentResponse.data);
        
        // Add a message to chat explaining what's happening
        const confirmMessage = {
          role: "assistant",
          content: `${agentResponse.data.confirmation_message}\n\nPlease review the details and confirm to proceed.`,
          timestamp: new Date().toISOString(),
          isPendingConfirmation: true
        };
        
        const withConfirmMsg = [...updatedMessages, confirmMessage];
        setMessages(withConfirmMsg);
        setIsTyping(false);
        return;
      } else if (agentResponse.data.status === 'needs_clarification') {
        response = agentResponse.data.message;
      } else if (agentResponse.data.status === 'success') {
        response = `✅ ${agentResponse.data.message}`;
      } else if (agentResponse.data.status === 'failed') {
        response = `❌ ${agentResponse.data.message}${agentResponse.data.retryable ? '\n\nWould you like me to try again?' : ''}`;
      } else if (agentResponse.data.status === 'conversational') {
        response = agentResponse.data.message;
      } else {
        // Fallback to regular conversation
        const systemPrompt = await buildSystemPrompt();
        const conversationHistory = updatedMessages
          .slice(-10)
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');

        response = await handleApiCall(() =>
          base44.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\nConversation History:\n${conversationHistory}\n\nProvide a helpful response.`,
            add_context_from_internet: false
          }),
          'high'
        );
      }

      const assistantMessage = {
        role: "assistant",
        content: response || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date().toISOString()
      };

      if (!isMountedRef.current) return;
      const finalMessages = [...updatedMessages, assistantMessage];
      // Limit to last 100 messages for performance
      setMessages(finalMessages.slice(-100));

      // Check for workflow suggestions in response
      if (agentResponse.data.workflow_suggestions) {
        setWorkflowSuggestions(agentResponse.data.workflow_suggestions);
      }

      if (conversationId) {
        // Clear any pending updates
        if (window.atreusUpdateTimeout) clearTimeout(window.atreusUpdateTimeout);

        await handleApiCall(() =>
          base44.entities.Conversation.update(conversationId, {
            messages: finalMessages,
            last_activity: new Date().toISOString()
          })
        );
      }

    } catch (error) {
      console.error('Error sending message:', error);
      if (!isMountedRef.current) return;
      
      const isRateLimit = error?.message?.includes('Rate limit') || error?.message?.includes('rate limit');
      toast.error(isRateLimit 
        ? 'Rate limit exceeded. Please wait a moment before sending another message.' 
        : 'Failed to send message. Please try again.');

      const errorMessage = {
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try asking again.",
        timestamp: new Date().toISOString()
      };

      const finalMessagesWithError = [...updatedMessages, errorMessage];
      // Limit to last 100 messages for performance
      setMessages(finalMessagesWithError.slice(-100));

      try {
        if (conversationId) {
          // Clear any pending updates
          if (window.atreusUpdateTimeout) clearTimeout(window.atreusUpdateTimeout);

          await handleApiCall(() =>
            base44.entities.Conversation.update(conversationId, {
              messages: finalMessagesWithError,
              last_activity: new Date().toISOString()
            })
          );
        }
      } catch (saveError) {
        console.error('Error saving error message to DB:', saveError);
      }
    } finally {
      if (isMountedRef.current) {
        setIsTyping(false);
      }
    }
  };



  const handleExportAsText = async () => {
    setExportingText(true);
    try {
      if (!messages || messages.length === 0) {
        toast.error('No messages to export');
        return;
      }

      let textContent = `Atreus Conversation Export\n`;
      textContent += `User: ${user?.full_name} (${user?.email})\n`;
      textContent += `Role: ${appRole}\n`;
      textContent += `Exported: ${format(new Date(), 'PPpp')}\n`;
      textContent += `\n${'='.repeat(50)}\n\n`;

      messages.forEach((message) => {
        const speaker = message.role === 'user' ? user?.full_name : 'Atreus';
        const timestamp = format(new Date(message.timestamp), 'MMM d, h:mm a');
        textContent += `[${timestamp}] ${speaker}:\n${message.content}\n\n`;
      });

      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atreus-conversation-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export');
    } finally {
      setExportingText(false);
    }
  };

  const handleExportAsPDF = async () => {
    if (!conversationId) {
      toast.error('No active conversation to export.');
      return;
    }

    setExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportConversationPDF', {
        conversation_id: conversationId,
        strategic_mode: false
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atreus-conversation-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export as PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleConfirmAgentAction = async () => {
    if (!pendingActionConfirmation) return;
    
    setIsExecutingAction(true);
    try {
      const response = await base44.functions.invoke('invokeAgent', {
        tool_call: pendingActionConfirmation.tool_call,
        confirmed: true,
        context: context
      });

      // Close confirmation modal
      setPendingActionConfirmation(null);

      // Add result message to chat
      const resultMessage = {
        role: "assistant",
        content: response.data.status === 'success' 
          ? `✅ ${response.data.message}` 
          : `❌ ${response.data.message}`,
        timestamp: new Date().toISOString(),
        actionResult: response.data
      };

      const updatedWithResult = [...messages, resultMessage];
      setMessages(updatedWithResult);

      if (conversationId) {
        await handleApiCall(() =>
          base44.entities.Conversation.update(conversationId, {
            messages: updatedWithResult,
            last_activity: new Date().toISOString()
          })
        );
      }

      if (response.data.status === 'success') {
        toast.success(response.data.message);
        // Invalidate cache after successful action
        invalidateCrossSessionCache(user.email);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error executing confirmed action:', error);
      toast.error('Failed to execute action');
    } finally {
      setIsExecutingAction(false);
    }
  };



  if (strategicMode && riskData) return <StrategicAssistant riskData={riskData} onClose={onClose} onMinimize={onMinimize} user={user} appRole={appRole} />;
  if (learningModuleMode && moduleData) return <LearningModuleCoach moduleData={moduleData} onClose={onClose} user={user} />;

  const getConversationPreview = (conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return "No messages yet";
    }

    // Iterate backwards to find last user message (more efficient)
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') {
        const content = conversation.messages[i].content;
        return content.substring(0, 40) + (content.length > 40 ? '...' : '');
      }
    }

    return "Conversation started";
  };

  return (
    <ErrorBoundary>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="fixed bottom-6 right-6 w-full max-w-[900px] h-[600px] md:w-[900px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex overflow-hidden z-50"
        style={{ borderColor: 'rgba(2, 2, 255, 0.2)' }}
        >
        {/* Conversation Index Sidebar */}
        {(
          <AnimatePresence>
            {showConversationIndex && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-r border-gray-200 flex flex-col bg-gray-50 hidden md:flex"
              >
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900">Conversations</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConversationIndex(false)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {conversations.slice(0, 20).map((conv) => (
                      <div
                        key={conv.id}
                        className={`group relative p-2 rounded-lg cursor-pointer transition-all ${
                          conv.id === conversationId
                            ? 'border'
                            : 'hover:bg-gray-100'
                        }`}
                        style={conv.id === conversationId ? {
                          backgroundColor: 'rgba(2, 2, 255, 0.05)',
                          borderColor: 'rgba(2, 2, 255, 0.2)'
                        } : {}}
                        onClick={() => loadConversation(conv)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {conv.title || 'Untitled'}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {getConversationPreview(conv)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {(() => {
                                try {
                                  const timestamp = conv.last_activity || conv.created_date || new Date().toISOString();
                                  return format(new Date(timestamp), 'MMM d, h:mm a');
                                } catch {
                                  return 'Recently';
                                }
                              })()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConversationToDelete(conv.id);
                            }}
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t border-gray-200">
                  <Button
                    onClick={startNewConversation}
                    className="w-full text-white text-sm"
                    style={{ backgroundColor: '#0202ff' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                    size="sm"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    New Chat
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div 
            className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200 flex-shrink-0"
            style={{ backgroundColor: '#0202ff' }}
          >
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <Brain className="w-5 h-5 md:w-6 md:h-6 text-white" />
                <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-yellow-300 absolute -top-0.5 -right-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm md:text-base truncate">Atreus</h3>
                <p className="text-[10px] md:text-xs text-white opacity-90 truncate">
                  {formatPageName(context?.pageType || 'dashboard')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={startNewConversation} className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9" title="New chat">
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowConversationIndex(!showConversationIndex)} className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9 hidden md:flex" title="Conversation history">
                <History className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleExportAsText} disabled={exportingText} className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9 hidden md:flex" title="Export as text">
                {exportingText ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <FileText className="w-3 h-3 md:w-4 md:h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleExportAsPDF} disabled={exportingPDF} className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9 hidden md:flex" title="Export as PDF">
                {exportingPDF ? <Loader2 className="w-3 h-3 md:w-4 h-4 animate-spin" /> : <Download className="w-3 h-3 md:w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onMinimize} className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9" title="Minimize">
                <Minimize2 className="w-3 h-3 md:w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Context Banner */}
          <div className="px-3 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0" style={{ backgroundColor: 'rgba(2, 2, 255, 0.05)', borderColor: 'rgba(2, 2, 255, 0.1)' }}>
            <div className="flex items-center gap-2 text-[10px] md:text-xs">
              <Badge variant="outline" className="text-[9px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5" style={{ color: '#0202ff', borderColor: 'rgba(2, 2, 255, 0.3)' }}>
                {appRole || 'User'}
              </Badge>
              <span style={{ color: '#0202ff' }} className="hidden md:inline">•</span>
              <span style={{ color: '#0202ff' }} className="truncate hidden md:inline">
                {formatPageName(context?.pageType || 'dashboard')}
              </span>
            </div>
          </div>

          {loadingConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin mx-auto mb-2 md:mb-3" style={{ color: '#0202ff' }} />
                <p className="text-xs md:text-sm text-gray-500">Loading conversation...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex min-h-0 relative">
              {/* Messages Area - Now with dynamic width based on resizable panel */}
              <div className="w-full flex flex-col min-h-0">
                <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
                  <div className="space-y-3 md:space-y-4">
                    {/* Pagination for older messages */}
                    {conversationId && messages.length >= 100 && (
                      <ConversationPagination
                        conversationId={conversationId}
                        currentMessageCount={messages.length}
                        onLoadMore={handleLoadMoreMessages}
                      />
                    )}

                    {/* Show workflow progress if active */}
                    {activeWorkflow && (
                      <WorkflowProgressIndicator
                        workflowType={activeWorkflow.workflow_type}
                        currentStep={activeWorkflow.current_step}
                        totalSteps={activeWorkflow.total_steps || 5}
                        collectedParameters={activeWorkflow.collected_parameters}
                        requiredParameters={activeWorkflow.required_next_parameters}
                      />
                    )}

                    {/* Show workflow suggestions after successful actions */}
                    {workflowSuggestions.length > 0 && (
                      <WorkflowSuggestionsPanel
                        suggestions={workflowSuggestions}
                        onSelectSuggestion={(suggestion) => {
                          const actionPrompt = `Execute ${suggestion.suggestedAction.tool} with: ${JSON.stringify(suggestion.suggestedAction.params)}`;
                          setWorkflowSuggestions([]);
                          handleSendMessage(actionPrompt);
                        }}
                        onDismiss={() => setWorkflowSuggestions([])}
                      />
                    )}
                    
                    {/* Show proactive insights at the top if available */}
                    {messages.length > 0 && (
                      <ProactiveInsightsAlert 
                        insights={context?.proactive_insights || []}
                        onActionClick={(actionText) => handleSendMessage(actionText)}
                      />
                    )}
                    {messages.map((message, index) => (
                      <CoachMessage key={index} message={message} />
                    ))}
                    {isTyping && <TypingIndicator />}
                  </div>
                </ScrollArea>

                {/* Suggestions */}
                {suggestions.length > 0 && !isTyping && (
                  <div className="px-3 md:px-4 pb-2 border-t border-gray-100 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] md:text-xs text-gray-500">Quick actions:</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="h-5 w-5 md:h-6 md:w-6"
                      >
                        {showSuggestions ? (
                          <ChevronDown className="w-2 h-2 md:w-3 md:h-3" />
                        ) : (
                          <ChevronUp className="w-2 h-2 md:w-3 md:h-3" />
                        )}
                      </Button>
                    </div>
                    <AnimatePresence>
                      {showSuggestions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <SuggestionChips
                            suggestions={suggestions}
                            onSelect={(suggestion) => {
                              if (suggestion.suggestedEvent) {
                                setSuggestedCalendarEvent(suggestion.suggestedEvent);
                                setShowScheduleCalendarModal(true);
                              } else {
                                handleSendMessage(suggestion.text);
                              }
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Input */}
                {(
                  <div className="p-3 md:p-4 border-t border-gray-200 flex-shrink-0">
                    {/* File attachments preview */}
                    {attachedFiles.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {attachedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span className="text-blue-900 truncate max-w-[150px]">{file.name}</span>
                            <button
                              onClick={() => removeAttachedFile(idx)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".csv,.pdf,.png,.jpg,.jpeg,.txt,.xlsx"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile || isTyping}
                        className="self-end"
                        title="Attach file"
                      >
                        {uploadingFile ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
                      </Button>
                      <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Ask for strategic guidance or leadership coaching..."
                        className="flex-1 resize-none text-sm md:text-base"
                        rows={2}
                        disabled={isTyping}
                      />
                      <Button
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isTyping}
                        className="h-auto self-end"
                        style={{ backgroundColor: '#0202ff' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                        size="icon"
                      >
                        {isTyping ? (
                          <Loader2 className="w-3 h-3 md:w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3 md:w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>


            </div>
          )}
        </div>
      </motion.div>

      <ScheduleCalendarEventModal
        isOpen={showScheduleCalendarModal}
        onClose={() => {
          setShowScheduleCalendarModal(false);
          setSuggestedCalendarEvent(null);
        }}
        suggestedEvent={suggestedCalendarEvent}
        userEmail={user?.email}
      />

      {/* Delete Conversation Confirmation */}
      <AlertDialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Conversation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteConversation}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ActionConfirmationModal
        isOpen={!!pendingActionConfirmation}
        onClose={() => setPendingActionConfirmation(null)}
        actionDetails={pendingActionConfirmation}
        onConfirm={handleConfirmAgentAction}
        isExecuting={isExecutingAction}
      />

      <SmartFormModal
        isOpen={showSmartForm}
        onClose={() => {
          setShowSmartForm(false);
          setSmartFormType(null);
          setSmartFormData({});
        }}
        formType={smartFormType}
        prefilledData={smartFormData}
        onSuccess={() => {
          setShowSmartForm(false);
          toast.success('Form submitted successfully!');
        }}
      />
      </ErrorBoundary>
      );
      }