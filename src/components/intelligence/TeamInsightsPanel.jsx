/**
 * TeamInsightsPanel — Anonymized team-level patterns
 *
 * Visible only to managers. Shows:
 * - Team energy trend (aggregated)
 * - Team overload signals
 * - Common recovery patterns
 * - Anonymous high-risk count
 *
 * No individual identifiers, only aggregated signals
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";

export default function TeamInsightsPanel() {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const fetchTeamInsights = async () => {
      try {
        // Check if user is a manager (has User Level 2 role or similar)
        const userRole = user?.app_role || user?.role;
        const isManagerRole = userRole && (
          userRole.includes('Manager') || 
          userRole.includes('Lead') || 
          userRole.includes('Level 2')
        );

        if (!isManagerRole) {
          setIsManager(false);
          setLoading(false);
          return;
        }

        setIsManager(true);

        // Fetch aggregated org pulse data
        try {
          const response = await base44.functions.invoke('getOrgPulseAggregates', {
            scope: 'direct_reports'
          });

          setInsights(response.data);
        } catch (e) {
          console.warn('Could not fetch team insights:', e.message);
          setInsights(null);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchTeamInsights();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Pulse
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

  if (!isManager || !insights) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Pulse (Anonymous)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Team Energy Trend */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-semibold text-gray-700">Team Energy</p>
          </div>
          <p className="text-sm text-gray-700">
            {insights.team_energy_trend === 'improving' && '↗ Trending up across the team'}
            {insights.team_energy_trend === 'stable' && '→ Holding steady'}
            {insights.team_energy_trend === 'declining' && '↘ Trending down — monitor closely'}
          </p>
          {insights.team_energy_drain_pct && (
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(insights.team_energy_drain_pct * 100)}% reporting drained/stretched
            </p>
          )}
        </div>

        {/* Team Overload Signals */}
        {insights.team_overload_count > 0 && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-xs font-semibold text-yellow-700">Overload Signals</p>
            </div>
            <p className="text-sm text-yellow-800">
              {insights.team_overload_count} team members showing operator mode signals
            </p>
          </div>
        )}

        {/* Team Recovery Patterns */}
        {insights.team_recovery_rate !== undefined && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-semibold text-green-700 mb-1">Recovery Pattern</p>
            <p className="text-sm text-green-800">
              {Math.round(insights.team_recovery_rate * 100)}% of team showing good bounce-back
            </p>
          </div>
        )}

        {/* High Risk Anonymous Count */}
        {insights.team_high_risk_count > 0 && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-xs font-semibold text-red-700">At-Risk Signal</p>
            </div>
            <p className="text-sm text-red-800">
              {insights.team_high_risk_count} team member{insights.team_high_risk_count !== 1 ? 's' : ''} showing elevated burnout risk
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2 italic">
          All data is anonymized. No individual identities are shown.
        </p>
      </CardContent>
    </Card>
  );
}