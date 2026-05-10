import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, AlertTriangle, Zap, CheckCircle2, Users } from "lucide-react";
import { isPast, parseISO, subDays, isAfter } from "date-fns";

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function EnergyBar({ label, score }) {
  const pct = (score / 5) * 100;
  const color = score >= 4 ? "#22c55e" : score >= 3 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold w-6 text-right" style={{ color }}>{score.toFixed(1)}</span>
    </div>
  );
}

export default function OneOnOneInsights({ user, teamMembers = [], isEmployee = false }) {
  const [records, setRecords] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const since = subDays(new Date(), 90);
      const [recs, cis] = await Promise.all([
        isEmployee
          ? base44.entities.MeetingRecord.filter({ employee_email: user.email }, "-meeting_date", 20)
          : base44.entities.MeetingRecord.filter({ manager_email: user.email }, "-meeting_date", 100),
        isEmployee
          ? base44.entities.WeeklyCheckIn.filter({ employee_email: user.email }, "-week_of", 12)
          : base44.entities.WeeklyCheckIn.filter({ manager_email: user.email }, "-week_of", 50),
      ]);
      setRecords(recs.filter(r => r.meeting_date && isAfter(parseISO(r.meeting_date), since)));
      setCheckIns(cis);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>;

  const allCommitments = records.flatMap(r => r.commitments || []);
  const totalCommitments = allCommitments.length;
  const completedCommitments = allCommitments.filter(c => c.status === "complete").length;
  const overdueCommitments = allCommitments.filter(c =>
    c.status === "open" && c.due_date && isPast(parseISO(c.due_date))
  ).length;
  const completionPct = totalCommitments > 0 ? Math.round((completedCommitments / totalCommitments) * 100) : 0;

  if (isEmployee) {
    // Employee view — personal stats
    const myCheckIns = checkIns.filter(c => c.employee_email === user.email);
    const avgEnergy = myCheckIns.length > 0
      ? (myCheckIns.reduce((sum, c) => sum + (c.energy_level || 3), 0) / myCheckIns.length).toFixed(1)
      : "—";
    const myCommitments = allCommitments.filter(c => c.owner === "employee");
    const myDone = myCommitments.filter(c => c.status === "complete").length;
    const myMissed = myCommitments.filter(c => c.status === "open" && c.due_date && isPast(parseISO(c.due_date))).length;

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Your Last 90 Days</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Actions Completed" value={myDone} icon={CheckCircle2} color="#22c55e" />
          <StatCard label="Missed / Overdue" value={myMissed} icon={AlertTriangle} color="#ef4444" />
          <StatCard label="Avg Energy Level" value={avgEnergy} sub="out of 5" icon={Zap} color="#eab308" />
          <StatCard label="Check-ins Submitted" value={myCheckIns.length} icon={TrendingUp} color="#0202ff" />
        </div>
      </div>
    );
  }

  // Manager view — team stats
  const energyByEmployee = {};
  checkIns.forEach(ci => {
    if (!energyByEmployee[ci.employee_email]) energyByEmployee[ci.employee_email] = [];
    if (ci.energy_level) energyByEmployee[ci.employee_email].push(ci.energy_level);
  });

  const avgTeamEnergy = Object.values(energyByEmployee).flat();
  const teamEnergyAvg = avgTeamEnergy.length > 0
    ? (avgTeamEnergy.reduce((a, b) => a + b, 0) / avgTeamEnergy.length).toFixed(1)
    : "—";

  const employeeEnergyList = Object.entries(energyByEmployee).map(([email, scores]) => ({
    email,
    name: teamMembers.find(m => m.email === email)?.full_name || email,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length
  })).sort((a, b) => a.avg - b.avg);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-700">Team Performance — Last 90 Days</h3>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Completion Rate" value={`${completionPct}%`} sub={`${completedCommitments}/${totalCommitments} commitments`} icon={CheckCircle2} color="#22c55e" />
        <StatCard label="Overdue Items" value={overdueCommitments} sub="need attention" icon={AlertTriangle} color="#ef4444" />
        <StatCard label="Avg Team Energy" value={teamEnergyAvg} sub="out of 5" icon={Zap} color="#eab308" />
        <StatCard label="Check-ins Received" value={checkIns.length} sub="last 90 days" icon={TrendingUp} color="#0202ff" />
      </div>

      {employeeEnergyList.length > 0 && (
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <p className="text-sm font-semibold text-gray-700">Energy by Team Member</p>
            </div>
            {employeeEnergyList.map(e => (
              <EnergyBar key={e.email} label={e.name} score={e.avg} />
            ))}
          </CardContent>
        </Card>
      )}

      {overdueCommitments > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{overdueCommitments} commitment{overdueCommitments !== 1 ? "s are" : " is"} overdue. Review the Action Tracker.</span>
        </div>
      )}
    </div>
  );
}