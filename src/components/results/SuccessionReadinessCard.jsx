
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ShieldCheck, ShieldAlert, MessageSquare } from 'lucide-react';

const SuccessionReadinessCard = ({ scores, archetype }) => {
    // --- Logic copied and adapted from Dashboard's AssessmentOverview ---
    const getSuccessionReadiness = () => {
        const currentScore = 78; // Fixed to 78% as requested
        
        // Mock data for factors not present in the assessment scores
        const learningProgress = 67; 
        const goalProgress = 75;
        const experienceLevel = 80;

        const readinessScore = Math.round(
            (currentScore * 0.4) +
            (learningProgress * 0.25) +
            (goalProgress * 0.2) +
            (experienceLevel * 0.15)
        );

        const getReadinessStatus = (score) => {
            if (score >= 85) return {
                status: "Ready Now",
                color: "text-green-600",
                bgColor: "bg-green-100",
                borderColor: "border-green-200",
                progressBg: "bg-green-500",
                description: "Prepared for next-level responsibilities",
                action: "Recommend for promotion consideration"
            };
            if (score >= 75) return {
                status: "Nearly Ready",
                color: "text-blue-600",
                bgColor: "bg-blue-100",
                borderColor: "border-blue-200",
                progressBg: "bg-blue-500",
                description: "6-12 months with targeted development",
                action: "Focus on leadership competency gaps"
            };
            if (score >= 65) return {
                status: "Developing",
                color: "text-yellow-600",
                bgColor: "bg-yellow-100",
                borderColor: "border-yellow-200",
                progressBg: "bg-yellow-500",
                description: "12-18 months development needed",
                action: "Structured development plan required"
            };
            return {
                status: "Building Foundation",
                color: "text-orange-600",
                bgColor: "bg-orange-100",
                borderColor: "border-orange-200",
                progressBg: "bg-orange-500",
                description: "18+ months development needed",
                action: "Focus on core leadership fundamentals"
            };
        };

        const readiness = getReadinessStatus(readinessScore);

        const gapsToReadyNow = [];
        if (currentScore < 85) gapsToReadyNow.push("Leadership competencies (need 85%+)");
        if (learningProgress < 85) gapsToReadyNow.push("Learning completion (need 85%+)");
        if (goalProgress < 85) gapsToReadyNow.push("Goal achievement (need 85%+)");
        if (experienceLevel < 85) gapsToReadyNow.push("Relevant experience (need 85%+)");

        return {
            ...readiness,
            score: readinessScore,
            factors: {
                'Assessment Score': currentScore,
                'Learning Progress': learningProgress,
                'Goal Achievement': goalProgress,
                'Experience Level': experienceLevel
            },
            gapsToReadyNow: gapsToReadyNow
        };
    };
    
    const succession = getSuccessionReadiness();
    // --- End of copied logic ---

    const nextLevelRole = "Senior Director/VP";

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-blue-600" />
                    Succession Readiness Profile
                </CardTitle>
                <p className="text-sm text-gray-600">Your potential for taking on next-level leadership responsibilities</p>
            </CardHeader>
            <CardContent>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
                    <p className="text-sm text-blue-800 font-medium">Next-Level Role Potential:</p>
                    <p className="text-base font-semibold text-blue-900">{nextLevelRole}</p>
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Readiness Status</p>
                  <Badge className={`${succession.bgColor} ${succession.color} ${succession.borderColor} border text-xs`}>
                    {succession.status}
                  </Badge>
                </div>

                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Readiness Score</span>
                      <span className={`text-sm font-bold ${succession.color}`}>{succession.score}%</span>
                    </div>

                    <div className="relative w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${succession.progressBg}`}
                        style={{ width: `${succession.score}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 italic">{succession.description}</p>
                </div>

                <div className="mt-6 space-y-4">
                    <h4 className="font-semibold text-gray-800 text-sm">Contributing Factors:</h4>
                    <div className="space-y-3">
                      {Object.entries(succession.factors).map(([factor, score]) => (
                        <div key={factor} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-gray-600">{factor}</span>
                          <div className="flex items-center gap-2 w-1/2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 bg-blue-400 rounded-full transition-all duration-700"
                                style={{ width: `${score}%` }}
                              ></div>
                            </div>
                            <span className="font-medium w-8 text-right text-gray-700">{score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>

                {succession.gapsToReadyNow.length > 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs font-medium text-yellow-800 mb-2">Steps to "Ready Now":</p>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        {succession.gapsToReadyNow.map((gap, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 bg-yellow-600 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-700 font-medium">Next Action</p>
                        <p className="text-sm text-gray-600">{succession.action}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Speak to Manager
                        </Button>
                        <Button variant="outline" size="sm">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Create Development Plan
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SuccessionReadinessCard;
