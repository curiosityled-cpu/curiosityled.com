import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp } from 'lucide-react';

export default function SituationalIntelligenceScore({ si_data }) {
    const { si_score, benchmark_text } = si_data;

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        Situational Intelligence (SI) Score
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                    <div className="relative w-40 h-40">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="3"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#8B5CF6"
                                strokeWidth="3"
                                strokeDasharray={`${si_score}, 100`}
                                strokeLinecap="round"
                                transform="rotate(90 18 18)"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-purple-600">{si_score}</span>
                            <span className="text-sm text-gray-500">out of 100</span>
                        </div>
                    </div>
                    <div className="text-center md:text-left">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                           <div className="flex items-center gap-2">
                             <TrendingUp className="w-5 h-5 text-green-600" />
                             <div>
                               <p className="font-semibold text-green-800">Your Benchmark</p>
                               <p className="text-green-700">{benchmark_text}</p>
                             </div>
                           </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}