import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minimize2, Send, Brain, Loader2, Sparkles, History, Download, FileText, ChevronDown, ChevronUp, Trash2, Plus, AlertCircle, Paperclip, XCircle, Map, MessageSquare, BarChart2, TrendingUp } from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { getCrossSessionContext } from "./CrossSessionCache";
import { getToolsForUser } from "./agentTools";
import { getContextualGreeting, getContextualSuggestions } from "./atreusGreetings";
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
  const conversationIdRef = React.useRef(null);
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
  // Tracks whether the active conversation is fully ready to accept messages
  const conversationReadyRef = useRef(false);

  // File upload state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  const handleApiCall = async (apiFunc, priority = 'normal') => queueRequest(apiFunc, priority);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
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
          // If opened with a starter_message (e.g. from AtreusInsightCard),
          // poll until the conversation is confirmed ready rather than using a blind timeout
          if (context?.starter_message) {
            let waited = 0;
            while (!conversationReadyRef.current && waited < 3000) {
              await new Promise(resolve => setTimeout(resolve, 100));
              waited += 100;
            }
            if (isMountedRef.current && conversationReadyRef.current) {
              handleSendMessage(context.starter_message);
            }
          }
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
    const allowedTools = getToolsForUser(userPermissions || [], appRole);
    const newSuggestions = getContextualSuggestions(context, appRole, userPermissions, allowedTools);
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
        conversationIdRef.current = conversation.id;
        setConversationId(conversation.id);
        conversationReadyRef.current = true;
          // Limit messages to last 100 for performance
          const messages = conversation.messages || [];
        
        // DYNAMIC GREETING: Regenerate greeting based on current context
        if (messages.length > 0 && messages[0].role === 'assistant') {
          const newGreeting = getContextualGreeting(context, appRole);
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
          const newGreeting = getContextualGreeting(context, appRole);
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
        conversationIdRef.current = conversation.id;
        setConversationId(conversation.id);
        conversationReadyRef.current = true;
        setMessages(updatedMessages.slice(-100));
        setLoadingConversation(false);
        return;
      }

      // Small delay before creation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Only create a new conversation if none exist
      const pageType = context?.pageType || 'dashboard';
      const greeting = getContextualGreeting(context, appRole);
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
      conversationIdRef.current = newConversation.id;
      setConversationId(newConversation.id);
      conversationReadyRef.current = true;
      setMessages([greetingMessage]);
    } catch (error) {
      console.error('Error loading conversation:', error);
      if (!isMountedRef.current) return;
      
      const isRateLimit = error?.message?.includes('Rate limit') || error?.message?.includes('rate limit');
      if (isRateLimit) {
        toast.error('Too many requests. Please wait a moment before opening Atreus again.');
      }
      
      // Still mark ready so starter_message polling doesn't hang
      conversationReadyRef.current = true;
      const greeting = getContextualGreeting(context, appRole);
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
      conversationReadyRef.current = false;
      if (conversationId) {
        await handleApiCall(() =>
          base44.entities.Conversation.update(conversationId, {
            status: 'paused'
          })
        );
      }

      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 200));

      const greeting = getContextualGreeting(context, appRole);
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
      conversationIdRef.current = newConversation.id;
      setConversationId(newConversation.id);
      conversationReadyRef.current = true;
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
      conversationIdRef.current = conversation.id;
      setConversationId(conversation.id);
      conversationReadyRef.current = true;

      // DYNAMIC GREETING: Regenerate greeting based on current context
      const messages = conversation.messages || [];
      const updatedMessages = [...messages];
      if (updatedMessages.length > 0 && updatedMessages[0].role === 'assistant') {
        const newGreeting = getContextualGreeting(context, appRole);
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
          conversationIdRef.current = nextConv.id;
          conversationReadyRef.current = true;
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
          const greeting = getContextualGreeting(context, appRole);
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
          conversationIdRef.current = newConversation.id;
          conversationReadyRef.current = true;
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

  // Greeting and suggestions delegated to atreusGreetings.js helper

  // Enhanced: Comprehensive system prompt with cross-session context
  const buildSystemPrompt = async () => {
    const userName = context?.user_name || user?.full_name || 'the user';
    const userRole = context?.userRole || appRole || 'User';
    const pageType = context?.pageType || 'unknown page';
    const viewportFocus = context?.viewport_focus || {};
    
    // Fetch cross-session context (cached)
    const crossSessionData = await getCrossSessionContext(base44, user?.email);
    
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

    return buildAtreusSystemPrompt({ userName, userRole, pageType, contextSummary, viewportFocus, crossSessionData, externalQuals });
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

    // Always read the latest conversationId from ref (avoids stale closure issues)
    const activeConversationId = conversationIdRef.current || conversationId;

    try {
      if (activeConversationId) {
        // Debounce conversation updates - only save every 2 seconds
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(async () => {
          try {
            await handleApiCall(() =>
              base44.entities.Conversation.update(activeConversationId, {
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

      // Build enriched context with all requested fields (nulls for unavailable fields)
      const enrichedContext = {
        ...context,
        current_page: context?.pageType || context?.path || null,
        user_role: context?.userRole || appRole || null,
        user_name: context?.user_name || user?.full_name || null,
        client_id: context?.client_id || user?.client_id || user?.data?.client_id || null,
        current_goals: context?.visible_data_summary?.active_goals || context?.current_goals || null,
        recent_activity: context?.activity_summary || context?.recent_activity || null,
        assessment_summary: context?.page_specific_insights?.assessment_summary || context?.assessment_summary || null,
        learning_progress: context?.learning_progress || null,
        request_context: context?.request_context || null,
      };

      // Agent-powered conversation - check if user wants to execute an action
      const agentResponse = await handleApiCall(() =>
        base44.functions.invoke('invokeAgent', {
          prompt: text,
          context: enrichedContext,
          conversation_id: activeConversationId,
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
          .map(m => `${m.role}: ${m.content || ''}`)
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

      if (activeConversationId) {
        // Clear any pending updates
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);

        await handleApiCall(() =>
          base44.entities.Conversation.update(activeConversationId, {
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
        if (activeConversationId) {
          // Clear any pending updates
          if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);

          await handleApiCall(() =>
            base44.entities.Conversation.update(activeConversationId, {
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
        let timestamp = 'Unknown time';
        try { if (message.timestamp) timestamp = format(new Date(message.timestamp), 'MMM d, h:mm a'); } catch {}
        textContent += `[${timestamp}] ${speaker}:\n${message.content || ''}\n\n`;
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

      const activeConvIdForConfirm = conversationIdRef.current || conversationId;
      if (activeConvIdForConfirm) {
        await handleApiCall(() =>
          base44.entities.Conversation.update(activeConvIdForConfirm, {
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
        const content = conversation.messages[i].content || '';
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

          {/* Quick Action Bar */}
          <div className="px-3 py-2 border-b flex-shrink-0 bg-white">
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: 'Create Plan', icon: Map, prompt: `Create a focused development plan for me. Context: page=${context?.pageType || 'unknown'}, role=${appRole || 'User'}, name=${context?.user_name || user?.full_name || 'user'}. Goals: ${JSON.stringify(context?.visible_data_summary?.active_goals || context?.current_goals || null)}. Assessment: ${JSON.stringify(context?.page_specific_insights?.assessment_summary || context?.assessment_summary || null)}.` },
                { label: 'Prep Conversation', icon: MessageSquare, prompt: `Help me prepare for an upcoming leadership conversation. Context: page=${context?.pageType || 'unknown'}, role=${appRole || 'User'}. Recent activity: ${JSON.stringify(context?.activity_summary || context?.recent_activity || null)}. Goals context: ${JSON.stringify(context?.visible_data_summary || null)}.` },
                { label: 'Review Progress', icon: TrendingUp, prompt: `Review my current progress across goals and learning. Context: page=${context?.pageType || 'unknown'}, role=${appRole || 'User'}, name=${context?.user_name || user?.full_name || 'user'}. Learning progress: ${JSON.stringify(context?.learning_progress || null)}. Visible data: ${JSON.stringify(context?.visible_data_summary || null)}.` },
                { label: 'Analyze Results', icon: BarChart2, prompt: `Analyze my latest assessment results and surface the most important insights. Context: page=${context?.pageType || 'unknown'}, role=${appRole || 'User'}. Assessment data: ${JSON.stringify(context?.page_specific_insights?.assessment_summary || context?.assessment_summary || null)}. Competency data: ${JSON.stringify(context?.visible_data_summary || null)}.` },
              ].map(({ label, icon: Icon, prompt }) => (
                <button
                  key={label}
                  onClick={() => !isTyping && handleSendMessage(prompt)}
                  disabled={isTyping}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-opacity-90"
                  style={{ borderColor: 'rgba(2,2,255,0.25)', color: '#0202ff', backgroundColor: 'rgba(2,2,255,0.05)' }}
                  onMouseEnter={e => !isTyping && (e.currentTarget.style.backgroundColor = 'rgba(2,2,255,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(2,2,255,0.05)')}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
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