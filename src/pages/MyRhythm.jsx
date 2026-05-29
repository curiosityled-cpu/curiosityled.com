/**
 * MyRhythm — Leadership Behavioral Pattern Visualization
 * 
 * Shows:
 * - 7d/28d energy, confidence, resilience trends
 * - Avoidance/overthinking patterns
 * - Delegation follow-through rates
 * - Recovery time after setbacks
 * - Daily check-in history log
 */
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Zap, Brain, Heart, AlertCircle, CheckCircle2, Target, Calendar } from "lucide-react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import BurnoutRiskCard from "@/components/intelligence/BurnoutRiskCard";
import ResilienceRecoveryChart from "@/components/intelligence/ResilienceRecoveryChart";
import EmotionalStateIndicators from "@/components/intelligence/EmotionalStateIndicators";
import ToneAdaptationCard from "@/components/intelligence/ToneAdaptationCard";
import TeamInsightsPanel from "@/components/intelligence/TeamInsightsPanel";

function TrendIndicator({ trend, label }) {
  const isImproving = trend === 'improving';
  const isStable = trend === 'stable';
  const isDeclining = trend === 'declining';
  
  return (
    <div className="flex items-center gap-2">
      {isImproving && <TrendingUp className="w-4 h-4 text-green-600" />}
      {isStable && <Zap className="w-4 h-4 text-gray-500" />}
      {isDeclining && <TrendingDown className="w-4 h-4 text-red-600" />}
      <span className="text-sm font-medium">
        {label} is <span className={isImproving ? 'text-green-600' : isStable ? 'text-gray-600' : 'text-red-600'}>
          {trend}
        </span>
      </span>
    </div>
  );
}

