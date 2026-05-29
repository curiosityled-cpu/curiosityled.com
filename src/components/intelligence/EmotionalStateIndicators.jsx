/**
 * EmotionalStateIndicators — Real-time emotional state with trend arrows
 *
 * Shows:
 * - Confidence level (low/uncertain/steady/high) with trend
 * - Energy level (drained/stretched/steady/strong) with trend
 * - Resilience signal (depleted/fragile/holding/bouncing_back) with trend
 *
 * Alerts when states are declining
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle, Zap, Brain, Heart } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function EmotionalStateIndicators() {
  const { user } = useAuth();
  const [states, setStates] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const [pulses, trendRecords] = await Promise.all([
          base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 1),
          base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1)
        ]);

        if (pulses.length > 0) {
          setStates({
            confidence: pulses[0].confidence_today,
            energy: pulses[0].energy_level,
            resilience: pulses[0].resilience_signal,
            lastUpdated: pulses[0].created_date
          });
        }

        if (trendRecords.length > 0) {
          setTrends({
            confidence: trendRecords[0].confidence_trend,
            energy: trendRecords[0].energy_trend,
            resilience: trendRecords[0].resilience_trend
          });
        }
      } catch (error) {
        console.error('Error fetching emotional state:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchState();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emotional State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!states) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emotional State</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No emotional state data yet. Check in to capture your current state.</p>
        </CardContent>
      </Card>
    );
  }

  const indicators = [
    {
      label: 'Confidence',
      value: states.confidence,
      trend: trends?.confidence,
      icon: Brain,
      colors: {
        low: 'text-red-600',
        uncertain: 'text-yellow-600',
        steady: 'text-blue-600',
        high: 'text-green-600'
      }
    },
    {
      label: 'Energy',
      value: states.energy,
      trend: trends?.energy,
      icon: Zap,
      colors: {
        drained: 'text-red-600',
        stretched: 'text-yellow-600',
        steady: 'text-blue-600',
        strong: 'text-green-600'
      }
    },
    {
      label: 'Resilience',
      value: states.resilience,
      trend: trends?.resilience,
      icon: Heart,
      colors: {
        depleted: 'text-red-600',
        fragile: 'text-yellow-600',
        holding: 'text-blue-600',
        bouncing_back: 'text-green-600'
      }
    }
  ];

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const hasDeclining = trends && (
    trends.confidence === 'declining' ||
    trends.energy === 'declining' ||
    trends.resilience === 'declining'
  );

  return (
    <Card className={hasDeclining ? 'border-orange-200 bg-orange-50' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your Current State</CardTitle>
          {hasDeclining && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-100">
              <AlertCircle className="w-3 h-3 mr-1" />
              Declining
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {indicators.map((ind) => {
          const Icon = ind.icon;
          const color = ind.colors[ind.value] || 'text-gray-500';
          
          return (
            <div key={ind.label} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-sm font-medium text-gray-700">{ind.label}</p>
                  <p className={`text-xs font-semibold ${color}`}>
                    {ind.value?.charAt(0).toUpperCase() + ind.value?.slice(1).replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(ind.trend)}
              </div>
            </div>
          );
        })}

        {hasDeclining && (
          <div className="mt-3 p-3 bg-orange-100 border border-orange-200 rounded-lg text-xs text-orange-800">
            Some of your emotional indicators are declining. Consider taking a break, reviewing your workload, or reaching out to Atreus for support.
          </div>
        )}
      </CardContent>
    </Card>
  );
}