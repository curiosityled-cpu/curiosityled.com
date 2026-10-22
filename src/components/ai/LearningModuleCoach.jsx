import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles, Loader2, Send, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import CoachMessage from "./CoachMessage";
import TypingIndicator from "./TypingIndicator";
import ModuleActionCard from "./ModuleActionCard";
import { requestModuleTurn, executeModuleAction } from "@/lib/moduleActions";
import { toast } from "sonner";

export default function LearningModuleCoach({ moduleData, onClose, user }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef(null);
  const isMountedRef = useRef(true);

  // The panel is wrapped in its own auth provider, which resolves the signed-in
  // account asynchronously — wait for it, and load as soon as it arrives.
  useEffect(() => {
    if (!user?.email) return undefined;
    isMountedRef.current = true;
    loadModule();
    return () => { isMountedRef.current = false; };
  }, [user?.email]);

  const loadModule = async () => {
    try {
      const existingProgress = await base44.entities.LearnerProgress.filter({
        user_email: user.email,
        conversational_learning_module_id: moduleData.id
      });

      let progressRecord = existingProgress[0] || await base44.entities.LearnerProgress.create({
        user_email: user.email,
        conversational_learning_module_id: moduleData.id,
        status: "in_progress",
        progress_percentage: 0,
        last_accessed_date: new Date().toISOString()
      });

      setProgress(progressRecord);

      // 'assigned_learning' is the conversation type this data model accepts for
      // module conversations; an unknown type is rejected by the database.
      // Look for this module's conversation whether it is still open or already
      // finished, so the learner's history survives closing the panel.
      const page = await base44.entities.Conversation.filter(
        { type: 'assigned_learning' },
        { sort: '-updated_date', limit: 20 }
      );
      const existingConv = (page?.items || []).filter(
        (conv) => conv.context?.module_id === moduleData.id
      );

      if (existingConv.length > 0) {
        const restored = existingConv[0];
        setConversationId(restored.id);
        setMessages(restored.messages || []);
        setCurrentStep(restored.context?.current_step_index || 0);
      } else {
        const firstStep = moduleData.conversation_structure[0];
        const conv = await base44.entities.Conversation.create({
          title: `Learning: ${moduleData.title}`,
          type: 'assigned_learning',
          status: 'active',
          messages: [{ role: "assistant", content: firstStep.content, timestamp: new Date().toISOString() }],
          context: { module_id: moduleData.id, current_step_index: 0, total_steps: moduleData.conversation_structure.length },
          last_activity: new Date().toISOString()
        });
        setConversationId(conv.id);
        setMessages(conv.messages);
      }
    } catch (error) {
      toast.error('Failed to load module');
    } finally {
      setLoading(false);
    }
  };

  const persistStep = async (index, allMessages) => {
    if (!conversationId) return;
    await base44.entities.Conversation.update(conversationId, {
      messages: allMessages,
      context: {
        module_id: moduleData.id,
        current_step_index: index,
        total_steps: moduleData.conversation_structure.length,
      },
      last_activity: new Date().toISOString(),
    });
  };

  const finishModule = async (finalMessages) => {
    if (!progress?.id) return;
    try {
      const withClosing = [
        ...(finalMessages || messages),
        {
          role: "assistant",
          content: `That completes "${moduleData.title}". This lesson is now marked complete in your course.`,
          timestamp: new Date().toISOString(),
        },
      ];
      setMessages(withClosing);

      const updated = await base44.entities.LearnerProgress.update(progress.id, {
        status: "completed",
        progress_percentage: 100,
        completed_date: new Date().toISOString(),
        last_accessed_date: new Date().toISOString(),
      });
      setProgress({
        ...(progress || {}),
        ...(updated || {}),
        status: "completed",
        progress_percentage: 100,
      });

      if (conversationId) {
        await base44.entities.Conversation.update(conversationId, {
          messages: withClosing,
          context: {
            module_id: moduleData.id,
            current_step_index: moduleData.conversation_structure.length - 1,
            total_steps: moduleData.conversation_structure.length,
          },
          status: "completed",
          last_activity: new Date().toISOString(),
        });
      }

      // The course player listens for this so the lesson ticks off on its own.
      window.dispatchEvent(
        new CustomEvent("learning-module-completed", { detail: { moduleId: moduleData.id } })
      );
      toast.success("Module complete");
    } catch (error) {
      console.error("Could not complete module:", error);
      toast.error("Could not save your completion");
    }
  };

  // Moves the module on: posts the next step's prompt, or closes the module when
  // the learner has finished the last step.
  const advanceFrom = async (fromIndex, msgs) => {
    const steps = moduleData.conversation_structure || [];
    const nextIndex = fromIndex + 1;

    if (nextIndex >= steps.length) {
      await finishModule(msgs);
      return;
    }

    const withNext = [
      ...msgs,
      { role: "assistant", content: steps[nextIndex].content, timestamp: new Date().toISOString() },
    ];
    const pct = Math.round(((nextIndex + 1) / steps.length) * 100);

    setCurrentStep(nextIndex);
    setMessages(withNext);
    setProgress((prev) => ({ ...(prev || {}), progress_percentage: pct }));

    if (progress?.id) {
      await base44.entities.LearnerProgress.update(progress.id, {
        progress_percentage: pct,
        last_accessed_date: new Date().toISOString(),
      });
    }
    await persistStep(nextIndex, withNext);
  };

  // The learner answered the coach's proposed action: carry it out, or drop it,
  // then continue the module exactly where it left off.
  const resolveAction = async (approved) => {
    const action = pendingAction;
    if (!action) return;
    setPendingAction(null);
    const shouldAdvance = pendingAdvance;
    setPendingAdvance(false);

    let withOutcome = messages;
    try {
      if (approved) {
        setIsExecuting(true);
        const outcome = await executeModuleAction(action, user);
        withOutcome = [
          ...messages,
          { role: "assistant", content: outcome.message, timestamp: new Date().toISOString() },
        ];
      } else {
        withOutcome = [
          ...messages,
          {
            role: "assistant",
            content: "No problem — we'll leave that one.",
            timestamp: new Date().toISOString(),
          },
        ];
      }
    } finally {
      setIsExecuting(false);
    }
    setMessages(withOutcome);

    try {
      if (shouldAdvance) {
        await advanceFrom(currentStep, withOutcome);
      } else {
        await persistStep(currentStep, withOutcome);
      }
    } catch (error) {
      console.error("Could not save the conversation:", error);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    const text = inputValue.trim();
    setInputValue("");
    setIsTyping(true);

    const withUser = [
      ...messages,
      { role: "user", content: text, timestamp: new Date().toISOString() },
    ];
    setMessages(withUser);
    // Save the learner's own words straight away, so nothing is lost if the reply fails.
    persistStep(currentStep, withUser).catch(() => {});

    try {
      const result = await requestModuleTurn({
        moduleData,
        stepIndex: currentStep,
        messages: withUser,
        actionPending: !!pendingAction,
      });

      const withReply = result.reply
        ? [
            ...withUser,
            { role: "assistant", content: result.reply, timestamp: new Date().toISOString() },
          ]
        : withUser;
      setMessages(withReply);

      if (result.action) {
        // Hold the module here until the learner approves or declines.
        setPendingAction(result.action);
        setPendingAdvance(result.stepComplete);
        await persistStep(currentStep, withReply);
      } else if (result.stepComplete) {
        await advanceFrom(currentStep, withReply);
      } else {
        await persistStep(currentStep, withReply);
      }
    } catch (error) {
      console.error("Module message failed:", error);
      toast.error("Failed to send message");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="fixed bottom-6 right-6 w-[500px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b bg-indigo-600">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-white" />
          <div>
            <h3 className="font-semibold text-white">Learning with Atreus</h3>
            <p className="text-xs text-white opacity-90">Step {currentStep + 1}/{moduleData.conversation_structure.length}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.map((msg, i) => <CoachMessage key={i} message={msg} />)}
            {isTyping && <TypingIndicator />}
          </ScrollArea>

          <div className="p-4 border-t">
            {progress?.status === 'completed' ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="font-medium mb-2">Module Completed!</p>
                <Button onClick={onClose} className="bg-green-600">Return to Learning</Button>
              </div>
            ) : pendingAction ? (
              <ModuleActionCard
                action={pendingAction}
                busy={isExecuting}
                onApprove={() => resolveAction(true)}
                onDecline={() => resolveAction(false)}
              />
            ) : (
              <div className="flex gap-2">
                <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }} placeholder="Share your thoughts..." rows={2} disabled={isTyping} />
                <Button onClick={handleSend} disabled={!inputValue.trim() || isTyping} className="bg-indigo-600" size="icon">
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}