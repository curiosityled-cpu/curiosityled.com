import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Bot, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InvokeLLM } from "@/integrations/Core";

export default function AICoachChatResults({ context, profileData, initialMessage }) {
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
      let prompt = `You are an expert AI leadership coach helping with onboarding and development. 

User context: ${context}
User message: "${message}"`;

      if (profileData) {
        prompt += `

PROFILE CONTEXT:
- Role: ${profileData.role || profileData.newHireRole}
- Company: ${profileData.company}
- Manager: ${profileData.manager || profileData.managerTitle}
- Team Size: ${profileData.direct_reports?.length || 0} direct reports
- Quarter Priorities: ${profileData.org_priorities_qtr?.join(', ') || 'Not specified'}
- Key Projects: ${profileData.project_notes?.map(p => p.project).join(', ') || 'Not specified'}

TEAM OVERVIEW:
${profileData.direct_reports?.map(dr => 
  `${dr.name} (${dr.tenure_years}y) - Strengths: ${dr.strengths?.join(', ')}, Development Areas: ${dr.risks?.join(', ')}`
).join('\n') || 'No team information'}`;
      }

      prompt += `

Provide helpful, specific, and actionable advice for this onboarding context. Be encouraging but practical. Keep responses conversational and under 200 words. If asked to modify plans or provide specific recommendations, be detailed and contextual.`;

      const response = await InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const aiMessage = {
        type: "ai",
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const fallbackMessage = {
        type: "ai",
        content: "I apologize, but I'm having trouble connecting right now. Could you try rephrasing your question? I'm here to help with your leadership development and onboarding plan.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestionButtons = [
    "What should they prioritize in their first week?",
    "How can they build trust with their team quickly?",
    "Help them prepare for stakeholder meetings"
  ];

  return (
    <Card className="shadow-lg border-0 h-fit sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          AI Leadership Coach
        </CardTitle>
        <Badge className="w-fit bg-blue-100 text-blue-800">
          <Sparkles className="w-3 h-3 mr-1" />
          Powered by ChatGPT
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto px-4 space-y-3">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {message.content}
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
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
                      className="w-2 h-2 bg-gray-400 rounded-full"
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
                  className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
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
              placeholder="Ask about the onboarding plan..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
              className="text-sm"
            />
            <Button
              onClick={() => sendMessage(inputValue)}
              size="sm"
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}