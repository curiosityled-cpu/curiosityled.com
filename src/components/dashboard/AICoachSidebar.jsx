import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Send, 
  X, 
  Lightbulb, 
  Target, 
  MessageCircle,
  Sparkles,
  ArrowRight,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InvokeLLM } from "@/integrations/Core";

export default function AICoachSidebar({ activeTab, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Context-aware suggestions based on active tab
  const getContextualSuggestions = () => {
    const suggestions = {
      assessments: [
        "How can I improve my leadership assessment scores?",
        "What does my leadership style say about me?",
        "Help me understand my development areas"
      ],
      learning: [
        "What should I focus on learning next?",
        "How do I apply these concepts to my role?",
        "Can you recommend specific resources?"
      ],
      goals: [
        "Help me set better leadership goals",
        "How can I stay motivated to reach my goals?",
        "What's a realistic timeline for my development?"
      ],
      insights: [
        "What patterns do you see in my leadership data?",
        "How do I compare to other leaders?",
        "What should I prioritize based on my insights?"
      ],
      journeys: [
        "Which journey should I start with?",
        "How long does each journey typically take?",
        "Can you personalize a learning path for me?"
      ]
    };
    return suggestions[activeTab] || suggestions.assessments;
  };

  // Welcome message based on context
  useEffect(() => {
    const contextMessages = {
      assessments: `Hi ${user?.first_name || 'there'}! I'm here to help you understand your leadership assessment results and guide you toward your next steps. What would you like to explore?`,
      learning: `Ready to grow? I can help you find the perfect learning resources based on your leadership style and goals. What interests you most?`,
      goals: `Let's work on your leadership goals together! I can help you set meaningful objectives and create actionable plans. What are you hoping to achieve?`,
      insights: `I've been analyzing your leadership patterns. Want to dive into what the data reveals about your strengths and opportunities?`,
      journeys: `Curious about where to start? I can recommend the perfect learning journey based on your role and development needs. Tell me about your situation!`
    };

    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: contextMessages[activeTab],
        timestamp: new Date(),
        contextual: true
      }]);
    }
  }, [activeTab, user, messages.length]);

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const contextPrompt = `You are the Curiosity Led AI Coach - a supportive, insightful leadership development companion. The user is currently viewing the "${activeTab}" section of their dashboard.

User Context:
- Name: ${user?.first_name || 'Leader'}
- Current Section: ${activeTab}
- Message: "${message}"

Respond as their personal leadership coach with:
- Warm, conversational tone
- Specific, actionable advice
- Curiosity-driven questions to help them reflect
- Keep responses under 150 words
- Reference their current dashboard section when relevant

Focus on being supportive and growth-oriented, not just informative.`;

      const response = await InvokeLLM({
        prompt: contextPrompt,
        add_context_from_internet: false
      });

      const aiMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        hasAction: Math.random() > 0.7 // Sometimes include action suggestions
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm here to help you on your leadership journey! Could you tell me more about what you're working on?",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-40 flex flex-col border-l"
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Coach</h3>
              <p className="text-xs text-gray-600">Your leadership companion</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Sparkles className="w-3 h-3 mr-1" />
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Focus
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Brain className="w-3 h-3 text-blue-600" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-xl p-3 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.contextual
                    ? 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900 border border-blue-100'
                    : 'bg-gray-100 text-gray-900'
              }`}>
                {message.content}

                {message.hasAction && message.role === 'assistant' && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <Button size="sm" variant="outline" className="h-6 text-xs">
                      <Play className="w-3 h-3 mr-1" />
                      Try This
                    </Button>
                  </div>
                )}
              </div>
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
              <Brain className="w-3 h-3 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-xl p-3">
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

        {/* Contextual Suggestions */}
        {showSuggestions && messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Try asking:</p>
            {getContextualSuggestions().map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors border border-blue-100"
              >
                <MessageCircle className="w-3 h-3 inline mr-1" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything about leadership..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
            className="text-sm border-gray-200"
          />
          <Button
            onClick={() => handleSendMessage(inputValue)}
            size="sm"
            disabled={!inputValue.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Your AI coach adapts to each section
        </p>
      </div>
    </motion.div>
  );
}