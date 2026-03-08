import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ReadinessScore({ 
    score, 
    breakdown, 
    remainingSteps 
}) {
    
    const getScoreColor = (score) => {
        if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-800', progress: 'bg-green-600' };
        if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-800', progress: 'bg-blue-600' };
        if (score >= 40) return { bg: 'bg-yellow-100', text: 'text-yellow-800', progress: 'bg-yellow-600' };
        return { bg: 'bg-red-100', text: 'text-red-800', progress: 'bg-red-600' };
    };

    const getReadinessLabel = (score) => {
        if (score >= 80) return 'Ready Now';
        if (score >= 60) return 'Nearly Ready';
        if (score >= 40) return 'In Development';
        return 'Needs Focus';
    };

    const colors = getScoreColor(score);
    const readinessLabel = getReadinessLabel(score);

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Promotion Readiness Score
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${colors.bg} mb-3`}
                    >
                        <div className="text-center">
                            <div className={`text-4xl font-bold ${colors.text}`}>
                                {Math.round(score)}%
                            </div>
                            <div className={`text-xs font-medium ${colors.text}`}>
                                {readinessLabel}
                            </div>
                        </div>
                    </motion.div>
                    <p className="text-sm text-gray-600">
                        Based on your competencies, goals, and learning progress
                    </p>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm">Score Breakdown</h4>
                    
                    {/* Competency Alignment */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Competency Alignment (50%)</span>
                            <span className="font-medium">{Math.round(breakdown.competency)}%</span>
                        </div>
                        <Progress value={breakdown.competency} className="h-2" />
                    </div>

                    {/* Goal Progress */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Relevant Goal Progress (30%)</span>
                            <span className="font-medium">{Math.round(breakdown.goals)}%</span>
                        </div>
                        <Progress value={breakdown.goals} className="h-2" />
                    </div>

                    {/* Learning Completion */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Learning Completion (20%)</span>
                            <span className="font-medium">{Math.round(breakdown.learning)}%</span>
                        </div>
                        <Progress value={breakdown.learning} className="h-2" />
                    </div>
                </div>

                {/* Remaining Steps */}
                {remainingSteps && remainingSteps.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                            Remaining Steps to "Ready Now"
                        </h4>
                        <div className="space-y-2">
                            {remainingSteps.map((step, index) => (
                                <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <AlertCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-purple-900">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Ready Badge */}
                {score >= 80 && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-green-900">
                            You're ready for this role! Consider discussing with your manager.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}