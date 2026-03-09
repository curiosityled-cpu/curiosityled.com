import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Building2 } from 'lucide-react';

export default function CompetencyRadarChart({ scores, userInfo = { role_level: "Mid-Level Manager", sector: "Healthcare" } }) {
    // Target benchmarks for the role level (Mid-Level Manager targets)
    const targetBenchmarks = {
        dm_pct: 75,      // Decision-Making: Proficient level for mid-level
        comm_pct: 75,    // Communication: Proficient level for mid-level  
        trm_pct: 75,     // Time/Resource Management: Proficient level for mid-level
        collab_pct: 75,  // Collaboration: Proficient level for mid-level
        pm_pct: 75,      // Performance Management: Proficient level for mid-level
        si_pct: 75       // Situational Intelligence: Proficient level for mid-level
    };

    // Industry benchmarks by sector (these are averages from similar organizations)
    const industryBenchmarks = {
        'Healthcare': { dm_pct: 68, comm_pct: 72, trm_pct: 65, collab_pct: 70, pm_pct: 66, si_pct: 69 },
        'Technology': { dm_pct: 72, comm_pct: 70, trm_pct: 68, collab_pct: 73, pm_pct: 71, si_pct: 72 },
        'Finance': { dm_pct: 74, comm_pct: 68, trm_pct: 73, collab_pct: 67, pm_pct: 72, si_pct: 71 },
        'Manufacturing': { dm_pct: 70, comm_pct: 66, trm_pct: 71, collab_pct: 68, pm_pct: 69, si_pct: 68 },
        'Retail': { dm_pct: 67, comm_pct: 71, trm_pct: 69, collab_pct: 72, pm_pct: 68, si_pct: 69 },
        'Education': { dm_pct: 69, comm_pct: 74, trm_pct: 66, collab_pct: 73, pm_pct: 67, si_pct: 70 },
        'default': { dm_pct: 70, comm_pct: 70, trm_pct: 68, collab_pct: 70, pm_pct: 69, si_pct: 70 }
    };

    const sectorBenchmarks = industryBenchmarks[userInfo.sector] || industryBenchmarks['default'];

    // Calculate overall leadership proficiency score
    const leadershipProficiency = Math.round(
        (scores.dm_pct + scores.comm_pct + scores.trm_pct + scores.collab_pct + scores.pm_pct) / 5
    );

    // Calculate percentile vs industry
    const industryAverage = Math.round(
        (sectorBenchmarks.dm_pct + sectorBenchmarks.comm_pct + sectorBenchmarks.trm_pct + 
         sectorBenchmarks.collab_pct + sectorBenchmarks.pm_pct) / 5
    );
    
    const percentileVsIndustry = leadershipProficiency > industryAverage ? 
        Math.min(Math.round(50 + ((leadershipProficiency - industryAverage) / (100 - industryAverage)) * 50), 95) :
        Math.max(Math.round(50 * (leadershipProficiency / industryAverage)), 10);

    const data = [
        { 
            competency: 'Decision-Making', 
            'Your Score': scores.dm_pct,
            'Target Benchmark': targetBenchmarks.dm_pct,
            'Industry Average': sectorBenchmarks.dm_pct,
            fullMark: 100 
        },
        { 
            competency: 'Communication', 
            'Your Score': scores.comm_pct,
            'Target Benchmark': targetBenchmarks.comm_pct,
            'Industry Average': sectorBenchmarks.comm_pct,
            fullMark: 100 
        },
        { 
            competency: 'Time/Resource Mgmt', 
            'Your Score': scores.trm_pct,
            'Target Benchmark': targetBenchmarks.trm_pct,
            'Industry Average': sectorBenchmarks.trm_pct,
            fullMark: 100 
        },
        { 
            competency: 'Collaboration', 
            'Your Score': scores.collab_pct,
            'Target Benchmark': targetBenchmarks.collab_pct,
            'Industry Average': sectorBenchmarks.collab_pct,
            fullMark: 100 
        },
        { 
            competency: 'Performance Mgmt', 
            'Your Score': scores.pm_pct,
            'Target Benchmark': targetBenchmarks.pm_pct,
            'Industry Average': sectorBenchmarks.pm_pct,
            fullMark: 100 
        },
        { 
            competency: 'Situational Intel', 
            'Your Score': scores.si_pct,
            'Target Benchmark': targetBenchmarks.si_pct,
            'Industry Average': sectorBenchmarks.si_pct,
            fullMark: 100 
        },
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.dataKey}: {entry.value}%
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Leadership Competency Profile</CardTitle>
                        <Badge variant="outline" className="w-fit text-xs mt-1">
                            vs. {userInfo.role_level} in {userInfo.sector}
                        </Badge>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{leadershipProficiency}%</div>
                        <div className="text-xs text-blue-500">Leadership Proficiency</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis 
                            dataKey="competency" 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            className="text-xs"
                        />
                        <PolarRadiusAxis 
                            angle={30} 
                            domain={[0, 100]} 
                            tick={false} 
                            axisLine={false}
                        />
                        <Radar 
                            name="Your Score" 
                            dataKey="Your Score" 
                            stroke="#3b82f6" 
                            fill="#3b82f6" 
                            fillOpacity={0.3}
                            strokeWidth={2}
                        />
                        <Radar 
                            name="Industry Average" 
                            dataKey="Industry Average" 
                            stroke="#f59e0b" 
                            fill="#f59e0b" 
                            fillOpacity={0.1}
                            strokeWidth={2}
                            strokeDasharray="3,3"
                        />
                        <Radar 
                            name="Target Benchmark" 
                            dataKey="Target Benchmark" 
                            stroke="#9ca3af" 
                            fill="transparent" 
                            strokeWidth={2}
                            strokeDasharray="5,5"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>

                {/* Benchmark cards below chart */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-800 text-xs">Your Performance</span>
                        </div>
                        <p className="text-green-700 text-xs">{leadershipProficiency}% overall</p>
                    </div>
                    
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-amber-600" />
                            <span className="font-medium text-amber-800 text-xs">Industry Average</span>
                        </div>
                        <p className="text-amber-700 text-xs">{industryAverage}% in {userInfo.sector}</p>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-800 text-xs">Target Level</span>
                        </div>
                        <p className="text-blue-700 text-xs">75%+ for {userInfo.role_level}</p>
                    </div>
                </div>

                {/* Performance vs Industry */}
                <div className={`mt-4 p-3 rounded-lg border ${
                    percentileVsIndustry >= 70 ? 'bg-green-50 border-green-200' :
                    percentileVsIndustry >= 50 ? 'bg-blue-50 border-blue-200' :
                    'bg-yellow-50 border-yellow-200'
                }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                Industry Comparison
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                                {percentileVsIndustry >= 70 ? 'Above average' : 
                                 percentileVsIndustry >= 50 ? 'At industry level' : 
                                 'Below industry average'} vs. {userInfo.sector} leaders
                            </p>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-bold ${
                                percentileVsIndustry >= 70 ? 'text-green-600' :
                                percentileVsIndustry >= 50 ? 'text-blue-600' :
                                'text-yellow-600'
                            }`}>
                                {percentileVsIndustry}th
                            </div>
                            <div className="text-xs text-gray-600">Percentile</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}