import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Target, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import ManagerActionCenter from "./ManagerActionCenter";

export default function TeamCockpit({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const goals = await base44.entities.Goal.filter({ client_id: user.client_id, status: "active" }, "-created_date", 500);
      const kpis = await base44.entities.KPI.filter({ client_id: user.client_id, status: "active" }, "-created_date", 200);

      const totalGoals = goals.length;
      const completedGoals = goals.filter(g => g.progress >= 100).length;
      const overdueGoals = goals.filter(g => g.timeframe_end && new Date(g.timeframe_end) < new Date() && g.progress < 100).length;
      const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals) : 0;

      const onTrackKpis = kpis.filter(k => {
        if (k.current_value === undefined || k.target_value === undefined) return true;
        if (k.direction === "higher_better") return k.current_value >= k.target_value * 0.75;
        if (k.direction === "lower_better") return k.current_value <= k.target_value * 1.25;
        return true;
      }).length;

      setStats({
        totalGoals,
        completedGoals,
        overdueGoals,
        avgProgress,
        totalKpis: kpis.length,
        onTrackKpis,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  const cards = [
    { label: "Active Goals", value: stats?.totalGoals || 0, sub: `${stats?.completedGoals || 0} completed`, icon: Target, color: "#0202ff" },
    { label: "Avg Progress", value: `${stats?.avgProgress || 0}%`, sub: "across all goals", icon: TrendingUp, color: "#00C875" },
    { label: "Overdue", value: stats?.overdueGoals || 0, sub: "goals past due", icon: Clock, color: "#E2445C" },
    { label: "KPIs On Track", value: `${stats?.onTrackKpis || 0}/${stats?.totalKpis || 0}`, sub: "within target range", icon: CheckCircle2, color: "#FFCB00" },
  ];

  return (
    <div className="space-y-5">
      {/* Team stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-gray-100 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                  <p className="text-[10px] text-gray-400">{s.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Center */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0202ff]" /> Needs Attention
        </h3>
        <ManagerActionCenter user={user} onActionTaken={loadStats} />
      </div>
    </div>
  );
}