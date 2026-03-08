import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Target, MessageSquare } from 'lucide-react';

const Section = ({ icon, title, children }) => (
    <div>
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            {React.createElement(icon, { className: "w-5 h-5 text-blue-600"})}
            {title}
        </h3>
        <div className="text-sm text-gray-700 space-y-2 pl-7 border-l-2 border-blue-100 ml-2.5 py-2">
            {children}
        </div>
    </div>
);

export default function AIGeneratedPlan({ analysis }) {
    if (!analysis) {
        return (
            <Card>
                <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
                <CardContent><p>AI analysis has not been generated for this assessment yet.</p></CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-yellow-500" />
                    AI-Generated Development Plan
                </CardTitle>
                <p className="text-gray-600">Your personalized path to leadership growth.</p>
            </CardHeader>
            <CardContent className="space-y-6">
                {analysis.strengths && (
                    <Section icon={Target} title="Top Strengths">
                        {analysis.strengths.map((strength, i) => <p key={i}>{strength}</p>)}
                    </Section>
                )}
                {analysis.focus_areas && (
                     <Section icon={Target} title="Growth Edge">
                        {analysis.focus_areas.map((focus, i) => <p key={i}>{focus}</p>)}
                    </Section>
                )}
                {analysis['30_day_plan'] && (
                    <Section icon={Target} title="30-Day Momentum Plan">
                        {analysis['30_day_plan'].map((plan, i) => <p key={i}>{plan}</p>)}
                    </Section>
                )}
                {analysis.manager_prompt && (
                    <Section icon={MessageSquare} title="Manager Conversation Starter">
                        <p>{analysis.manager_prompt}</p>
                    </Section>
                )}
            </CardContent>
        </Card>
    );
}