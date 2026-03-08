import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function CompetencyScoresChart({ scores, peerScores }) {
    // Reformat keys and add peer data
    const data = [
        { subject: 'Decision Making', user: scores.dm_pct, peer: peerScores?.decision_making },
        { subject: 'Communication', user: scores.comm_pct, peer: peerScores?.communication },
        { subject: 'Resource Mgmt', user: scores.rm_pct, peer: peerScores?.resource_management },
        { subject: 'Stakeholder Mgmt', user: scores.sm_pct, peer: peerScores?.stakeholder_management },
        { subject: 'Performance Mgmt', user: scores.pm_pct, peer: peerScores?.performance_management },
        { subject: 'Situational Intel', user: scores.si_pct, peer: peerScores?.situational_intelligence },
    ];

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-xl">Competency Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#4b5563' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Your Score" dataKey="user" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                        {peerScores && <Radar name="Peer Benchmark" dataKey="peer" stroke="#9ca3af" fill="#d1d5db" fillOpacity={0.5} />}
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '0.5rem' }}/>
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}/>
                    </RadarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}