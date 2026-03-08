import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Lightbulb, Star } from "lucide-react";

export default function InsightsCard({ insights }) {
    const { top_strength, top_development_priority, development_tip } = insights;
    
    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    AI-Powered Insights
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowUp className="w-4 h-4 text-green-600" />
                        <h4 className="font-semibold text-green-800">Top Strength</h4>
                    </div>
                    <p className="text-green-700">{top_strength}</p>
                </div>
                
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDown className="w-4 h-4 text-red-600" />
                        <h4 className="font-semibold text-red-800">Top Development Priority</h4>
                    </div>
                    <p className="text-red-700">{top_development_priority}</p>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-800">Your Quick Tip</h4>
                    </div>
                    <p className="text-sm text-blue-700">{development_tip}</p>
                </div>
            </CardContent>
        </Card>
    );
}