import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Search, Users, CalendarClock, Bell, UserMinus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import CourseRosterSummary from "@/components/learning/CourseRosterSummary";
import CourseRosterTable from "@/components/learning/CourseRosterTable";

const STATUS_OPTIONS = [
  { value: "all", label: "All learners" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

/** Admin drawer: who is enrolled, how far they have got, and what to do about it. */
export default function CourseRosterDrawer({ open, onClose, course, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [selected, setSelected] = useState(new Set());
  const [dueDialog, setDueDialog] = useState(null);

  const load = useCallback(async () => {
    if (!course?.id) return;
    setLoading(true);
    try {
      const response = await base44.functions.invoke("courseRoster", { course_id: course.id, action: "list" });
      setData(response?.data || null);
      setSelected(new Set());
    } catch (error) {
      console.error("Roster load error:", error);
      toast.error("Could not load the course roster");
    } finally {
      setLoading(false);
    }
  }, [course?.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const rows = useMemo(() => {
    const list = (data?.rows || []).filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query || row.name?.toLowerCase().includes(query) || row.email?.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [data, search, statusFilter, sort]);

  const toggleSort = (key) =>
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (visibleRows) => {
    const allSelected = visibleRows.every((row) => selected.has(row.id));
    setSelected(allSelected ? new Set() : new Set(visibleRows.map((row) => row.id)));
  };

  const runAction = async (action, progressIds, extra = {}) => {
    if (!progressIds.length) return;
    if (action === "unassign" && !confirm(`Unassign ${progressIds.length} learner(s)? Their progress on this course is removed.`)) return;
    setBusy(true);
    try {
      await base44.functions.invoke("courseRoster", {
        course_id: course.id,
        action,
        progress_ids: progressIds,
        ...extra,
      });
      toast.success(
        action === "remind"
          ? `Reminder sent to ${progressIds.length} learner(s)`
          : action === "unassign"
          ? `${progressIds.length} learner(s) unassigned`
          : "Due date updated"
      );
      await load();
      onChanged?.();
    } catch (error) {
      console.error("Roster action error:", error);
      toast.error("That action could not be completed");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const header = ["Learner", "Email", "Status", "Percent", "Lessons done", "Lessons total", "Enrolled", "Last activity", "Due date", "Completed", "Certificate"];
    const lines = rows.map((row) => [
      row.name,
      row.email,
      row.status,
      row.percent,
      row.lessons_done,
      row.lessons_total,
      row.enrolled_at?.slice(0, 10),
      row.last_accessed_at?.slice(0, 10),
      row.due_date,
      row.completed_at?.slice(0, 10),
      row.certificate_issued ? "yes" : "no",
    ]);
    const csv = [header, ...lines].map((cells) => cells.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${course?.title || "course"}-roster.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedIds = [...selected];

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0202ff]" />
            {course?.title} — enrolment & progress
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-8 pt-4 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading roster…
            </div>
          )}

          {!loading && data && (
            <>
              <CourseRosterSummary summary={data.summary} modules={data.modules} />

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search learners…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[170px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-9" onClick={exportCsv} disabled={!rows.length}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={load}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#0202ff]/20 bg-[#0202ff]/5 px-3 py-2">
                  <Badge variant="outline" className="bg-card">{selectedIds.length} selected</Badge>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction("remind", selectedIds)}>
                    <Bell className="w-3.5 h-3.5 mr-1.5" />
                    Send reminder
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setDueDialog(selectedIds)}>
                    <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
                    Set due date
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    disabled={busy}
                    onClick={() => runAction("unassign", selectedIds)}
                  >
                    <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                    Unassign
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              <CourseRosterTable
                rows={rows}
                selected={selected}
                onToggle={toggleOne}
                onToggleAll={toggleAll}
                sort={sort}
                onSort={toggleSort}
                busy={busy}
                onRowAction={(action, ids) => (action === "set_due_date" ? setDueDialog(ids) : runAction(action, ids))}
              />
            </>
          )}
        </div>

        <DueDateDialog
          open={!!dueDialog}
          busy={busy}
          onClose={() => setDueDialog(null)}
          onSubmit={async (date) => {
            await runAction("set_due_date", dueDialog, { due_date: date });
            setDueDialog(null);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function DueDateDialog({ open, busy, onClose, onSubmit }) {
  const [date, setDate] = useState("");

  useEffect(() => {
    if (open) setDate("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set due date</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <p className="text-xs text-muted-foreground">
            Learners get a reminder email and in-app notice once the date is three days away. Leaving it
            empty clears the due date.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            disabled={busy}
            onClick={() => onSubmit(date || null)}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}