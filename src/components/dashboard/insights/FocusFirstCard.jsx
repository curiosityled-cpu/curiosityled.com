import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight } from 'lucide-react';
import { motion } from "framer-motion";
import { useAtreusChat } from '@/components/ai/AtreusContext';

export default function FocusFirstCard({ scores }) {
    const { openChat } = useAtreusChat();

    if (!scores) return null;

    // Find the lowest-scoring competency
    const competencies = [
        { name: "Decision-Making", score: scores.dm_pct, key: "dm_pct" },
        { name: "Communication", score: scores.comm_pct, key: "comm_pct" },
        { name: "Resource Management", score: scores.trm_pct, key: "trm_pct" },
        { name: "Collaboration", score: scores.collab_pct, key: "collab_pct" },
        { name: "Performance Management", score: scores.pm_pct, key: "pm_pct" },
        { name: "Situational Intelligence", score: scores.si_pct, key: "si_pct" }
    ];

    const lowestCompetency = competencies.reduce((prev, current) =>
        current.score < prev.score ? current : prev
    );

    const handleBuildPlan = () => {
        openChat({
            type: 'development_plan',
            lowestCompetency: lowestCompetency.name,
            score: lowestCompetency.score,
            message: `Help me create a focused development plan to improve my ${lowestCompetency.name} skills from ${lowestCompetency.score}% to 75%+`
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <Card className="border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50 to-transparent shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 uppercase text-sm tracking-wide mb-2">
                                HERE'S WHAT TO FOCUS ON FIRST
                            </h3>
                            <p className="text-gray-700 mb-3">
                                Your lowest-scoring area is <span className="font-semibold">{lowestCompetency.name} ({lowestCompetency.score}%)</span> — this is your biggest opportunity to grow as a leader right now.
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                                Suggested: Create a short, focused development plan targeting this competency to close the gap quickly.
                            </p>
                            <div className="flex gap-3 flex-wrap">
                                <Button
                                    onClick={handleBuildPlan}
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                >
                                    Build My Plan
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Show Me Why
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}