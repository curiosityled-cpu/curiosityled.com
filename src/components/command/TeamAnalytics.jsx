import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Users, AlertTriangle, TrendingUp, Target, Brain, MessageCircle } from 'lucide-react';
import { motion } from "framer-motion";

export default function TeamAnalytics({ data }) {
  const { cohort, managers, cohort_averages, hotspots } = data;

  // Prepare chart data
  const competencyData = [
    { name: 'Decision Making', value: cohort_averages.decision_making },
    { name: 'Communication', value: cohort_averages.communication },
    { name: 'Stakeholder Mgmt', value: cohort_averages.stakeholder_mgmt },
  ];

  const radarData = managers.map(manager => ({
    name: manager.name,
    decision_making: manager.decision_making,
    communication: manager.communication,
    stakeholder_mgmt: manager.stakeholder_mgmt,
  }));

  const goalStats = {
    totalGoals: managers.reduce((sum, m) => sum + m.goals_on_track + m.goals_at_risk, 0),
    onTrack: managers.reduce((sum, m) => sum + m.goals_on_track, 0),
    atRisk: managers.reduce((sum, m) => sum + m.goals_at_risk, 0),
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-md border-0">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-gray-900">{managers.length}</div>
              <div className="text-sm text-gray-500">Managers</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-md border-0">
            <CardContent className="p-4 text-center">
              <Brain className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-gray-900">{cohort_averages.si_score}</div>
              <div className="text-sm text-gray-500">Avg SI Score</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-md border-0">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-gray-900">{cohort_averages.goal_completion_rate}%</div>
              <div className="text-sm text-gray-500">Goal Rate</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-md border-0">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-gray-900">{hotspots.length}</div>
              <div className="text-sm text-gray-500">Hotspots</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Competency Scores Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl">Cohort Competency Averages</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={competencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Individual Manager Performance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl">Individual Manager Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {managers.map((manager, index) => (
                <div key={manager.manager_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{manager.name}</h4>
                      <p className="text-sm text-gray-500">SI Score: {manager.si_score}/100</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Goals</div>
                      <div className="flex gap-2">
                        <Badge className="bg-green-100 text-green-800">
                          {manager.goals_on_track} On Track
                        </Badge>
                        {manager.goals_at_risk > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {manager.goals_at_risk} At Risk
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Decision Making</span>
                        <span>{manager.decision_making}%</span>
                      </div>
                      <Progress value={manager.decision_making} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Communication</span>
                        <span>{manager.communication}%</span>
                      </div>
                      <Progress value={manager.communication} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Stakeholder Mgmt</span>
                        <span>{manager.stakeholder_mgmt}%</span>
                      </div>
                      <Progress value={manager.stakeholder_mgmt} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hotspots & Recommendations */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Coaching Hotspots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hotspots.length > 0 ? (
              <div className="space-y-3">
                {hotspots.map((hotspot, index) => {
                  const manager = managers.find(m => m.manager_id === hotspot.manager_id);
                  return (
                    <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-red-800">{manager?.name}</h4>
                          <p className="text-sm text-red-600">{hotspot.issue}</p>
                        </div>
                        <MessageCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <p className="text-sm text-red-700 bg-white p-2 rounded border">
                        <strong>AI Recommendation:</strong> {hotspot.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No coaching hotspots detected. Great work!</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}