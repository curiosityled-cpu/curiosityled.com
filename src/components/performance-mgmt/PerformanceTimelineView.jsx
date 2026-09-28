import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Target, TrendingUp, Calendar, Users, Zap, Award,
  MessageSquare, FileText, AlertCircle, ClipboardCheck, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const TYPE_CONFIG = {
  goal_created: { icon: Target, color: "#0202ff", label: "Goal" },
  evidence: { icon: Award, color: "#00C875", label: "Evidence" },
  kpi_value: { icon: TrendingUp, color: "#FFCB00", label: "KPI" },
  coaching_session: { icon: Users, color: "#A25DDC", label: "Coaching" },
  daily_checkin: { icon: Zap, color: "#00C8C8", label: "Check-in" },
  weekly_checkin: { icon: Calendar, color: "#FF6B6B", label: "Weekly" },
  review: { icon: ClipboardCheck, color: "#E2445C", label: "Review" },
};

const NOTE_TYPE_ICONS = {
  accomplishment: Award,
  feedback: MessageSquare,
  context: FileText,
  concern: AlertCircle,
};

export default function PerformanceTimelineView({ employeeEmail, user }) {
  const [email, setEmail] = useState(employeeEmail || "");
  const [searchEmail, setSearchEmail] = useState(employeeEmail || "");
  const [timeline, setTimeline] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadTimeline = async (targetEmail) => {
    if (!targetEmail) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getPerformanceTimeline", { employee_email: targetEmail });
      setTimeline(res.data?.timeline || []);
      setEmployee(res.data?.employee || null);
      setCounts(res.data?.counts || null);
    } catch (err) {
      console.error("Timeline error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email) loadTimeline(email);
  }, []);

  const handleSearch = () => {
    setEmail(searchEmail);
    loadTimeline(searchEmail);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter employee email to view their performance timeline..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
          View Timeline
        </Button>
      </div>

      {/* Employee header */}
      {employee && counts && (
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{employee.name || employee.email}</h3>
                <p className="text-xs text-gray-500">{employee.email} {employee.department && `· ${employee.department}`}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {counts.goals > 0 && <Badge2 icon={Target} label="Goals" value={counts.goals} color="#0202ff" />}
                {counts.kpis > 0 && <Badge2 icon={TrendingUp} label="KPIs" value={counts.kpis} color="#FFCB00" />}
                {counts.coaching_sessions > 0 && <Badge2 icon={Users} label="Sessions" value={counts.coaching_sessions} color="#A25DDC" />}
                {counts.reviews > 0 && <Badge2 icon={ClipboardCheck} label="Reviews" value={counts.reviews} color="#E2445C" />}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : timeline.length === 0 && email ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No performance history found for this employee</p>
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.map((item, i) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.evidence;
            const Icon = item.type === "evidence" ? (NOTE_TYPE_ICONS[item.metadata?.note_type] || Award) : config.icon;
            const dateStr = item.date ? format(new Date(item.date), "MMM d, yyyy") : "";
            return (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-card hover:shadow-sm transition-all"
                style={{ borderLeft: `3px solid ${config.color}` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${config.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{dateStr}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{config.label}</span>
                    <span className="text-[10px] text-gray-400">via {item.source}</span>
                    {item.metadata?.visibility && (
                      <span className="text-[10px] text-gray-400">· {item.metadata.visibility.replace(/_/g, " ")}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Badge2({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted">
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="text-xs font-semibold text-gray-700">{value}</span>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}