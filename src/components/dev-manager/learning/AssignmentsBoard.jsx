import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import CoursePickerDialog from "./CoursePickerDialog";
import AssignCourseModal from "@/components/dev-manager/AssignCourseModal";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);
const safe = (promise, fallback) => promise.catch(() => fallback);

const FILTERS = [
  { id: "overdue", label: "Overdue" },
  { id: "due_soon", label: "Due in 14 days" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "Everything" },
];

const STATE = {
  overdue: { label: "Overdue", dot: "bg-red-500", text: "text-red-600" },
  not_started: { label: "Not started", dot: "bg-gray-300", text: "text-gray-500" },
  in_progress: { label: "In progress", dot: "bg-amber-400", text: "text-amber-600" },
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-600" },
};

function stateOf(row) {
  if (row.status === "completed") return "completed";
  if (row.due_date && row.due_date < today()) return "overdue";
  if (row.status === "not_started") return "not_started";
  return "in_progress";
}

function queryFor(filter, search) {
  const query = {};
  if (filter === "overdue") {
    query.due_date = { $lt: today() };
    query.status = { $ne: "completed" };
  } else if (filter === "due_soon") {
    query.due_date = { $gte: today(), $lte: inDays(14) };
    query.status = { $ne: "completed" };
  } else if (filter === "not_started") {
    query.status = "not_started";
  } else if (filter === "in_progress") {
    query.status = "in_progress";
  } else if (filter === "completed") {
    query.status = "completed";
  }
  const term = search?.trim();
  if (term) {
    query.$or = [{ learner_email: { $regex: term } }, { course_title: { $regex: term } }];
  }
  return query;
}

/**
 * "What is owed" — one line per learner and course, grouped by the state that needs
 * attention first. The only action on a row is the one an admin actually reaches for: nudge.
 */