function EnergyTrendCard({ trends, pulses }) {
  // Prepare 28-day energy data
  const energyData = pulses
    .filter(p => p.energy_level)
    .slice(-28)
    .map((p, i) => ({
      day: i + 1,
      date: new Date(p.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      energy: p.energy_level === 'drained' ? 1 : p.energy_level === 'stretched' ? 2 : p.energy_level === 'steady' ? 3 : 4,
      raw: p.energy_level,
    }));

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Energy & Recovery
        </CardTitle>
        {trends && <TrendIndicator trend={trends.energy_trend} label="Energy" />}
      </CardHeader>
      <CardContent>
        {energyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={energyData}>
              <defs>
                <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} label={{ value: 'Level', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value) => ['Drained', 'Stretched', 'Steady', 'Strong'][value - 1]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Area type="monotone" dataKey="energy" stroke="#eab308" fill="url(#colorEnergy)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">Not enough data yet</div>
        )}
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-gray-700">
          <p className="font-medium mb-1">Recovery insight:</p>
          <p>Tracking patterns of how your energy recovers after high-load periods helps identify your natural rhythm and what supports resilience.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfidenceTrendCard({ trends, pulses }) {
  const confidenceData = pulses
    .filter(p => p.confidence_today)
    .slice(-28)
    .map((p, i) => ({
      day: i + 1,
      date: new Date(p.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      confidence: p.confidence_today === 'low' ? 1 : p.confidence_today === 'uncertain' ? 2 : p.confidence_today === 'steady' ? 3 : 4,
      raw: p.confidence_today,
    }));

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          Confidence & Clarity
        </CardTitle>
        {trends && <TrendIndicator trend={trends.confidence_trend} label="Confidence" />}
      </CardHeader>
      <CardContent>
        {confidenceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} label={{ value: 'Level', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value) => ['Low', 'Uncertain', 'Steady', 'High'][value - 1]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="confidence" stroke="#3b82f6" name="Confidence Level" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">Not enough data yet</div>
        )}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-medium mb-1">Pattern insight:</p>
          <p>Confidence often dips before challenging conversations or unfamiliar situations. Recognizing your pattern helps you prepare.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResilienceTrendCard({ trends, pulses }) {
  const resilienceData = pulses
    .filter(p => p.resilience_signal)
    .slice(-28)
    .map((p, i) => ({
      day: i + 1,
      date: new Date(p.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      resilience: p.resilience_signal === 'depleted' ? 1 : p.resilience_signal === 'fragile' ? 2 : p.resilience_signal === 'holding' ? 3 : 4,
      raw: p.resilience_signal,
    }));

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Resilience & Recovery
        </CardTitle>
        {trends && <TrendIndicator trend={trends.resilience_trend} label="Resilience" />}
      </CardHeader>
      <CardContent>
        {resilienceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resilienceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} label={{ value: 'Level', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value) => ['Depleted', 'Fragile', 'Holding', 'Bouncing Back'][value - 1]}
              />
              <Bar dataKey="resilience" fill="#ef4444" name="Resilience Level" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">Not enough data yet</div>
        )}
        <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-gray-700">
          <p className="font-medium mb-1">Recovery patterns:</p>
          <p>How quickly you bounce back after setbacks is a key indicator of your leadership sustainability. Watch for recovery time.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyCheckInLog({ pulses }) {
  const recentPulses = pulses.slice(0, 20);

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          Daily Check-In History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {recentPulses.map((pulse, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {pulse.prompt_type === 'baseline_energy' && '⚡ Energy Check'}
                  {pulse.prompt_type === 'weekly_reflection' && '📝 Weekly Reflection'}
                  {pulse.prompt_type === 'morning_intent' && '🎯 Morning Intent'}
                  {pulse.prompt_type === 'contextual' && '💭 Context Check'}
                  {pulse.prompt_type === 'overload_check' && '⚠️ Overload Check'}
                  {pulse.prompt_type === 'evening_actuals' && '📊 Evening Actuals'}
                  {!['baseline_energy', 'weekly_reflection', 'morning_intent', 'contextual', 'overload_check', 'evening_actuals'].includes(pulse.prompt_type) && `${pulse.prompt_type}`}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(pulse.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {pulse.energy_level && (
                <Badge variant="outline" className="flex-shrink-0">
                  {pulse.energy_level}
                </Badge>
              )}
              {pulse.confidence_today && (
                <Badge variant="outline" className="flex-shrink-0">
                  {pulse.confidence_today}
                </Badge>
              )}
            </div>
          ))}
        </div>
        {recentPulses.length === 0 && (
          <div className="py-8 text-center text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No check-ins yet. Start with a daily check-in to build your leadership rhythm.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyRhythm() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('trends');

  const { data: trends = null, isLoading: loadingTrends } = useQuery({
    queryKey: ['rhythm-trends', user?.email],
    queryFn: async () => {
      try {
        const rows = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1);
        return rows[0] || null;
      } catch { return null; }
    },
    enabled: !!user?.email,
    staleTime: 30 * 60 * 1000,
  });

  const { data: pulses = [], isLoading: loadingPulses } = useQuery({
    queryKey: ['rhythm-pulses', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 60);
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingTrends || loadingPulses;

  return (
    <MVPPageLayout
      title="Your Leadership Rhythm"
      subtitle="7-28 day patterns, trends, and insights."
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 w-full rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="trends">7-28d Trends</TabsTrigger>
            <TabsTrigger value="checkins">Daily Check-Ins</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Emotional State Indicators */}
              <EmotionalStateIndicators />

              {/* Burnout Risk Monitor */}
              <BurnoutRiskCard />
              
              {/* Core Trend Cards */}
              <EnergyTrendCard trends={trends} pulses={pulses} />
              <ConfidenceTrendCard trends={trends} pulses={pulses} />
              <ResilienceRecoveryChart />

              {/* Atreus Tone Adaptation */}
              <ToneAdaptationCard />

              {/* Team Pulse (managers only) */}
              <TeamInsightsPanel />

              {/* Atreus Narrative */}
              {trends && (
                <Card className="shadow-sm border border-gray-100 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Brain className="w-5 h-5 text-blue-600" />
                      Atreus is noticing...
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {trends.summary_7d || 'Come back after more check-ins for pattern insights.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="checkins">
            <DailyCheckInLog pulses={pulses} />
          </TabsContent>
        </Tabs>
      )}
    </MVPPageLayout>
  );
}