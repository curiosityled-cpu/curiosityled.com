import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Clock, AlertTriangle, User, Users } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { toast } from "sonner";

function CommitmentStatusBadge({ status, dueDate }) {
  const overdue = status === "open" && dueDate && isPast(parseISO(dueDate));
  if (status === "complete") return <Badge className="bg-green-50 text-green-700 border-green-200 border text-xs gap-1"><CheckCircle2 className="w-3 h-3" />Done</Badge>;
  if (overdue) return <Badge className="bg-red-50 text-red-700 border-red-200 border text-xs gap-1"><AlertTriangle className="w-3 h-3" />Overdue</Badge>;
  return <Badge className="bg-blue-50 text-blue-700 border-blue-200 border text-xs gap-1"><Clock className="w-3 h-3" />Open</Badge>;
}

export default function ActionTracker({ user, teamMembers = [] }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(null);

  useEffect(() => { loadRecords(); }, [user]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.MeetingRecord.filter(
        { manager_email: user.email },
        "-meeting_date",
        50
      );
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleCommitment = async (record, commitment) => {
    const newStatus = commitment.status === "complete" ? "open" : "complete";
    setUpdating(commitment.id);
    try {
      const updated = record.commitments.map(c =>
        c.id === commitment.id ? { ...c, status: newStatus } : c
      );
      await base44.entities.MeetingRecord.update(record.id, { commitments: updated });
      setRecords(prev => prev.map(r =>
        r.id === record.id ? { ...r, commitments: updated } : r
      ));
      toast.success(newStatus === "complete" ? "Marked complete ✓" : "Reopened");
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  // Group by employee
  const grouped = {};
  records.forEach(record => {
    const emp = record.employee_email;
    if (!grouped[emp]) grouped[emp] = { commitments: [], employeeEmail: emp };
    (record.commitments || []).forEach(c => {
      if (statusFilter === "all" || statusFilter === c.status ||
        (statusFilter === "overdue" && c.status === "open" && c.due_date && isPast(parseISO(c.due_date)))) {
        grouped[emp].commitments.push({ ...c, recordId: record.id, meetingDate: record.meeting_date, record });
      }
    });
  });

  const employeeEmails = Object.keys(grouped).filter(e => grouped[e].commitments.length > 0);
  const getTeamMember = (email) => teamMembers.find(m => m.email === email);

  const totalOpen = records.flatMap(r => r.commitments || []).filter(c => c.status === "open").length;
  const totalDone = records.flatMap(r => r.commitments || []).filter(c => c.status === "complete").length;
  const totalOverdue = records.flatMap(r => r.commitments || []).filter(c =>
    c.status === "open" && c.due_date && isPast(parseISO(c.due_date))
  ).length;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>;

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open Actions", value: totalOpen, color: "#0202ff" },
          { label: "Overdue", value: totalOverdue, color: "#ef4444" },
          { label: "Completed", value: totalDone, color: "#22c55e" },
        ].map(s => (
          <Card key={s.label} className="border border-gray-100 shadow-sm rounded-xl">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Filter:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            <SelectItem value="open">Open only</SelectItem>
            <SelectItem value="complete">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped by employee */}
      {employeeEmails.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No action items found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {employeeEmails.map(email => {
            const member = getTeamMember(email);
            const { commitments } = grouped[email];
            const overdueCount = commitments.filter(c => c.status === "open" && c.due_date && isPast(parseISO(c.due_date))).length;
            return (
              <Card key={email} className="border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-[#0202ff]" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{member?.full_name || email}</span>
                    {overdueCount > 0 && (
                      <Badge className="bg-red-50 text-red-600 border-red-200 border text-xs">{overdueCount} overdue</Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{commitments.length} item{commitments.length !== 1 ? "s" : ""}</span>
                </div>
                <CardContent className="p-3 space-y-2">
                  {commitments.map(c => {
                    const overdue = c.status === "open" && c.due_date && isPast(parseISO(c.due_date));
                    return (
                      <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${overdue ? "bg-red-50" : "hover:bg-gray-50"}`}>
                        <button
                          onClick={() => toggleCommitment(c.record, c)}
                          disabled={updating === c.id}
                          className="flex-shrink-0"
                        >
                          {updating === c.id
                            ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            : c.status === "complete"
                              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                              : <Clock className={`w-4 h-4 ${overdue ? "text-red-400" : "text-gray-300"}`} />}
                        </button>
                        <span className={`flex-1 text-sm ${c.status === "complete" ? "line-through text-gray-400" : "text-gray-700"}`}>
                          {c.action}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">{c.owner}</Badge>
                          {c.due_date && (
                            <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                              {format(parseISO(c.due_date), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}