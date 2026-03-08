
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    MessageCircle,
    Send,
    Bot,
    User,
    Loader2,
    Sparkles,
    Play,
    ExternalLink,
    Clock,
    Star,
    Brain,
    Lightbulb,
    Target,
    ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InvokeLLM } from "@/integrations/Core";
import { User as UserEntity } from "@/entities/User";

export default function AICoachChat({
    userName = "there",
    userScores = {},
    userInfo = {},
}) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [user, setUser] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(true);

    const getLowestScoringCompetency = (scores) => {
        const competencies = [
            { name: "Decision-Making", score: scores.dm_pct || 0, key: "decision_making" },
            { name: "Communication", score: scores.comm_pct || 0, key: "communication" },
            { name: "Time/Resource Management", score: scores.trm_pct || 0, key: "time_resource_management" },
            { name: "Collaboration", score: scores.collab_pct || 0, key: "collaboration" },
            { name: "Performance Management", score: scores.pm_pct || 0, key: "performance_management" }
        ];

        return competencies.reduce((prev, current) =>
            prev.score < current.score ? prev : current
        );
    };

    const getHighestScoringCompetency = (scores) => {
        const competencies = [
            { name: "Decision-Making", score: scores.dm_pct || 0, key: "decision_making" },
            { name: "Communication", score: scores.comm_pct || 0, key: "communication" },
            { name: "Time/Resource Management", score: scores.trm_pct || 0, key: "time_resource_management" },
            { name: "Collaboration", score: scores.collab_pct || 0, key: "collaboration" },
            { name: "Performance Management", score: scores.pm_pct || 0, key: "performance_management" }
        ];

        return competencies.reduce((prev, current) =>
            prev.score > current.score ? prev : current
        );
    };

    // Context-aware suggestions based on assessment results
    const getContextualSuggestions = () => {
        const lowestCompetency = getLowestScoringCompetency(userScores);
        const highestCompetency = getHighestScoringCompetency(userScores);
        
        return [
            `How can I improve my ${lowestCompetency.name} skills?`,
            `What should I focus on to reach the next level?`,
            `How do I leverage my ${highestCompetency.name} strength?`,
            `Create a 90-day development plan for me`
        ];
    };

    const generateWelcomeMessage = useCallback(() => {
        const firstName = user?.first_name || userName || "there";
        const lowestCompetency = getLowestScoringCompetency(userScores);
        const highestCompetency = getHighestScoringCompetency(userScores);

        return `Hi ${firstName}! I've analyzed your leadership assessment results. Your ${highestCompetency.name} score of ${highestCompetency.score}% is a real strength, while ${lowestCompetency.name} at ${lowestCompetency.score}% represents your biggest growth opportunity. I have specific resources and strategies that can help you develop. What would you like to explore first?`;
    }, [user, userName, userScores]);

    // Load user and initialize conversation
    useEffect(() => {
        const initializeData = async () => {
            try {
                const currentUser = await UserEntity.me();
                setUser(currentUser);
            } catch (error) {
                console.error("Error loading user:", error);
                setUser({ first_name: userName, email: "demo@example.com" });
            }
        };

        if (!isInitialized) {
            initializeData();
        }
    }, [isInitialized, userName]);

    useEffect(() => {
        if (user && messages.length === 0) {
            const welcomeMessage = generateWelcomeMessage();
            setMessages([{
                role: "assistant",
                content: welcomeMessage,
                timestamp: new Date(),
                contextual: true
            }]);
            setIsInitialized(true);
        }
    }, [user, messages.length, generateWelcomeMessage]);

    const handleSendMessage = async (message) => {
        if (!message.trim() || isTyping) return;

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
            const contextPrompt = `You are the Curiosity Led AI Coach - a supportive, insightful leadership development companion. The user has just completed their leadership assessment.

User Context:
- Name: ${user?.first_name || 'Leader'}
- Assessment Results: Decision Making ${userScores.dm_pct || 75}%, Communication ${userScores.comm_pct || 65}%, Time/Resource Management ${userScores.trm_pct || 80}%, Collaboration ${userScores.collab_pct || 82}%, Performance Management ${userScores.pm_pct || 70}%, Situational Intelligence ${userScores.si_pct || 71}%
- Role: ${userInfo.role_level || "Manager"} in ${userInfo.sector || "Healthcare"}
- Message: "${message}"

Respond as their personal leadership coach with:
- Warm, conversational tone focused on their specific results
- Specific, actionable advice based on their scores
- Reference their assessment results when relevant
- Curiosity-driven questions to help them reflect
- Keep responses under 150 words
- Suggest specific development actions or resources when appropriate

Focus on being supportive and growth-oriented based on their actual assessment data.`;

            const response = await InvokeLLM({
                prompt: contextPrompt,
                add_context_from_internet: false
            });

            const aiMessage = {
                role: 'assistant',
                content: response,
                timestamp: new Date(),
                hasAction: Math.random() > 0.7
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error getting AI response:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm here to help you on your leadership development journey based on your assessment results! Could you tell me more about what specific area you'd like to focus on?",
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-96 bg-white z-50 shadow-lg flex flex-col rounded-l-lg border-l border-gray-200"
        >
            <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">AI Coach</CardTitle>
                            <p className="text-xs text-gray-600">Your leadership companion</p>
                        </div>
                    </div>
                </div>
                
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 w-fit">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Assessment Results Focus
                </Badge>
            </CardHeader>

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 space-y-4 py-4">
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

                <div className="border-t bg-gray-50 p-3 rounded-b-lg flex-shrink-0">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ask me about your results..."
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
                        Personalized coaching based on your assessment results
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
