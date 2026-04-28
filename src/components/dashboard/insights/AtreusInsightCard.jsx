import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight } from 'lucide-react';
import { motion } from "framer-motion";
import { useAtreusChat } from '@/components/ai/AtreusContext';

/**
 * AtreusInsightCard — AI-powered development plan card
 * Appears on the Insights page, uses the latest assessment data to
 * identify the lowest-scoring competency and prompt the user to build a plan.
 */
export default function AtreusInsightCard({ assessment, user, insight }) {
    const { openWithContext } = useAtreusChat();

    if (!assessment) return null;

    // Competency mappings
    const competencies = [
        { name: "Situational Intelligence", score: assessment.si_pct, key: "si_pct" },
        { name: "Decision Making", score: assessment.dm_pct, key: "dm_pct" },
        { name: "Communication", score: assessment.comm_pct, key: "comm_pct" },
        { name: "Resource Management", score: assessment.rm_pct, key: "rm_pct" },
        { name: "Stakeholder Management", score: assessment.sm_pct, key: "sm_pct" },
        { name: "Performance Management", score: assessment.pm_pct, key: "pm_pct" },
    ].filter(c => c.score != null);

    if (competencies.length === 0) return null;

    // Identify lowest and highest
    const lowestCompetency = competencies.reduce((prev, current) =>
        current.score < prev.score ? current : prev
    );
    const highestCompetency = competencies.reduce((prev, current) =>
        current.score > prev.score ? current : prev
    );

    // Extract dev focus from insight if available
    const devFocus = insight?.development_areas?.length > 0
        ? insight.development_areas[0]
        : lowestCompetency.name;

    // Build Atreus context payload
    const contextPayload = {
        source: "insights_leadership_profile",
        user_name: user?.full_name || user?.display_name || "User",
        role_title: user?.current_role || null,
        company: user?.organization || null,
        sector: user?.sector || null,
        overall_score: assessment.overall_pct,
        competency_scores: {
            si: assessment.si_pct,
            dm: assessment.dm_pct,
            comm: assessment.comm_pct,
            rm: assessment.rm_pct,
            sm: assessment.sm_pct,
            pm: assessment.pm_pct,
        },
        natural_strengths: insight?.top_strengths || [highestCompetency.name],
        development_focus: devFocus,
        lowest_competency: lowestCompetency.name,
        lowest_score: lowestCompetency.score,
        strongest_competency: highestCompetency.name,
    };

    const handleBuildPlan = () => {
        openWithContext({
            context: contextPayload,
            starterMessage: `Based on my Leadership Profile results, help me build a practical development plan focused on my biggest growth area.`
        });
    };

    const handleExplain = () => {
        openWithContext({
            context: contextPayload,
            starterMessage: `Explain my Leadership Profile results and why this development focus matters.`
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
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
                                Get AI-powered guidance to create a short, focused development plan targeting this competency to close the gap quickly.
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
                                    onClick={handleExplain}
                                    variant="outline"
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Explain My Results
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}