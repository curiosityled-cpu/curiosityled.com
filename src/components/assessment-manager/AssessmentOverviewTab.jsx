import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, Award, CheckCircle, Clock, Loader2, Users, FileText, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = { atRisk: "#ef4444", developing: "#f59e0b", proficient: "#3b82f6", expert: "#10b981" };

export default function AssessmentOverviewTab() {
  const [loading, setLoading] = useState(true);
  const [customAssessments, setCustomAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leadershipAssessments, setLeadershipAssessments] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [custom, subs, leadership, userData] = await Promise.all([
          base44.entities.CustomAssessment.list("-created_date"),
          base44.entities.AssessmentSubmission.list(),
          base44.entities.Assessment.list(),
          base44.entities.User.list(),
        ]);
        setCustomAssessments(custom || []);
        setSubmissions(subs || []);
        setLeadershipAssessments(leadership || []);
        setUsers(userData || []);
      } catch (error) {
        console.error("Error loading overview:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const liveCustom = customAssessments.filter((a) => a.status === "published");
    const liveAssignees = liveCustom.reduce((sum, a) => sum + (a.assigned_user_emails?.length || 0), 0);
    const completedSubs = submissions.filter((s) => s.status === "completed" || s.status === "graded");
    const completedLeadership = leadershipAssessments.filter((a) => a.overall_pct != null);
    const totalCompleted = completedSubs.length + completedLeadership.length;
    const totalLive = liveAssignees + (leadershipAssessments.length === 0 ? 0 : 0); // leadership live tracked separately
    const allScores = [
      ...completedSubs.map((s) => s.percentage || 0),
      ...completedLeadership.map((a) => a.overall_pct || 0),
    ];
    const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0;
    return { liveCount: liveCustom.length, liveAssignees, totalCompleted, avgScore, totalLive };
  }, [customAssessments, submissions, leadershipAssessments]);

  // Live assessments table: assigned users with status
  const liveTable = useMemo(() => {
    const rows = [];
    const published = customAssessments.filter((a) => a.status === "published");
    for (const a of published) {
      for (const email of a.assigned_user_emails || []) {
        const sub = submissions.find((s) => s.assessment_id === a.id && s.user_email === email);
        const u = users.find((usr) => usr.email === email);
        rows.push({
          key: `${a.id}-${email}`,
          user: u?.full_name || email,
          email,
          assessment: a.title,
          status: sub?.status === "completed" ? "Completed" : sub?.status === "in_progress" ? "In Progress" : "Not Started",
          score: sub?.percentage,
          date: sub?.submission_date,
        });
      }
    }
    return rows;
  }, [customAssessments, submissions, users]);

  // Charts
  const scoreDistribution = useMemo(() => [
    { name: "Failed (<70%)", value: submissions.filter((s) => (s.percentage || 0) < 70).length, color: COLORS.atRisk },
    { name: "Passing (70–84%)", value: submissions.filter((s) => (s.percentage || 0) >= 70 && (s.percentage || 0) < 85).length, color: COLORS.proficient },
    { name: "Excellent (85%+)", value: submissions.filter((s) => (s.percentage || 0) >= 85).length, color: COLORS.expert },
  ], [submissions]);

  const submissionsByAssessment = useMemo(() =>
    customAssessments.map((a) => {
      const subs = submissions.filter((s) => s.assessment_id === a.id);
      return {
        name: a.title?.substring(0, 20) || "Untitled",
        submissions: subs.length,
        avgScore: subs.length > 0 ? Math.round(subs.reduce((s, x) => s + (x.percentage || 0), 0) / subs.length) : 0,
      };
    }).filter((d) => d.submissions > 0),
    [customAssessments, submissions]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  const statPills = [
    { icon: FileText, label: "Live Assessments", value: stats.liveCount, color: "text-[#0202ff]" },
    { icon: Users, label: "Assigned Users", value: stats.liveAssignees, color: "text-purple-600" },
    { icon: CheckCircle, label: "Completed", value: stats.totalCompleted, color: "text-green-600" },
    { icon: Award, label: "Avg Score", value: `${stats.avgScore}%`, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat pills */}
      <div className="flex flex-wrap gap-3">
        {statPills.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full text-sm font-medium shadow-sm">
              <Icon className={`w-4 h-4 ${s.color}`} />
              <span>{s.value}</span>
              <span className="text-muted-foreground text-xs">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Live assessments table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Assessment Roster</CardTitle>
          <CardDescription>Assigned users and their completion status</CardDescription>
        </CardHeader>
        <CardContent>
          {liveTable.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No live assignments. Assign assessments from the Library tab.
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveTable.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium text-sm">{row.user}</TableCell>
                      <TableCell className="text-sm">{row.assessment}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          row.status === "Completed" ? "bg-green-50 text-green-700" :
                          row.status === "In Progress" ? "bg-blue-50 text-blue-700" :
                          "bg-gray-50 text-gray-600"
                        }>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{row.score != null ? `${row.score}%` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.date ? format(new Date(row.date), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Distribution</CardTitle>
            <CardDescription>Performance breakdown across all submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={scoreDistribution} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""}
                    outerRadius={80} dataKey="value">
                    {scoreDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No submission data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions by Assessment</CardTitle>
            <CardDescription>Completion and average scores per assessment</CardDescription>
          </CardHeader>
          <CardContent>
            {submissionsByAssessment.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={submissionsByAssessment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submissions" fill="#3b82f6" name="Submissions" />
                  <Bar dataKey="avgScore" fill="#10b981" name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No assessment data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}