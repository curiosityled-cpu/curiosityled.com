import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, FileText, BarChart3, Brain } from 'lucide-react';

const AnalysisLoading = () => {
    const items = [
        { icon: FileText, text: 'Parsing Assessment Answers', delay: 0 },
        { icon: BarChart3, text: 'Calculating Competency Scores', delay: 0.5 },
        { icon: Brain, text: 'Generating AI-Powered Insights', delay: 1 },
        { icon: Sparkles, text: 'Building Your Personalized Dashboard', delay: 1.5 },
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full"
            >
                <div className="mb-6">
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-16 h-16 bg-blue-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg"
                    >
                        <Bot size={32} />
                    </motion.div>
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">Analyzing Your Leadership Profile</h1>
                <p className="text-gray-600 mb-8">
                    Our AI is generating your personalized report. This may take a moment.
                </p>
                
                <div className="space-y-3 text-left">
                    {items.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: item.delay }}
                            className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border"
                        >
                            <div className="w-5 h-5 flex items-center justify-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: item.delay + 0.2, type: 'spring' }}
                                >
                                    <item.icon className="w-5 h-5 text-blue-500" />
                                </motion.div>
                            </div>
                            <span className="text-sm text-gray-700">{item.text}</span>
                            <div className="ml-auto">
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: `${item.delay}s` }} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default AnalysisLoading;