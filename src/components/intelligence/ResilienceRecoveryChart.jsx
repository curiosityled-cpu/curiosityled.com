/**
 * ResilienceRecoveryChart — Visualizes resilience bounce-back patterns
 *
 * Shows:
 * - Resilience level over 28 days
 * - "Recovery windows" (bouncing_back periods)
 * - Recovery time after low points
 * - Trend direction
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RESILIENCE_MAP = {
  depleted: 1,
  fragile: 2,
  holding: 3,
  bouncing_back: 4
};

export default function ResilienceRecoveryChart() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pulses, trends] = await Promise.all([
          base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 28),
          base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1)
        ]);

        if (trends.length > 0) setTrend(trends[0]);

        // Build chart data
        const data = pulses.map((pulse, idx) => {
          const date = new Date(pulse.created_date);
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            resilience: RESILIENCE_MAP[pulse.resilience_signal] || 2,
            label: pulse.resilience_signal,
            isRecovery: pulse.resilience_signal === 'bouncing_back'
          };
        });

        setChartData(data.reverse());
      } catch (error) {
        console.error('Error fetching resilience data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resilience & Recovery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendColor = {
    improving: 'text-green-600',
    stable: 'text-gray-600',
    declining: 'text-red-600',
    insufficient_data: 'text-gray-400'
  }[trend?.resilience_trend] || 'text-gray-600';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Resilience & Recovery</CardTitle>
            <CardDescription className="mt-1">
              How quickly you bounce back from setbacks over 28 days
            </CardDescription>
          </div>
          {trend && (
            <Badge className={`${trendColor} border`}>
              {trend.resilience_trend === 'improving' && '↗ Improving'}
              {trend.resilience_trend === 'stable' && '→ Stable'}
              {trend.resilience_trend === 'declining' && '↘ Declining'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} label={{ value: 'Resilience Level', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value) => {
                  const labels = { 1: 'Depleted', 2: 'Fragile', 3: 'Holding', 4: 'Bouncing Back' };
                  return labels[value] || value;
                }}
                labelFormatter={(label) => `Day: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="resilience"
                stroke="#0202ff"
                strokeWidth={2}
                dot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            Not enough resilience data yet
          </div>
        )}

        {/* Recovery patterns */}
        {chartData.filter(d => d.isRecovery).length > 0 && (
          <div className="mt-4 pt-4 border-t text-sm">
            <p className="font-semibold text-gray-700">Recovery Pattern</p>
            <p className="text-xs text-gray-600 mt-1">
              You've had <strong>{chartData.filter(d => d.isRecovery).length}</strong> days of bouncing back.
              {trend?.resilience_trend === 'improving' && ' Recovery is getting faster.'}
              {trend?.resilience_trend === 'declining' && ' Recovery is slowing down.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}