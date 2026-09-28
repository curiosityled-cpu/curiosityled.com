import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingDown, Calendar, Target, Zap, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const ALERT_CONFIG = {
  overdue_goal: { icon: Target, color: "#E2445C", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "Overdue Goal" },
  off_track_kpi: { icon: TrendingDown, color: "#FFCB00", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Off-Track KPI" },
  missed_checkin: { icon: Zap, color: "#FFCB00", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Missed Check-in" },
  stale_1on1: { icon: Calendar, color: "#0202ff", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", label: "Stale 1:1" },
  declining_trend: { icon: AlertTriangle, color: "#E2445C", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "Declining Trend" },
};

const SEVERITY_LABELS = {
  high: { label: "High Priority", bg: "bg-red-100", text: "text-red-700" },
  attention: { label: "Needs Attention", bg: "bg-amber-100", text: "text-amber-700" },
  informational: { label: "Informational", bg: "bg-blue-100", text: "text-blue-700" },
};

export default function ManagerActionCenter({ user, onActionTaken }) {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getManagerActionCenter", {});
      setAlerts(res.data?.alerts || []);
      setSummary(res.data?.summary || null);
    } catch (err) {
      console.error("Action center error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleAction = async (alert) => {
    setActingOn(alert.id);
    try {
      await base44.functions.invoke(alert.action_function, alert.action_payload);
      toast.success(`${alert.action_label} — action sent`);
      // Remove the alert from the list after action
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      onActionTaken?.();
    } catch (err) {
      toast.error("Action failed: " + err.message);
    } finally {
      setActingOn(null);
    }
  };

  if (loading) {
    return (
      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <p className="font-medium text-gray-900">All clear</p>
          <p className="text-sm text-gray-500 mt-1">No items need your attention right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Overdue Goals", value: summary.overdue_goals, color: "#E2445C" },
            { label: "Off-Track KPIs", value: summary.off_track_kpis, color: "#FFCB00" },
            { label: "Missed Check-ins", value: summary.missed_checkins, color: "#FFCB00" },
            { label: "Stale 1:1s", value: summary.stale_1on1s, color: "#0202ff" },
            { label: "Declining Trends", value: summary.declining_trends, color: "#E2445C" },
          ].map((s) => (
            <div key={s.label} className="text-center p-2.5 rounded-xl border border-gray-100 bg-card">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-2">
        {alerts.map((alert) => {
          const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.missed_checkin;
          const Icon = config.icon;
          const severity = SEVERITY_LABELS[alert.severity] || SEVERITY_LABELS.attention;
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.border} ${config.bg} transition-all`}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white">
                <Icon className="w-4 h-4" style={{ color: config.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.description}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] border-0 ${severity.bg} ${severity.text} flex-shrink-0`}>
                    {severity.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400">{alert.employee_email}</span>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 bg-[#0202ff] hover:bg-[#0101dd] text-white"
                    disabled={actingOn === alert.id}
                    onClick={() => handleAction(alert)}
                  >
                    {actingOn === alert.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        {alert.action_label} <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}