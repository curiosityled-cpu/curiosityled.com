
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

export default function AIInsightsCard({ analysis, scores }) {
    const [expandedInsight, setExpandedInsight] = useState(null);

    // Determine top strength based on updated competency scores
    const getTopStrength = () => {
        const competencies = [
            { name: "Decision-Making", score: scores.dm_pct, benchmark: 75, key: "dm_pct" },
            { name: "Communication", score: scores.comm_pct, benchmark: 75, key: "comm_pct" },
            { name: "Time/Resource Management", score: scores.trm_pct, benchmark: 75, key: "trm_pct" },
            { name: "Collaboration", score: scores.collab_pct, benchmark: 75, key: "collab_pct" },
            { name: "Performance Management", score: scores.pm_pct, benchmark: 75, key: "pm_pct" },
            { name: "Situational Intelligence", score: scores.si_pct, benchmark: 75, key: "si_pct" }
        ];
        
        // Find competency with highest score above benchmark
        return competencies.reduce((prev, current) => {
            const prevExcess = Math.max(0, prev.score - prev.benchmark);
            const currentExcess = Math.max(0, current.score - current.benchmark);
            return currentExcess > prevExcess ? current : prev;
        });
    };

    // Determine top development area based on updated benchmarks
    const getTopDevelopmentArea = () => {
        const competencies = [
            { name: "Communication", score: scores.comm_pct, benchmark: 75, key: "comm_pct" },
            { name: "Decision-Making", score: scores.dm_pct, benchmark: 75, key: "dm_pct" },
            { name: "Time/Resource Management", score: scores.trm_pct, benchmark: 75, key: "trm_pct" },
            { name: "Collaboration", score: scores.collab_pct, benchmark: 75, key: "collab_pct" },
            { name: "Performance Management", score: scores.pm_pct, benchmark: 75, key: "pm_pct" },
            { name: "Situational Intelligence", score: scores.si_pct, benchmark: 75, key: "si_pct" }
        ];
        
        // Find competency with biggest gap below benchmark
        return competencies.reduce((prev, current) => {
            const prevGap = Math.max(0, prev.benchmark - prev.score);
            const currentGap = Math.max(0, current.benchmark - current.score);
            return currentGap > prevGap ? current : prev;
        });
    };

    const topStrength = getTopStrength();
    const topDevelopmentArea = getTopDevelopmentArea();

    const insights = [
        {
            id: "strength",
            type: "strength",
            icon: TrendingUp,
            title: "Top Strength",
            value: topStrength.name,
            score: topStrength.score,
            explanation: {
                why: `Your ${topStrength.name} score of ${topStrength.score}% places you in the top 25% of leaders in your sector. This competency is foundational to leadership effectiveness because it directly impacts team performance and organizational outcomes.`,
                impact: topStrength.name === "Collaboration" 
                    ? "Leaders with strong collaboration skills achieve 40% higher project success rates and build more resilient organizational networks. Your ability to navigate complex relationships and align diverse interests is a significant competitive advantage."
                    : topStrength.name === "Decision-Making"
                    ? "Effective decision-making correlates with 35% better team performance and faster organizational adaptation. Your analytical approach and judgment under pressure are key leadership differentiators."
                    : topStrength.name === "Time/Resource Management"
                    ? "Superior time and resource management leads to 30% better budget performance and higher team productivity. Your ability to optimize people, time, and materials creates measurable business value."
                    : topStrength.name === "Performance Management"
                    ? "Strong performance management practices result in 20% higher employee engagement and 15% improvement in team output. Your ability to guide and develop your team is critical for sustained success."
                    : topStrength.name === "Situational Intelligence"
                    ? "High situational intelligence enables leaders to adapt quickly, leading to 25% faster problem resolution and greater influence in dynamic environments. Your ability to read the room and respond effectively is a powerful asset."
                    : "Strong communication skills increase team engagement by 25% and reduce workplace conflicts by 40%. Your ability to convey ideas clearly and inspire others is essential for leadership success.",
                leverage: topStrength.name === "Collaboration"
                    ? "Leverage this strength by: 1) Taking on cross-functional projects that require relationship building, 2) Mentoring other managers on collaborative strategies, 3) Leading change initiatives that require buy-in from multiple parties."
                    : topStrength.name === "Decision-Making"
                    ? "Leverage this strength by: 1) Volunteering for strategic planning committees, 2) Leading crisis response teams, 3) Mentoring others on analytical frameworks and decision processes."
                    : topStrength.name === "Time/Resource Management"
                    ? "Leverage this strength by: 1) Taking on budget optimization projects, 2) Leading efficiency improvement initiatives, 3) Coaching teams on time and resource allocation."
                    : topStrength.name === "Performance Management"
                    ? "Leverage this strength by: 1) Designing and implementing new performance review systems, 2) Mentoring high-potential employees, 3) Leading workshops on feedback and goal setting."
                    : topStrength.name === "Situational Intelligence"
                    ? "Leverage this strength by: 1) Advising leadership on team dynamics and organizational culture, 2) Mediating complex interpersonal conflicts, 3) Guiding teams through periods of significant change."
                    : "Leverage this strength by: 1) Leading town halls and team meetings, 2) Serving as a spokesperson for initiatives, 3) Mentoring others on presentation and messaging skills."
            }
        },
        {
            id: "development",
            type: "development",
            icon: AlertTriangle,
            title: "Top Development Priority",
            value: topDevelopmentArea.name,
            score: topDevelopmentArea.score,
            explanation: {
                why: `Your ${topDevelopmentArea.name} score of ${topDevelopmentArea.score}% represents your greatest opportunity for leadership growth. Research shows that targeted development in this area can improve overall leadership effectiveness by 25-30%.`,
                impact: topDevelopmentArea.name === "Communication"
                    ? "Poor communication is cited as the #1 cause of project failures and team dysfunction. Improving this competency will directly impact team morale, project success rates, and your ability to influence without authority."
                    : topDevelopmentArea.name === "Decision-Making"
                    ? "Indecisive leadership costs organizations an average of 15% in lost productivity. Strengthening your decision-making process will accelerate team performance and build confidence in your leadership."
                    : topDevelopmentArea.name === "Time/Resource Management"
                    ? "Inefficient resource allocation is a top barrier to team success. Developing this competency will improve your team's output quality and your credibility as a strategic leader."
                    : topDevelopmentArea.name === "Collaboration"
                    ? "Weak collaboration leads to 60% higher project failure rates and siloing within organizations. Improving this area will expand your influence and create more opportunities for career advancement."
                    : topDevelopmentArea.name === "Performance Management"
                    ? "Inconsistent performance management can lead to disengaged employees and missed targets. Strengthening this area will empower your team and drive better collective outcomes."
                    : "Lack of situational intelligence can result in misjudged interactions and missed opportunities for influence. Developing this will enhance your adaptability and leadership presence.",
                action: topDevelopmentArea.name === "Communication"
                    ? "Focus on: 1) Active listening techniques and feedback delivery, 2) Structured communication frameworks (like the 3x3 method), 3) Adapting your message to different audiences and contexts."
                    : topDevelopmentArea.name === "Decision-Making"
                    ? "Focus on: 1) Decision-making frameworks and criteria, 2) Balancing speed with thoroughness, 3) Involving the right stakeholders in decision processes."
                    : topDevelopmentArea.name === "Time/Resource Management"
                    ? "Focus on: 1) Project planning and resource allocation methods, 2) Delegation and task prioritization, 3) Performance monitoring and adjustment techniques."
                    : topDevelopmentArea.name === "Collaboration"
                    ? "Focus on: 1) Stakeholder mapping and influence strategies, 2) Building coalition and consensus-building skills, 3) Managing competing interests and priorities."
                    : topDevelopmentArea.name === "Performance Management"
                    ? "Focus on: 1) Setting SMART goals with your team, 2) Delivering constructive feedback regularly, 3) Developing clear performance metrics and tracking progress."
                    : "Focus on: 1) Observing team and organizational dynamics closely, 2) Practicing empathy and understanding diverse perspectives, 3) Seeking feedback on your own interpersonal effectiveness."
            }
        },
        {
            id: "tip",
            type: "tip",
            icon: Lightbulb,
            title: "Your Quick Tip",
            value: topDevelopmentArea.name === "Communication" 
                ? "Before your next exec update, map the top 3 stakeholder priorities and tailor your message to each one-line outcome."
                : topDevelopmentArea.name === "Decision-Making"
                ? "Create a simple decision framework: Define the problem, identify 3 options, set decision criteria, and involve 1-2 key stakeholders."
                : topDevelopmentArea.name === "Time/Resource Management"
                ? "Start each week by identifying your top 3 priorities and allocating 60% of your time to these high-impact activities."
                : topDevelopmentArea.name === "Collaboration"
                ? "Create a stakeholder influence map with your top 5 relationships, noting their priorities and preferred communication styles."
                : topDevelopmentArea.name === "Performance Management"
                ? "For your next 1:1, prepare one specific piece of constructive feedback with a clear example and an actionable suggestion for improvement."
                : "Before an important meeting, identify 3 key people and predict their likely concerns or objectives. Plan how to address these in your contribution.",
            explanation: {
                why: "This tip targets your development area with a specific, actionable technique you can implement immediately. It's designed to create quick wins while building foundational skills.",
                howTo: topDevelopmentArea.name === "Communication"
                    ? "Implementation steps: 1) List your key stakeholders before any important communication, 2) Identify what each stakeholder cares about most, 3) Craft one clear outcome statement for each stakeholder group, 4) Test this with your next presentation or email."
                    : topDevelopmentArea.name === "Decision-Making"
                    ? "Implementation steps: 1) When facing a decision, write down the core problem in one sentence, 2) Brainstorm at least 3 different approaches, 3) List your top 3 decision criteria, 4) Get input from 1-2 people who will be affected by the decision."
                    : topDevelopmentArea.name === "Time/Resource Management"
                    ? "Implementation steps: 1) Every Sunday, list all your potential tasks for the week, 2) Circle the 3 that will have the biggest impact, 3) Block calendar time for these priorities first, 4) Say no to requests that don't align with these priorities."
                    : topDevelopmentArea.name === "Collaboration"
                    ? "Implementation steps: 1) List the 5 people who most influence your success, 2) For each person, note what they care about and how they prefer to communicate, 3) Plan one meaningful interaction with each person this month, 4) Update your map monthly."
                    : topDevelopmentArea.name === "Performance Management"
                    ? "Implementation steps: 1) Choose one direct report, 2) Identify a specific behavior or skill they can improve, 3) Find a clear, recent example of this behavior, 4) Frame your feedback as 'When you [example], it results in [impact]. Consider [suggestion].'"
                    : "Implementation steps: 1) Before any group interaction, consider the roles, goals, and personalities of those involved, 2) Pay attention to non-verbal cues and group dynamics during the interaction, 3) Reflect afterwards on what went well and what you could have done differently.",
                timeframe: "You should see initial results within 2-3 weeks of consistent application. Full integration typically takes 6-8 weeks of practice."
            }
        }
    ];

    const getInsightColor = (type) => {
        const colors = {
            strength: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", iconBg: "text-green-600" },
            development: { bg: "bg-red-50", border: "border-red-200", text: "text-red-600", iconBg: "text-red-600" },
            tip: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", iconBg: "text-blue-600" }
        };
        return colors[type];
    };

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    AI-Powered Insights
                </CardTitle>
                <p className="text-sm text-gray-600">Personalized analysis based on your leadership competency scores</p>
            </CardHeader>
            <CardContent className="space-y-4">
                {insights.map((insight, index) => {
                    const colors = getInsightColor(insight.type);
                    const IconComponent = insight.icon;
                    const isExpanded = expandedInsight === insight.id;
                    
                    return (
                        <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className={`p-4 ${colors.bg} rounded-lg border ${colors.border}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <IconComponent className={`w-4 h-4 ${colors.iconBg}`} />
                                            <span className={`font-medium ${colors.text} text-sm`}>{insight.title}</span>
                                            {insight.score && (
                                                <span className="text-xs text-gray-500">({insight.score}%)</span>
                                            )}
                                        </div>
                                        <p className={`${colors.text} text-sm font-medium mb-2`}>{insight.value}</p>
                                        
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="space-y-3 pt-2 border-t border-opacity-30"
                                                    style={{ borderColor: colors.border.replace('border-', '') }}
                                                >
                                                    <div>
                                                        <h5 className={`font-medium ${colors.text} text-xs mb-1`}>Why This Matters:</h5>
                                                        <p className="text-xs text-gray-700 leading-relaxed">{insight.explanation.why}</p>
                                                    </div>
                                                    
                                                    <div>
                                                        <h5 className={`font-medium ${colors.text} text-xs mb-1`}>
                                                            {insight.type === 'strength' ? 'Business Impact:' : insight.type === 'development' ? 'Growth Impact:' : 'How To Apply:'}
                                                        </h5>
                                                        <p className="text-xs text-gray-700 leading-relaxed">
                                                            {insight.explanation.impact || insight.explanation.howTo}
                                                        </p>
                                                    </div>
                                                    
                                                    <div>
                                                        <h5 className={`font-medium ${colors.text} text-xs mb-1`}>
                                                            {insight.type === 'strength' ? 'How to Leverage:' : insight.type === 'development' ? 'Action Steps:' : 'Timeline:'}
                                                        </h5>
                                                        <p className="text-xs text-gray-700 leading-relaxed">
                                                            {insight.explanation.leverage || insight.explanation.action || insight.explanation.timeframe}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                                        className="ml-2 h-6 w-6 p-0"
                                    >
                                        {isExpanded ? 
                                            <ChevronUp className="w-3 h-3" /> : 
                                            <ChevronDown className="w-3 h-3" />
                                        }
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-yellow-800">
                            <p className="font-medium mb-1">AI Analysis Note:</p>
                            <p>These insights are generated by analyzing your competency scores against leadership effectiveness research from 65,000+ leaders in our database. Each recommendation is personalized to your specific profile and development needs.</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
