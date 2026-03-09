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
import { toast } from "sonner";

export default function LearningModuleCoach({ moduleData, onClose, user }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    loadModule();
    return () => { isMountedRef.current = false; };
  }, []);

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

      const existingConv = await base44.entities.Conversation.filter({
        status: 'active',
        type: 'conversational_learning',
        'context.module_id': moduleData.id
      });

      if (existingConv.length > 0) {
        setConversationId(existingConv[0].id);
        setMessages(existingConv[0].messages || []);
        setCurrentStep(existingConv[0].context?.current_step_index || 0);
      } else {
        const firstStep = moduleData.conversation_structure[0];
        const conv = await base44.entities.Conversation.create({
          title: `Learning: ${moduleData.title}`,
          type: 'conversational_learning',
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

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    const text = inputValue.trim();
    setInputValue("");
    setIsTyping(true);

    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Module step: ${moduleData.conversation_structure[currentStep].step_type}\nUser: ${text}\n\nRespond thoughtfully as a coach.`
      });

      const assistantMsg = { role: "assistant", content: response, timestamp: new Date().toISOString() };
      const final = [...updated, assistantMsg];
      setMessages(final);

      await base44.entities.Conversation.update(conversationId, { messages: final, last_activity: new Date().toISOString() });

      // Check advancement
      if (text.length > 20 && currentStep < moduleData.conversation_structure.length - 1) {
        setTimeout(() => {
          const nextStep = currentStep + 1;
          setCurrentStep(nextStep);
          const nextMsg = { role: "assistant", content: moduleData.conversation_structure[nextStep].content, timestamp: new Date().toISOString() };
          setMessages(prev => [...prev, nextMsg]);
          const pct = Math.round(((nextStep + 1) / moduleData.conversation_structure.length) * 100);
          setProgress(prev => ({ ...prev, progress_percentage: pct }));
          base44.entities.LearnerProgress.update(progress.id, { progress_percentage: pct });
        }, 2000);
      }
    } catch (error) {
      toast.error('Failed to send message');
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