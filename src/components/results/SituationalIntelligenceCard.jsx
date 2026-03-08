
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Info } from 'lucide-react';

export default function SituationalIntelligenceCard({ score = 71, benchmark = "Meets Target for Healthcare Mid-Level (73±9)" }) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getScoreInterpretation = (score) => {
        // Updated based on research benchmarks for Healthcare Mid-Level
        if (score >= 82) return { level: "Exceptional", color: "text-green-600", desc: "90th+ percentile - Succession candidate level situational intelligence" };
        if (score >= 73) return { level: "Target", color: "text-blue-600", desc: "50th-75th percentile - Meeting expected proficiency level" };
        if (score >= 64) return { level: "Emerging", color: "text-yellow-600", desc: "25th-49th percentile - Targeted skill development needed" };
        return { level: "Development Need", color: "text-orange-600", desc: "Below 25th percentile - Intensive coaching required" };
    };

    const interpretation = getScoreInterpretation(score);

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Situational Intelligence (SI) Score
                </CardTitle>
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">What is Situational Intelligence?</p>
                        <p>SI measures your ability to assess situations (25%), predict outcomes (30%), adapt to context (25%), and calibrate decisions (20%). This meta-competency drives your effectiveness across all leadership areas.</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Centered circular score display */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                stroke="#e5e7eb"
                                strokeWidth="6"
                                fill="transparent"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                stroke="#8b5cf6"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-purple-600">{score}%</span>
                            <span className="text-xs text-gray-500">out of 100</span>
                        </div>
                    </div>
                </div>
                
                {/* Benchmark and Target cards below score */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-800 text-sm">Your Benchmark</span>
                        </div>
                        <p className="text-green-700 text-sm">{benchmark}</p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${interpretation.color} bg-transparent border-0 p-0 text-xs`}>
                                {interpretation.level}
                            </Badge>
                        </div>
                        <p className="text-purple-700 text-xs">{interpretation.desc}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
