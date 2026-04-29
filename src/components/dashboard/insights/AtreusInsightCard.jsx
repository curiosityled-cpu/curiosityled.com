import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from "framer-motion";
import { useAtreusChat } from '@/components/ai/AtreusContext';
import { base44 } from '@/api/base44Client';
import JourneyDraftConfirmModal from '@/components/ai/JourneyDraftConfirmModal';
import { toast } from 'sonner';

/**
 * AtreusInsightCard — AI-powered development plan card
 * "Build My Plan" now guides the user through creating a Journey draft.
 */
export default function AtreusInsightCard({ assessment, user, insight }) {
    const { openWithContext } = useAtreusChat();
    const [generatingDraft, setGeneratingDraft] = useState(false);
    const [journeyDraft, setJourneyDraft] = useState(null);
    const [showModal, setShowModal] = useState(false);

    if (!assessment) return null;

    const competencies = [
        { name: "Situational Intelligence", score: assessment.si_pct, key: "si" },
        { name: "Decision Making", score: assessment.dm_pct, key: "dm" },
        { name: "Communication", score: assessment.comm_pct, key: "comm" },
        { name: "Resource Management", score: assessment.rm_pct, key: "rm" },
        { name: "Stakeholder Management", score: assessment.sm_pct, key: "sm" },
        { name: "Performance Management", score: assessment.pm_pct, key: "pm" },
    ].filter(c => c.score != null);

    if (competencies.length === 0) return null;

    const lowestCompetency = competencies.reduce((prev, current) =>
        current.score < prev.score ? current : prev
    );
    const highestCompetency = competencies.reduce((prev, current) =>
        current.score > prev.score ? current : prev
    );

    const devFocus = insight?.development_areas?.length > 0
        ? insight.development_areas[0]
        : lowestCompetency.name;

    const contextPayload = {
        source: "insights_leadership_profile",
        user_name: user?.full_name || user?.display_name || "User",
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

    const handleBuildPlan = async () => {
        setGeneratingDraft(true);
        try {
            // 1. Fetch existing learning resources matching the development focus competency
            let matchedResources = [];
            try {
                const allResources = await base44.entities.LearningResource.filter({ is_active: true }, '-created_date', 50);
                const focusLower = devFocus.toLowerCase();
                matchedResources = allResources
                    .filter(r =>
                        r.competencies?.some(c => c.toLowerCase().includes(focusLower) ||
                            focusLower.includes(c.toLowerCase()))
                    )
                    .slice(0, 3);
            } catch (e) {
                console.warn('Could not fetch learning resources:', e);
            }

            // 2. Ask the LLM to generate a structured Journey draft
            const resourceContext = matchedResources.length > 0
                ? `Available learning resources in the library for this competency:\n${matchedResources.map(r => `- "${r.title}" (${r.type}, ${r.provider || 'unknown provider'})`).join('\n')}`
                : 'No matching learning resources found in the library.';

            const prompt = `You are a leadership development coach. Generate a focused Journey draft for this leader.

Leader profile:
- Name: ${contextPayload.user_name}
- Development Focus: ${devFocus} (score: ${lowestCompetency.score}%)
- Strongest area: ${highestCompetency.name} (${highestCompetency.score}%)
- Overall score: ${assessment.overall_pct}%
- All scores: SI=${assessment.si_pct}%, DM=${assessment.dm_pct}%, Comm=${assessment.comm_pct}%, RM=${assessment.rm_pct}%, SM=${assessment.sm_pct}%, PM=${assessment.pm_pct}%

${resourceContext}

Return a JSON object with this exact structure:
{
  "title": "short compelling journey title targeting the development focus",
  "description": "2-3 sentence description of what this journey will develop",
  "competency_focus": "${devFocus}",
  "estimated_duration_days": <number between 21 and 90>,
  "success_outcome": "one sentence describing what the leader will be able to do after completing this journey",
  "experiences": [
    {
      "title": "experience title",
      "description": "what this involves and why it builds the competency",
      "type": "<one of: leadership_coaching, stretch_project, leadership_opportunity, mentorship, conference_event, volunteer_leadership, cross_functional_project, speaking_opportunity, other>",
      "expected_impact": <number 3-10>
    }
  ],
  "matched_resource_titles": [<titles of library resources to include, from the list above, or empty array if none>]
}

Include 2-3 experiences. Only reference resources from the library list provided (use exact titles). Return only the JSON object.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        competency_focus: { type: 'string' },
                        estimated_duration_days: { type: 'number' },
                        success_outcome: { type: 'string' },
                        experiences: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    description: { type: 'string' },
                                    type: { type: 'string' },
                                    expected_impact: { type: 'number' }
                                }
                            }
                        },
                        matched_resource_titles: { type: 'array', items: { type: 'string' } }
                    }
                }
            });

            // 3. Match back resource objects from titles
            const resolvedResources = (result.matched_resource_titles || [])
                .map(title => matchedResources.find(r => r.title === title))
                .filter(Boolean);

            setJourneyDraft({
                ...result,
                learning_resources: resolvedResources,
            });
            setShowModal(true);
        } catch (error) {
            console.error('Error generating journey draft:', error);
            toast.error('Could not generate journey draft. Please try again.');
        } finally {
            setGeneratingDraft(false);
        }
    };

    const handleExplain = () => {
        openWithContext({
            context: contextPayload,
            starterMessage: `Explain my Leadership Profile results and why this development focus matters.`
        });
    };

    return (
        <>
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
                                    Build a structured development journey targeting this competency, with real experiences and curated learning resources.
                                </p>
                                <div className="flex gap-3 flex-wrap">
                                    <Button
                                        onClick={handleBuildPlan}
                                        disabled={generatingDraft}
                                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                    >
                                        {generatingDraft ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Building Draft...</>
                                        ) : (
                                            <>Build My Plan <ChevronRight className="w-4 h-4" /></>
                                        )}
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

            {showModal && journeyDraft && (
                <JourneyDraftConfirmModal
                    draft={journeyDraft}
                    user={user}
                    onConfirm={() => {}}
                    onCancel={() => {
                        setShowModal(false);
                        setJourneyDraft(null);
                    }}
                />
            )}
        </>
    );
}