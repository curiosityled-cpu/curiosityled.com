/**
 * MyRhythm — Leadership rhythm intelligence dashboard
 * Visualizes 7d/28d trends, behavioral patterns, recovery cycles, and check-in settings
 */

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { TrendingUp, TrendingDown, Zap, Heart, Brain, Settings, Calendar } from "lucide-react";

// ─── Data Transformation ───────────────────────────────────────────────────────

function buildTrendChart(pulses) {
  // Group by date, aggregate daily values (most recent per day)
  const byDate = {};
  pulses.forEach(p => {
    const dateStr = p.created_date?.toString().split('T')[0];
    if (!dateStr) return;
    if (!byDate[dateStr] || new Date(p.created_date) > new Date(byDate[dateStr].created_date)) {
      byDate[dateStr] = p;
    }
  });

  // Map energy level to numeric: drained=1, stretched=2, steady=3, strong=4
  const energyMap = { drained: 1, stretched: 2, steady: 3, strong: 4 };
  const confidenceMap = { low: 1, uncertain: 2, steady: 3, high: 4 };
  const resilienceMap = { depleted: 1, fragile: 2, holding: 3, bouncing_back: 4 };

  return Object.entries(byDate)
    .sort()
    .slice(-28)
    .map(([date, pulse]) => ({
      date: date.slice(5), // MM-DD
      energy: energyMap[pulse.energy_level] || null,
      confidence: confidenceMap[pulse.confidence_today] || null,
      resilience: resilienceMap[pulse.resilience_signal] || null,
      overload: pulse.perceived_load === 'unsustainable' ? 4 : pulse.perceived_load === 'heavy' ? 3 : pulse.perceived_load === 'manageable' ? 2 : 1,
    }));
}

function detectPatterns(pulses, trends) {
  const patterns = [];

  // Avoidance pattern
  const avoidancePulses = pulses.filter(p => p.avoidance_flag === 'yes');
  if (avoidancePulses.length >= 3) {
    patterns.push({
      type: 'avoidance',
      label: 'Avoidance pattern detected',
      description: `You've noted avoidance ${avoidancePulses.length} times in the last 2 weeks.`,
      severity: 'warn',
    });
  }

  // Delegation gap
  if (trends?.delegation_gap_count_7d > 0) {
    patterns.push({
      type: 'delegation_gap',
      label: 'Delegation gap',
      description: `You intended to delegate ${trends.delegation_gap_count_7d} time(s) this week but reverted to doing it yourself.`,
      severity: 'warn',
    });
  }

  // Confidence decline
  if (trends?.confidence_trend === 'declining') {
    patterns.push({
      type: 'confidence_decline',
      label: 'Confidence on decline',
      description: 'Your confidence has been trending down over the last 2 weeks. Worth exploring what\'s driving it.',
      severity: 'watch',
    });
  }

  // Resilience recovery
  if (trends?.resilience_trend === 'improving') {
    patterns.push({
      type: 'resilience_improving',
      label: 'Resilience recovering',
      description: 'You\'re bouncing back faster from setbacks. That\'s real progress.',
      severity: 'positive',
    });
  }

  // Overload cycle
  const recentOverloaded = pulses.slice(0, 7).filter(p => p.perceived_load === 'unsustainable' || p.perceived_load === 'heavy');
  if (recentOverloaded.length >= 4) {
    patterns.push({
      type: 'overload_cycle',
      label: 'Sustained overload',
      description: `You've felt heavy/unsustainable load ${recentOverloaded.length} of the last 7 days.`,
      severity: 'urgent',
    });
  }

  return patterns;
}

// ─── Components ────────────────────────────────────────────────────────────────

function TrendGraphCard({ data, title, metric, color }) {
  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#999" fontSize={11} />
            <YAxis stroke="#999" fontSize={11} domain={[0, 4]} />
            <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PatternCard({ pattern }) {
  const icons = {
    avoidance: <Brain className="w-4 h-4" />,
    delegation_gap: <Zap className="w-4 h-4" />,
    confidence_decline: <TrendingDown className="w-4 h-4" />,
    resilience_improving: <TrendingUp className="w-4 h-4" />,
    overload_cycle: <Heart className="w-4 h-4" />,
  };

  const colors = {
    positive: 'bg-green-50 border-green-200 text-green-700',
    watch: 'bg-amber-50 border-amber-200 text-amber-700',
    warn: 'bg-orange-50 border-orange-200 text-orange-700',
    urgent: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[pattern.severity]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[pattern.type]}</div>
        <div className="flex-1">
          <p className="font-medium text-sm">{pattern.label}</p>
          <p className="text-xs mt-1 opacity-90">{pattern.description}</p>
        </div>
      </div>
    </div>
  );
}

