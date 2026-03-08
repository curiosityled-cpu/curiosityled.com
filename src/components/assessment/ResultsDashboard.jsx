import React from 'react';
import { Badge } from "@/components/ui/badge";
import { User, Sparkles, Target, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

import CompetencyScoresChart from './CompetencyScoresChart';
import SituationalIntelligenceScore from './SituationalIntelligenceScore';
import PeerBenchmarkChart from './PeerBenchmarkChart';
import AIGeneratedPlan from './AIGeneratedPlan';

export default function ResultsDashboard({ data }) {
    // Add null check and provide default data
    if (!data) {
        console.error("ResultsDashboard received null data");
        return (
            <div className="min-h-screen py-8 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-800">Loading Results...</h1>
                        <p className="text-gray-600 mt-2">Please wait while we process your assessment</p>
                    </div>
                </div>
            </div>
        );
    }

    // Provide default values for missing properties
    const user = data.user || {
        first_name: "Participant",
        role_level: "Leader",
        sector: "your industry"
    };

    const scores = data.scores || {
        dm_pct: 75,
        comm_pct: 65,
        rm_pct: 80,
        sm_pct: 82,
        pm_pct: 70,
        si_pct: 71
    };

    const analysis = data.analysis || {
        strengths: ["Strong leadership presence"],
        development_areas: ["Communication clarity"],
        archetype: "Strategic Leader",
        development_plan: "Focus on core leadership competencies"
    };

    const percentiles = data.percentiles || {
        decision_making: 75,
        communication: 65,
        resource_management: 80,
        stakeholder_management: 82,
        performance_management: 70,
        situational_intelligence: 71
    };

    const bands = data.bands || { overall: "Proficient" };
    const archetype = data.archetype || analysis.archetype;

    const competencyData = [
        { name: 'Decision Making', score: scores.dm_pct, percentile: percentiles?.decision_making },
        { name: 'Communication', score: scores.comm_pct, percentile: percentiles?.communication },
        { name: 'Resource Mgmt', score: scores.rm_pct, percentile: percentiles?.resource_management },
        { name: 'Stakeholder Mgmt', score: scores.sm_pct, percentile: percentiles?.stakeholder_management },
        { name: 'Performance Mgmt', score: scores.pm_pct, percentile: percentiles?.performance_management },
        { name: 'Situational Intel.', score: scores.si_pct, percentile: percentiles?.situational_intelligence },
    ];

    return (
        <div className="min-h-screen py-8 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Badge className="mb-4 bg-purple-100 text-purple-800 border-purple-200">
                        Your Leadership Index Results
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                        Leadership Profile for {user?.first_name || 'Participant'}
                    </h1>
                    <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{user?.role_level || 'Leader'} in {user?.sector || 'your industry'}</span>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                           <SituationalIntelligenceScore si_data={{ si_score: scores.si_pct, benchmark_text: `${percentiles?.situational_intelligence || 'N/A'}th Percentile` }} />
                        </motion.div>
                        
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                            <PeerBenchmarkChart title="Competency Percentiles vs. Peers" data={competencyData} />
                        </motion.div>

                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                            <AIGeneratedPlan analysis={analysis} />
                        </motion.div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-1 space-y-8">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                            <CompetencyScoresChart scores={scores} peerScores={percentiles} />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}