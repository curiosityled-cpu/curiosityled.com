/**
 * BurnoutRiskCard — Visual burnout risk indicator with component breakdown
 *
 * Shows composite score + warning flags + recommendation
 * Color-coded: green (low), yellow (moderate), orange (elevated), red (high)
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, Heart, Brain, Zap } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function BurnoutRiskCard() {
  const { user } = useAuth();
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        const response = await base44.functions.invoke('computeBurnoutRisk', {});
        setRisk(response.data);
      } catch (error) {
        console.error('Error fetching burnout risk:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchRisk();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Burnout Risk Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!risk || risk.risk_level === 'insufficient_data') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Burnout Risk Monitor
          </CardTitle>
          <CardDescription>Not enough data yet. Check back after more check-ins.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const scoreColor = {
    low: 'text-green-600',
    moderate: 'text-yellow-600',
    elevated: 'text-orange-600',
    high: 'text-red-600'
  }[risk.risk_level];

  const bgColor = {
    low: 'bg-green-50',
    moderate: 'bg-yellow-50',
    elevated: 'bg-orange-50',
    high: 'bg-red-50'
  }[risk.risk_level];

  return (
    <Card className={bgColor}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Burnout Risk Monitor
            </CardTitle>
            <CardDescription className={`mt-1 ${scoreColor} font-medium`}>
              {risk.risk_level.charAt(0).toUpperCase() + risk.risk_level.slice(1)} Risk
            </CardDescription>
          </div>
          <div className={`text-3xl font-bold ${scoreColor}`}>
            {risk.burnout_risk_score}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Component Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: 'Energy', icon: Heart, value: risk.components.energy },
            { label: 'Resilience', icon: TrendingDown, value: risk.components.resilience },
            { label: 'Clarity', icon: Brain, value: risk.components.cognitive_load },
            { label: 'Recovery', icon: Zap, value: risk.components.recovery }
          ].map(({ label, icon: Icon, value }) => (
            <div key={label} className="flex items-center gap-2 p-2 bg-white rounded border">
              <Icon className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium">{label}</span>
              <span className="ml-auto font-semibold">{value}</span>
            </div>
          ))}
        </div>

        {/* Warning Flags */}
        {risk.warning_flags && risk.warning_flags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Warning Flags
            </p>
            <div className="space-y-1">
              {risk.warning_flags.map((flag, i) => (
                <div key={i} className="text-xs text-gray-700 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {risk.recommendation && (
          <div className="bg-white p-2 rounded text-xs text-gray-700 italic border-l-2 border-gray-300">
            "{risk.recommendation}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}