function CheckInPreferencesPanel({ tonePref, onUpdate }) {
  const [cadence, setCadence] = useState(tonePref?.cadence_preference || 'every_other_day');

  const handleSave = async () => {
    try {
      if (tonePref?.id) {
        await base44.entities.TonePreference.update(tonePref.id, { cadence_preference: cadence });
      } else {
        await base44.entities.TonePreference.create({ user_email: tonePref?.user_email, cadence_preference: cadence });
      }
      onUpdate();
    } catch (err) {
      console.error('Failed to update cadence:', err);
    }
  };

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0202ff]" />
          <CardTitle className="text-sm font-semibold text-gray-900">Daily Check-In Frequency</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-gray-500 mb-2">How often would you like to receive check-in prompts?</p>
          <Select value={cadence} onValueChange={setCadence}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="every_other_day">Every other day (default)</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="important_only">Important moments only</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-gray-400">
          {cadence === 'daily' && "You'll receive a check-in prompt each morning."}
          {cadence === 'every_other_day' && "You'll receive a check-in prompt every other day, rotating through different prompt types."}
          {cadence === 'important_only' && "You'll only receive prompts when Atreus detects important signals (overload, identity friction, etc.)."}
          {cadence === 'paused' && "Check-in prompts are paused. You can resume anytime."}
        </div>
        <Button
          size="sm"
          className="bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8 w-full"
          onClick={handleSave}
        >
          Save preference
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyRhythm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pulses = [] } = useQuery({
    queryKey: ['mr-pulses', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 100);
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
  });

  const { data: trends = null } = useQuery({
    queryKey: ['mr-trends', user?.email],
    queryFn: async () => {
      try {
        const rows = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1);
        return rows[0] || null;
      } catch { return null; }
    },
    enabled: !!user?.email,
    staleTime: 30 * 60 * 1000,
  });

  const { data: tonePref = null } = useQuery({
    queryKey: ['mr-tone', user?.email],
    queryFn: async () => {
      try {
        const rows = await base44.entities.TonePreference.filter({ user_email: user.email }, null, 1);
        return rows[0] || null;
      } catch { return null; }
    },
    enabled: !!user?.email,
    staleTime: 15 * 60 * 1000,
  });

  const trendData = buildTrendChart(pulses);
  const patterns = detectPatterns(pulses, trends);

  const handleCadenceUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['mr-tone', user?.email] });
  };

  return (
    <MVPPageLayout
      title="Your leadership rhythm"
      subtitle="Patterns, trends, and recovery cycles over the last 4 weeks"
    >
      <div className="space-y-6">
        {/* Trend Graphs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TrendGraphCard data={trendData} title="Energy level" metric="energy" color="#0202ff" />
          <TrendGraphCard data={trendData} title="Confidence" metric="confidence" color="#8b5cf6" />
          <TrendGraphCard data={trendData} title="Resilience" metric="resilience" color="#10b981" />
        </div>

        {/* Overload trend */}
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900">Perceived load</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#999" fontSize={11} />
                <YAxis stroke="#999" fontSize={11} domain={[0, 4]} />
                <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="overload" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Patterns */}
        {patterns.length > 0 && (
          <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900">What we're noticing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {patterns.map((p, i) => (
                <PatternCard key={i} pattern={p} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Check-in Preferences */}
        <CheckInPreferencesPanel tonePref={tonePref} onUpdate={handleCadenceUpdate} />

        {/* Trend Summary */}
        {trends && (
          <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900">28-day summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Energy trend</p>
                  <Badge className="mt-1 bg-blue-50 text-blue-700">{trends.energy_trend}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Confidence trend</p>
                  <Badge className="mt-1 bg-purple-50 text-purple-700">{trends.confidence_trend}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Resilience trend</p>
                  <Badge className="mt-1 bg-green-50 text-green-700">{trends.resilience_trend}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Overload pattern</p>
                  <Badge className="mt-1 bg-amber-50 text-amber-700">{Math.round(trends.overload_pattern_strength || 0)}/100</Badge>
                </div>
              </div>
              {trends.summary_28d && (
                <p className="text-xs text-gray-600 leading-relaxed mt-4">{trends.summary_28d}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MVPPageLayout>
  );
}