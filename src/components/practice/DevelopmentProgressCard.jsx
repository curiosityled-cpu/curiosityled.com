/**
 * DevelopmentProgressCard — compact split view of the manager's own development.
 * Left: overall completion snapshot. Right: the few experiences that are due
 * soon, overdue, or closest to done, ranked by urgency.
 */
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Layers, ChevronRight } from "lucide-react";
import useMyLearning from "@/hooks/useMyLearning";
import { openResource } from "@/lib/openResource";

const DAY_MS = 86400000;
const DUE_SOON_DAYS = 14;
const NEARLY_DONE = 60;

function daysUntil(value) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - Date.now()) / DAY_MS);
}

function dueLabel(days) {
  if (days === null) return null;
  if (days < 0) return { text: `Overdue ${Math.abs(days)}d`, tone: "danger" };
  if (days === 0) return { text: "Due today", tone: "warn" };
  if (days <= DUE_SOON_DAYS) return { text: `Due in ${days}d`, tone: "warn" };
  return null;
}

const TONE_CLASSES = {
  danger: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40",
  warn: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40",
};

function rankOf(row) {
  if (row.days !== null && row.days < 0) return 0;
  if (row.days !== null && row.days <= DUE_SOON_DAYS) return 1;
  if (row.percent >= NEARLY_DONE) return 2;
  return 3;
}

export default function DevelopmentProgressCard() {
  const { items, loading } = useMyLearning();
  const navigate = useNavigate();

  const open = async (item) => {
    if (item.launch?.to) {
      navigate(item.launch.to);
      return;
    }
    if (item.launch?.journey?.id) {
      navigate(`/JourneyDetails?journeyId=${item.launch.journey.id}`);
      return;
    }
    if (item.launch?.resource) {
      const opened = await openResource(item.launch.resource);
      if (!opened) toast.info("This resource has no link or file attached yet.");
      return;
    }
    navigate("/my-development");
  };

  const { active, overall, selected, dueSoonCount } = useMemo(() => {
    const live = (items || [])
      .filter((item) => item.status !== "completed")
      .map((item) => ({ ...item, days: daysUntil(item.due_date), percent: Math.round(item.percent || 0) }));

    const totalPercent = live.reduce((sum, item) => sum + item.percent, 0);

    const ranked = [...live].sort((a, b) => {
      const rankDiff = rankOf(a) - rankOf(b);
      if (rankDiff !== 0) return rankDiff;
      const aDays = a.days ?? 9999;
      const bDays = b.days ?? 9999;
      if (aDays !== bDays) return aDays - bDays;
      return b.percent - a.percent;
    });

    return {
      active: live,
      overall: live.length ? Math.round(totalPercent / live.length) : 0,
      selected: ranked,
      dueSoonCount: live.filter((item) => item.days !== null && item.days <= DUE_SOON_DAYS).length,
    };
  }, [items]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center flex-shrink-0">
          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">
          Development
        </p>
        <Link
          to="/my-development"
          className="text-[11px] font-semibold text-[#0202ff] dark:text-blue-300 hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="px-4 py-4">
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
        </div>
      ) : active.length === 0 ? (
        <div className="px-4 py-4 text-center">
          <p className="text-xs font-medium text-foreground">Nothing in progress yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Journeys and courses assigned to you will show here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[92px_1fr]">
          <div className="px-3 py-3 border-r border-border flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-extrabold text-foreground leading-none">{overall}%</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-1">complete</p>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {active.length} active
            </p>
            {dueSoonCount > 0 && (
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                {dueSoonCount} due soon
              </p>
            )}
          </div>

          <div className="divide-y divide-border max-h-[264px] overflow-y-auto">
            {selected.map((item) => {
              const due = dueLabel(item.days);
              const chip = due || (item.percent > 0
                ? { text: `${item.percent}%`, tone: "muted" }
                : null);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => open(item)}
                  className="block w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground truncate flex-1">
                      {item.title}
                    </p>
                    {chip && (
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${
                          TONE_CLASSES[chip.tone] || "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {chip.text}
                      </span>
                    )}
                  </div>
                  {item.percent > 0 && (
                    <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-[#0202ff]"
                        style={{ width: `${Math.min(100, item.percent)}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}