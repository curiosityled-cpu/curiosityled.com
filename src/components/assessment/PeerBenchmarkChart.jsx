import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 border rounded-lg shadow-sm text-sm">
                <p className="font-bold">{label}</p>
                <p className="text-blue-600">{`Your Score: ${payload[0].payload.score}`}</p>
                <p className="text-gray-500">{`Peer Percentile: ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

export default function PeerBenchmarkChart({ title, data }) {
    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-700" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }} />
                        <Bar dataKey="percentile" fill="#3b82f6" background={{ fill: '#e5e7eb' }} radius={[4, 4, 4, 4]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}