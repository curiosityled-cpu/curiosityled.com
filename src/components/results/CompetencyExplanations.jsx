import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Target, Lightbulb, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompetencyExplanations({ scores }) {
    const [expandedCompetency, setExpandedCompetency] = useState(null);

    // Guard against missing scores
    if (!scores) return null;

    const competencies = [
        {
            name: "Decision-Making",
            score: scores.dm_pct,
            key: "dm_pct",
            description: "Your ability to gather information, analyze options, and make sound choices under pressure and ambiguity.",
            detailedInsights: {
                whatItMeans: scores.dm_pct >= 75 
                    ? "You demonstrate strong analytical thinking and sound judgment. You're comfortable making decisions with incomplete information and can balance speed with thoroughness effectively."
                    : "You may benefit from developing more structured decision-making frameworks. Building confidence in judgment and improving information gathering processes will enhance your effectiveness.",
                behavioralIndicators: scores.dm_pct >= 75 
                    ? ["Quickly identifies key decision factors", "Comfortable with ambiguous situations", "Makes timely decisions under pressure", "Seeks diverse perspectives before deciding", "Takes calculated risks when appropriate"]
                    : ["Sometimes delays decisions while gathering more information", "May struggle with ambiguous or complex situations", "Tends to second-guess previous decisions", "Could benefit from involving stakeholders more effectively", "May avoid difficult or controversial decisions"],
                businessImpact: scores.dm_pct >= 75
                    ? "Strong decision-making directly correlates with 25% faster project completion rates, improved team confidence, and better resource allocation. Leaders with your score typically see higher team performance and organizational agility."
                    : "Improving decision-making can accelerate project timelines by up to 30%, reduce team anxiety around uncertainty, and improve resource efficiency. Focus areas here will significantly boost your leadership credibility.",
                developmentActions: scores.dm_pct >= 75
                    ? ["Share your decision-making process with junior team members", "Take on more complex strategic decisions", "Develop scenario planning skills for long-term decisions"]
                    : ["Practice using structured decision frameworks (OODA loop, decision trees)", "Set decision deadlines to avoid analysis paralysis", "Shadow senior leaders during major decision processes", "Build a trusted advisor network for complex decisions"]
            },
            indicators: {
                high: "Makes data-driven decisions quickly, considers multiple perspectives, adapts decisions based on new information",
                low: "May struggle with analysis paralysis, overlooks key information, or rushes to judgment without considering alternatives"
            }
        },
        {
            name: "Communication",
            score: scores.comm_pct,
            key: "comm_pct", 
            description: "How effectively you convey information, listen actively, and adapt your message to different audiences and contexts.",
            detailedInsights: {
                whatItMeans: scores.comm_pct >= 75 
                    ? "You excel at crafting clear, compelling messages and adapting your communication style to different stakeholders. Your active listening skills help build trust and understanding."
                    : "Developing stronger communication skills will significantly enhance your leadership impact. Focus on message clarity, audience awareness, and active listening techniques.",
                behavioralIndicators: scores.comm_pct >= 75 
                    ? ["Tailors message to audience needs and preferences", "Actively listens and asks clarifying questions", "Uses storytelling to make points memorable", "Comfortable with public speaking and presentations", "Provides clear, constructive feedback"]
                    : ["Messages sometimes lack clarity or focus", "May miss non-verbal communication cues", "Struggles to adapt style for different audiences", "Could improve at giving difficult feedback", "Might dominate conversations rather than listening"],
                businessImpact: scores.comm_pct >= 75
                    ? "Excellent communication skills reduce misunderstandings by 40%, improve team engagement scores, and accelerate project alignment. Your communication effectiveness directly contributes to better collaboration and faster execution."
                    : "Improving communication can reduce project rework by 35%, increase team satisfaction scores, and enhance your influence across the organization. This is often the highest-ROI development area for leaders.",
                developmentActions: scores.comm_pct >= 75
                    ? ["Mentor others on presentation and communication skills", "Lead high-stakes communications (town halls, investor presentations)", "Develop your personal brand through thought leadership"]
                    : ["Practice the 3x3 communication framework (3 key points, 3 supporting details, 3 action items)", "Record yourself presenting and review for clarity", "Join Toastmasters or similar speaking groups", "Implement regular 'listening tours' with stakeholders"]
            },
            indicators: {
                high: "Clear and concise messaging, active listening, adapts communication style to audience and situation",
                low: "May struggle with clarity, miss non-verbal cues, or use inappropriate communication channels for the message"
            }
        },
        {
            name: "Time/Resource Management",
            score: scores.trm_pct,
            key: "trm_pct",
            description: "Your skill in optimizing time, budget, people, and materials to achieve objectives efficiently and effectively.",
            detailedInsights: {
                whatItMeans: scores.trm_pct >= 75 
                    ? "You demonstrate exceptional ability to prioritize, delegate effectively, and optimize resource allocation. You understand how to maximize team productivity while maintaining quality standards."
                    : "Developing stronger resource management skills will help you achieve more with less stress and better support your team's success. Focus on prioritization frameworks and delegation skills.",
                behavioralIndicators: scores.trm_pct >= 75 
                    ? ["Effectively prioritizes high-impact activities", "Delegates appropriately and follows up", "Optimizes team schedules and workload distribution", "Anticipates resource needs and plans accordingly", "Maintains high quality while improving efficiency"]
                    : ["Sometimes struggles with prioritization", "May take on too much personally rather than delegating", "Could improve at resource planning and allocation", "Might miss opportunities to optimize processes", "Sometimes overcommits the team or timeline"],
                businessImpact: scores.trm_pct >= 75
                    ? "Superior resource management results in 20% better budget performance, higher team productivity, and improved work-life balance for your team. Your optimization skills create measurable value for the organization."
                    : "Improving resource management can increase team productivity by 25%, reduce overtime costs, and improve job satisfaction. These skills are critical for scaling your leadership impact.",
                developmentActions: scores.trm_pct >= 75
                    ? ["Lead resource optimization projects across departments", "Mentor other managers on delegation and prioritization", "Develop advanced project management capabilities"]
                    : ["Learn and apply the Eisenhower Matrix for prioritization", "Practice delegating with clear expectations and follow-up", "Use time-blocking techniques for better focus", "Implement regular resource planning reviews with your team"]
            },
            indicators: {
                high: "Efficiently allocates resources, anticipates needs, maximizes team productivity while maintaining quality",
                low: "May over/under-allocate resources, struggle with prioritization, or miss optimization opportunities"
            }
        },
        {
            name: "Collaboration", 
            score: scores.collab_pct,
            key: "collab_pct",
            description: "Your ability to work effectively with others, facilitate teamwork, and create synergies across diverse groups.",
            detailedInsights: {
                whatItMeans: scores.collab_pct >= 75 
                    ? "You excel at building bridges between different groups, facilitating productive teamwork, and leveraging diverse perspectives. Your collaborative approach enhances team performance and innovation."
                    : "Strengthening collaboration skills will expand your influence and improve team outcomes. Focus on building inclusive environments and managing diverse stakeholder interests.",
                behavioralIndicators: scores.collab_pct >= 75 
                    ? ["Creates inclusive team environments", "Facilitates productive cross-functional partnerships", "Manages conflict constructively", "Leverages diverse perspectives for better solutions", "Builds consensus while maintaining momentum"]
                    : ["Could improve at including diverse perspectives", "May struggle with conflict resolution", "Might work in silos rather than seeking collaboration", "Could better facilitate team discussions", "Sometimes misses opportunities for cross-functional partnerships"],
                businessImpact: scores.collab_pct >= 75
                    ? "Strong collaboration skills improve project success rates by 30%, increase innovation metrics, and enhance employee engagement. Your collaborative leadership creates multiplicative effects across teams."
                    : "Better collaboration can reduce project delays by 25%, improve employee retention, and accelerate innovation. This competency is increasingly critical in matrix organizations.",
                developmentActions: scores.collab_pct >= 75
                    ? ["Lead major cross-functional initiatives", "Facilitate organizational change efforts", "Coach other leaders on collaboration techniques"]
                    : ["Create a stakeholder influence map and engagement strategy", "Practice active conflict resolution techniques", "Set up regular cross-functional collaboration meetings", "Develop skills in consensus building and negotiation"]
            },
            indicators: {
                high: "Builds inclusive teams, facilitates productive collaboration, leverages diverse perspectives for better outcomes",
                low: "May struggle with team dynamics, miss collaboration opportunities, or fail to leverage collective intelligence"
            }
        },
        {
            name: "Performance Management",
            score: scores.pm_pct,
            key: "pm_pct",
            description: "How well you set expectations, monitor progress, provide feedback, and drive results through others.",
            detailedInsights: {
                whatItMeans: scores.pm_pct >= 75 
                    ? "You excel at setting clear expectations, providing regular feedback, and developing your team members. Your performance management approach drives both individual growth and collective results."
                    : "Developing stronger performance management skills will help you get better results through your team while supporting their professional growth. Focus on goal setting and feedback delivery.",
                behavioralIndicators: scores.pm_pct >= 75 
                    ? ["Sets clear, measurable goals aligned with strategy", "Provides regular, specific feedback", "Coaches team members for development", "Addresses performance issues promptly and fairly", "Celebrates successes and recognizes contributions"]
                    : ["Could improve at setting specific, measurable goals", "May avoid difficult performance conversations", "Sometimes provides vague or infrequent feedback", "Could be more consistent in recognition and coaching", "Might struggle with performance improvement planning"],
                businessImpact: scores.pm_pct >= 75
                    ? "Effective performance management increases team productivity by 20%, improves employee engagement scores, and reduces turnover. Your approach to developing people creates sustainable competitive advantage."
                    : "Better performance management can improve team output by 25%, increase retention rates, and accelerate talent development. These skills are essential for senior leadership roles.",
                developmentActions: scores.pm_pct >= 75
                    ? ["Design and implement performance management systems", "Become a high-potential talent sponsor", "Lead talent review and succession planning processes"]
                    : ["Implement weekly one-on-ones with structured agendas", "Practice giving specific, actionable feedback", "Create individual development plans for each team member", "Learn coaching techniques and performance improvement frameworks"]
            },
            indicators: {
                high: "Sets clear goals, provides regular constructive feedback, develops team members, drives accountability",
                low: "May avoid difficult conversations, provide inconsistent feedback, or struggle with goal setting and tracking"
            }
        }
    ];

    const getScoreStatus = (score) => {
        if (score >= 82) return { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Exceptional (90th+)" };
        if (score >= 73) return { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Target (50th-75th)" };
        if (score >= 64) return { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", label: "Emerging (25th-49th)" };
        return { icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Development Need (<25th)" };
    };

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-lg">Understanding Your Competencies</CardTitle>
                <p className="text-sm text-gray-600">Each competency reflects specific leadership behaviors and their impact on your effectiveness</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {competencies.map((comp, index) => {
                        const status = getScoreStatus(comp.score);
                        const StatusIcon = status.icon;
                        const isExpanded = expandedCompetency === comp.key;
                        
                        return (
                            <div key={index} className={`p-4 rounded-lg border ${status.bg} ${status.border}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                        <h4 className="font-semibold text-gray-900">{comp.name}</h4>
                                        <Badge className={`${status.color} bg-transparent border-0 p-0 text-xs`}>
                                            {comp.score}% - {status.label}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setExpandedCompetency(isExpanded ? null : comp.key)}
                                        className="h-6 w-6 p-0"
                                    >
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </Button>
                                </div>
                                
                                <p className="text-sm text-gray-700 mb-3">{comp.description}</p>
                                
                                <div className="text-xs text-gray-600">
                                    <p className="mb-1">
                                        <strong>
                                            {comp.score >= 73 ? "Your strengths:" : "Development focus:"}
                                        </strong>
                                    </p>
                                    <p className="italic">
                                        {comp.score >= 73 ? comp.indicators.high : comp.indicators.low}
                                    </p>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-4 pt-4 border-t border-gray-200 space-y-4"
                                        >
                                            {/* What Your Score Means */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Target className="w-4 h-4 text-blue-600" />
                                                    <h5 className="font-medium text-gray-900 text-sm">What Your Score Means</h5>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed">{comp.detailedInsights.whatItMeans}</p>
                                            </div>

                                            {/* Behavioral Indicators */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                    <h5 className="font-medium text-gray-900 text-sm">You Likely...</h5>
                                                </div>
                                                <ul className="text-sm text-gray-700 space-y-1">
                                                    {comp.detailedInsights.behavioralIndicators.map((indicator, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                                            <span>{indicator}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Business Impact */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <BarChart3 className="w-4 h-4 text-purple-600" />
                                                    <h5 className="font-medium text-gray-900 text-sm">Business Impact</h5>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed">{comp.detailedInsights.businessImpact}</p>
                                            </div>

                                            {/* Development Actions */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                                                    <h5 className="font-medium text-gray-900 text-sm">
                                                        {comp.score >= 73 ? "How to Leverage This Strength" : "Development Actions"}
                                                    </h5>
                                                </div>
                                                <ul className="text-sm text-gray-700 space-y-1">
                                                    {comp.detailedInsights.developmentActions.map((action, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                                                            <span>{action}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}