export default function AssignmentsBoard({ user }) {
  const [filter, setFilter] = useState("overdue");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(null);
  const [nudged, setNudged] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assignCourse, setAssignCourse] = useState(null);
  const [users, setUsers] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadCounts = useCallback(async () => {
    const [overdue, dueSoon, notStarted, inProgress, completed] = await Promise.all([
      safe(base44.entities.CourseProgress.count({ due_date: { $lt: today() }, status: { $ne: "completed" } }), 0),
      safe(base44.entities.CourseProgress.count({ due_date: { $gte: today(), $lte: inDays(14) }, status: { $ne: "completed" } }), 0),
      safe(base44.entities.CourseProgress.count({ status: "not_started" }), 0),
      safe(base44.entities.CourseProgress.count({ status: "in_progress" }), 0),
      safe(base44.entities.CourseProgress.count({ status: "completed" }), 0),
    ]);
    setCounts({ overdue, due_soon: dueSoon, not_started: notStarted, in_progress: inProgress, completed });
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const page = await base44.entities.CourseProgress.filter(queryFor(filter, search), {
        sort: "due_date",
        limit: 100,
      });
      setRows(asArray(page));
    } catch (error) {
      console.error("Could not load assignments", error);
      toast.error("Could not load assignments");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts, refreshKey]);

  useEffect(() => {
    const timer = setTimeout(loadRows, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadRows, search, refreshKey]);

  const openAssign = async () => {
    setPickerOpen(false);
    setAssignCourse(null);
    setPickerOpen(true);
    if (users.length === 0) {
      const [people, groups] = await Promise.all([
        safe(base44.entities.User.list(), []),
        safe(base44.entities.Cohort.list(), []),
      ]);
      setUsers(asArray(people));
      setCohorts(asArray(groups));
    }
  };

  const nudge = async (row) => {
    setNudging(row.id);
    try {
      await base44.functions.invoke("createNotification", {
        user_email: row.learner_email,
        type: "reminder",
        title: row.due_date ? `Reminder: ${row.course_title}` : `Continue: ${row.course_title}`,
        message: row.due_date
          ? `This course is due ${format(new Date(row.due_date), "MMM d")}. You are ${row.overall_percentage || 0}% complete.`
          : `You are ${row.overall_percentage || 0}% through this course. Pick up where you left off.`,
        action_url: "/my-development",
      });
      setNudged((prev) => ({ ...prev, [row.id]: true }));
      toast.success("Reminder sent");
    } catch (error) {
      console.error(error);
      toast.error("Could not send reminder");
    } finally {
      setNudging(null);
    }
  };

  const grouped = useMemo(() => {
    const order = ["overdue", "not_started", "in_progress", "completed"];
    const map = new Map();
    rows.forEach((row) => {
      const key = stateOf(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return order.filter((key) => map.has(key)).map((key) => [key, map.get(key)]);
  }, [rows]);

  const showGroups = filter === "all" && !search.trim();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                  active ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {item.label}
                {typeof count === "number" && count > 0 && (
                  <span className={`ml-1.5 tabular-nums ${active ? "text-white/70" : "text-gray-400"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Learner or course"
            className="h-8 w-52 pl-8 text-xs bg-white"
          />
        </div>

        <Button onClick={openAssign} className="h-8 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Assign
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_9rem_4rem_2.5rem] gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/60">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Learner · course</span>
          <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Due</span>
          <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Done</span>
          <span />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-600">
              {filter === "overdue" ? "Nothing overdue." : "Nothing here yet."}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === "overdue" ? "Everyone is within their due dates." : "Assign a course to get started."}
            </p>
          </div>
        ) : (
          <div>
            {(showGroups ? grouped : [["all", rows]]).map(([key, items]) => (
              <div key={key}>
                {showGroups && (
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATE[key]?.dot || "bg-gray-300"}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {STATE[key]?.label || key}
                    </span>
                    <span className="text-[10px] text-gray-400 tabular-nums">{items.length}</span>
                  </div>
                )}
                <ul className="divide-y divide-gray-50">
                  {items.map((row) => {
                    const state = STATE[stateOf(row)] || STATE.in_progress;
                    return (
                      <li
                        key={row.id}
                        className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_9rem_4rem_2.5rem] items-center gap-3 px-4 py-2.5 hover:bg-gray-50/70"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span className={`w-1 h-7 rounded-full ${state.dot}`} />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-900 truncate">{row.learner_email}</p>
                            <p className="text-[11px] text-gray-500 truncate">{row.course_title || "Untitled course"}</p>
                          </div>
                        </div>
                        <span
                          className={`hidden sm:block text-right font-mono text-[11px] tabular-nums ${
                            stateOf(row) === "overdue" ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          {row.due_date ? format(new Date(row.due_date), "MMM d, yyyy") : "—"}
                        </span>
                        <span className="hidden sm:block text-right font-mono text-[11px] tabular-nums text-gray-500">
                          {row.overall_percentage || 0}%
                        </span>
                        <div className="flex justify-end">
                          {row.status !== "completed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={nudged[row.id] ? "Reminder sent" : "Send a reminder"}
                              disabled={nudging === row.id || nudged[row.id]}
                              onClick={() => nudge(row)}
                            >
                              {nudging === row.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                              ) : (
                                <Bell
                                  className={`w-3.5 h-3.5 ${nudged[row.id] ? "text-emerald-500" : "text-gray-400"}`}
                                />
                              )}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {rows.length === 100 && (
              <p className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-50">
                Showing the first 100 — narrow the filter or search to see more.
              </p>
            )}
          </div>
        )}
      </div>

      <CoursePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(course) => {
          setPickerOpen(false);
          setAssignCourse(course);
        }}
      />

      {assignCourse && (
        <AssignCourseModal
          open={Boolean(assignCourse)}
          onClose={() => setAssignCourse(null)}
          course={assignCourse}
          users={users}
          cohorts={cohorts}
          clientId={user?.client_id}
          onAssigned={() => {
            setAssignCourse(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}