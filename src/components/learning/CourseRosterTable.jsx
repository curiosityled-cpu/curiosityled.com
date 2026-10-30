import React, { useState } from "react";
import { MoreHorizontal, ArrowUpDown, CheckCircle2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  not_started: { label: "Not started", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In progress", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
};

const COLUMNS = [
  { key: "name", label: "Learner" },
  { key: "status", label: "Status" },
  { key: "percent", label: "Progress" },
  { key: "lessons_done", label: "Lessons" },
  { key: "last_accessed_at", label: "Last activity" },
  { key: "due_date", label: "Due" },
  { key: "completed_at", label: "Completed" },
];

const shortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** The roster: one row per learner with status, progress, dates and row actions. */
export default function CourseRosterTable({ rows, selected, onToggle, onToggleAll, sort, onSort, onRowAction, busy }) {
  const [expandedId, setExpandedId] = useState(null);
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="w-9 px-3 py-2.5">
                <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll(rows)} />
              </th>
              {COLUMNS.map((column) => (
                <th key={column.key} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground transition-colors",
                      sort.key === column.key && "text-foreground font-semibold"
                    )}
                  >
                    {column.label}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              ))}
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="px-3 py-8 text-center text-muted-foreground">
                  No learners match these filters.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const status = STATUS_STYLE[row.status] || STATUS_STYLE.not_started;
              const expanded = expandedId === row.id;
              return (
                <React.Fragment key={row.id}>
                  <tr className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <Checkbox checked={selected.has(row.id)} onCheckedChange={() => onToggle(row.id)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => setExpandedId(expanded ? null : row.id)} className="text-left">
                        <span className="block font-medium text-foreground truncate max-w-[200px]">{row.name}</span>
                        <span className="block text-[11px] text-muted-foreground truncate max-w-[200px]">{row.email}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", status.className)}>
                          {status.label}
                        </span>
                        {row.waived && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            Waived
                          </span>
                        )}
                        {row.waiver_status === "requested" && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Waiver asked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", row.status === "completed" ? "bg-emerald-500" : "bg-[#0202ff]")}
                            style={{ width: `${Math.min(100, row.percent)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{row.percent}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {row.lessons_done} / {row.lessons_total}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {shortDate(row.last_accessed_at)}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      <span className={row.status === "overdue" ? "text-red-600 font-medium" : "text-muted-foreground"}>
                        {row.due_date || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {shortDate(row.completed_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onRowAction("remind", [row.id])}>Send reminder</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("set_due_date", [row.id])}>Set due date</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("waiver", [row.id])}>
                            Waiver or extension
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setExpandedId(expanded ? null : row.id)}>
                            {expanded ? "Hide learner detail" : "View learner detail"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => onRowAction("unassign", [row.id])}>
                            Unassign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-border bg-muted/20 last:border-0">
                      <td />
                      <td colSpan={COLUMNS.length + 1} className="px-3 py-3">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                          <div>
                            <p className="text-muted-foreground">Enrolled</p>
                            <p className="text-foreground">
                              {row.enrolled_at ? new Date(row.enrolled_at).toLocaleDateString() : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Assigned by</p>
                            <p className="text-foreground truncate">{row.assigned_by || "Program team"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Lessons complete</p>
                            <p className="text-foreground flex items-center gap-1.5">
                              {row.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                              {row.lessons_done} of {row.lessons_total}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Certificate</p>
                            <p className="text-foreground flex items-center gap-1.5">
                              {row.certificate_issued ? (
                                <>
                                  <Award className="w-3.5 h-3.5 text-amber-600" /> Issued
                                </>
                              ) : (
                                "Not issued"
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Why assigned</p>
                            <p className="text-foreground">
                              {row.assignment_basis_label || "Not recorded"}
                            </p>
                            {row.assignment_reason && (
                              <p className="text-muted-foreground mt-0.5">{row.assignment_reason}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-muted-foreground">Waiver / extension</p>
                            <p className="text-foreground">
                              {row.waiver_status === "granted"
                                ? "Waived"
                                : row.waiver_status === "requested"
                                ? "Waiver requested"
                                : row.waiver_status === "declined"
                                ? "Waiver declined"
                                : "None"}
                              {row.extension_granted_days > 0
                                ? ` · +${row.extension_granted_days} days`
                                : ""}
                            </p>
                            {row.due_date_original && row.due_date && row.due_date_original !== row.due_date && (
                              <p className="text-muted-foreground mt-0.5">
                                Due {row.due_date_original} → {row.due_date}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}