import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Send, Brain, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

export default function ConversationalModule() {
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const moduleId = searchParams.get("moduleId");

  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState(null);
  const [progress, setProgress] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadModule();
  }, [moduleId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadModule = async () => {
    if (!moduleId || !user) return;

    setLoading(true);
    try {
      const [modules, progressRecords] = await Promise.all([
        base44.entities.ConversationalLearningModule.filter({ id: moduleId }),
        base44.entities.LearnerProgress.filter({
          user_email: user.email,
          conversational_learning_module_id: moduleId
        })
      ]);

      if (modules.length === 0) {
        toast.error("Module not found");
        return;
      }

      const moduleData = modules[0];
      setModule(moduleData);

      let progressRecord = progressRecords.length > 0 ? progressRecords[0] : null;

      if (!progressRecord) {
        progressRecord = await base44.entities.LearnerProgress.create({
          user_email: user.email,
          conversational_learning_module_id: moduleId,
          status: "in_progress",
          progress_percentage: 0,
          last_accessed_date: new Date().toISOString()
        });
      } else {
        await base44.entities.LearnerProgress.update(progressRecord.id, {
          last_accessed_date: new Date().toISOString()
        });
      }

      setProgress(progressRecord);

      // Initialize with first step
      if (moduleData.conversation_structure && moduleData.conversation_structure.length > 0) {
        const firstStep = moduleData.conversation_structure[0];
        setMessages([{
          role: "assistant",
          content: firstStep.content,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error("Error loading module:", error);
      toast.error("Failed to load module");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const userMessage = {
      role: "user",
      content: userInput,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput("");
    setIsProcessing(true);

    try {
      const currentStep = module.conversation_structure[currentStepIndex];

      // Build context for Atreus
      const systemPrompt = `You are Atreus, an AI leadership coach guiding a learner through a conversational learning module.

**Module Context:**
- Title: ${module.title}
- Learning Objective: ${currentStep.learning_objective || "General leadership development"}
- Current Step Type: ${currentStep.step_type}

**Your Role:**
${currentStep.coaching_notes || "Guide the learner through this step with thoughtful questions and feedback."}

**Instructions:**
- Be conversational, supportive, and insightful
- Ask probing questions to deepen understanding
- Provide constructive feedback
- Help the learner reflect on their responses
- When the learner demonstrates understanding, acknowledge it and guide them to the next step

**Previous Conversation:**
${messages.map(m => `${m.role === "user" ? "Learner" : "Atreus"}: ${m.content}`).join("\n")}

**Learner's Response:**
${userInput}

Respond as Atreus, providing guidance and determining if this step is complete.`;

      const response = await base44.integrations.invoke("Core", "InvokeLLM", {
        prompt: systemPrompt
      });

      const atreusMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, atreusMessage]);

      // Check if we should advance to next step
      if (currentStepIndex < module.conversation_structure.length - 1) {
        // Simple heuristic: advance after 2-3 exchanges per step
        const stepMessages = messages.filter((_, i) => i >= currentStepIndex * 4).length;
        if (stepMessages >= 4) {
          setTimeout(() => advanceToNextStep(), 2000);
        }
      } else {
        // Last step completed
        setTimeout(() => completeModule(), 2000);
      }

      // Update progress
      const progressPct = Math.round(((currentStepIndex + 1) / module.conversation_structure.length) * 100);
      await base44.entities.LearnerProgress.update(progress.id, {
        progress_percentage: progressPct,
        last_accessed_date: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error processing message:", error);
      toast.error("Failed to process your response");
    } finally {
      setIsProcessing(false);
    }
  };

  const advanceToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < module.conversation_structure.length) {
      const nextStep = module.conversation_structure[nextIndex];
      setCurrentStepIndex(nextIndex);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: nextStep.content,
        timestamp: new Date().toISOString(),
        isStepTransition: true
      }]);
    }
  };

  const completeModule = async () => {
    try {
      await base44.entities.LearnerProgress.update(progress.id, {
        status: "completed",
        progress_percentage: 100,
        completed_date: new Date().toISOString()
      });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `🎉 Congratulations! You've completed the module "${module.title}". You've demonstrated great insight and growth throughout this learning journey. Keep applying these principles in your leadership practice!`,
        timestamp: new Date().toISOString(),
        isCompletion: true
      }]);

      toast.success("Module completed!");
    } catch (error) {
      console.error("Error completing module:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Module not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = progress?.progress_percentage || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl("Development")}>
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Learning
            </Button>
          </Link>
          <Card className="shadow-lg border-0">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{module.title}</CardTitle>
                  <p className="text-gray-600 text-sm">{module.description}</p>
                  <div className="flex gap-2 mt-3">
                    {module.competencies?.map(comp => (
                      <Badge key={comp} variant="outline">{comp}</Badge>
                    ))}
                  </div>
                </div>
                <Brain className="w-12 h-12 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-gray-500">
                  Step {currentStepIndex + 1} of {module.conversation_structure?.length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <Card className="shadow-lg border-0 mb-6">
          <CardContent className="p-6">
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white" 
                        : msg.isCompletion 
                        ? "bg-green-50 border-2 border-green-500 text-gray-900"
                        : "bg-gray-100 text-gray-900"
                    }`}>
                      {msg.isStepTransition && (
                        <div className="flex items-center gap-2 mb-2 text-purple-600 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          Next Step
                        </div>
                      )}
                      <ReactMarkdown className="prose prose-sm max-w-none">
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {progress?.status !== "completed" && (
              <div className="flex gap-2">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Share your thoughts..."
                  rows={3}
                  className="flex-1"
                  disabled={isProcessing}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!userInput.trim() || isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}