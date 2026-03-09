import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Bot, User, Play, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InvokeLLM } from "@/integrations/Core";

export default function AICoachChat({ context, profileData, initialMessage, userScores = {} }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (initialMessage) {
      setMessages([{
        type: "ai",
        content: initialMessage,
        timestamp: new Date()
      }]);
    }
  }, [initialMessage]);

  const sendMessage = async (message) => {
    if (!message.trim()) return;

    const userMessage = {
      type: "user", 
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Use InvokeLLM for ChatGPT-powered responses
      let prompt = `You are an expert AI leadership coach helping with onboarding and development. 

User context: ${context}
User message: "${message}"`;

      if (profileData) {
        prompt += `

PROFILE CONTEXT:
- Role: ${profileData.role}
- Company: ${profileData.company}
- Manager: ${profileData.manager}
- Team Size: ${profileData.direct_reports?.length || 0} direct reports
- Quarter Priorities: ${profileData.org_priorities_qtr?.join(', ') || 'Not specified'}
- Key Projects: ${profileData.project_notes?.map(p => p.project).join(', ') || 'Not specified'}

TEAM OVERVIEW:
${profileData.direct_reports?.map(dr => 
  `${dr.name} (${dr.tenure_years}y) - Strengths: ${dr.strengths?.join(', ')}, Risks: ${dr.risks?.join(', ')}`
).join('\n') || 'No team information'}`;
      }

      if (userScores && Object.keys(userScores).length > 0) {
        prompt += `

ASSESSMENT SCORES:
- Decision Making: ${userScores.dm_pct || 'N/A'}%
- Communication: ${userScores.comm_pct || 'N/A'}%
- Resource Management: ${userScores.rm_pct || 'N/A'}%
- Stakeholder Management: ${userScores.sm_pct || 'N/A'}%
- Performance Management: ${userScores.pm_pct || 'N/A'}%
- Situational Intelligence: ${userScores.si_pct || 'N/A'}%`;
      }

      prompt += `

Provide helpful, specific, and actionable advice. Be encouraging but practical. Keep responses conversational and under 200 words. If asked to modify plans or provide specific recommendations, be detailed and contextual.`;

      const response = await InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const aiMessage = {
        type: "ai",
        content: response,
        timestamp: new Date(),
        hasLearning: false
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback response
      const fallbackMessage = {
        type: "ai",
        content: "I apologize, but I'm having trouble connecting right now. Could you try rephrasing your question? I'm here to help with your leadership development and onboarding plan.",
        timestamp: new Date(),
        hasLearning: false
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestionButtons = context === "onboarding" ? [
    "What should I prioritize in my first week?",
    "How do I build trust with my team quickly?",
    "Help me prepare for stakeholder meetings"
  ] : [
    "How can I improve my communication?",
    "What's my biggest development area?",
    "Give me specific action steps"
  ];

  return (
    <Card className="shadow-lg border-0 h-fit max-h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          AI Leadership Coach
        </CardTitle>
        <Badge variant="outline" className="w-fit">
          <MessageCircle className="w-3 h-3 mr-1" />
          Real-time coaching
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto px-4 space-y-3 max-h-64">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-blue-600" />
                  </div>
                )}

                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.isRuleBased
                      ? 'bg-green-50 text-green-900 border border-green-200'
                      : 'bg-gray-100 text-gray-900'
                }`}>
                  {message.isRuleBased && (
                    <Badge className="mb-2 bg-green-200 text-green-800 text-xs">
                      Personalized Coaching
                    </Badge>
                  )}

                  {message.content}

                  {message.hasLearning && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-xs">{message.learningTitle}</p>
                          <p className="text-xs text-gray-600">{message.learningDuration}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-6 text-xs">
                          <Play className="w-3 h-3 mr-1" />
                          Watch
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2"
            >
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="w-3 h-3 text-blue-600" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                      className="w-1 h-1 bg-gray-400 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {messages.length <= 2 && (
          <div className="px-4 mb-3">
            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
            <div className="space-y-1">
              {suggestionButtons.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything about leadership..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
              className="text-sm"
            />
            <Button
              onClick={() => sendMessage(inputValue)}
              size="sm"
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}