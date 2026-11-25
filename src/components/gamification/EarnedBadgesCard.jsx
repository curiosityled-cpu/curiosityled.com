import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Medal } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/** Badges the learner has earned through the gamification engine. */
export default function EarnedBadgesCard({ limit = 6 }) {
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!email) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      try {
        const [earned, templates] = await Promise.all([
          base44.entities.UserBadge.filter({ user_email: email }, "-earned_date", 50),
          base44.entities.BadgeTemplate.list(),
        ]);
        const byId = new Map((templates || []).map((t) => [t.id, t]));
        const rows = (Array.isArray(earned) ? earned : earned?.items || []).map((row) => ({
          ...row,
          template: byId.get(row.badge_template_id) || null,
        }));
        if (!cancelled) setBadges(rows);
      } catch {
        if (!cancelled) setBadges([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const shown = badges.slice(0, limit);

  return (
    <section className="flex flex-col rounded-[14px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[0_4px_12px_rgba(23,40,50,0.06)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
            <Medal className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[var(--pf-text)]">Badges</h3>
        </div>
        <Link
          to="/Achievements?tab=badges"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-accent)] hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--pf-accent)]" />
        </div>
      ) : shown.length === 0 ? (
        <p className="py-4 text-[12px] leading-[1.5] text-[var(--pf-muted)]">
          No badges yet. Complete learning and practice to start earning them.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((badge) => (
            <li
              key={badge.id}
              className="flex items-center gap-2.5 rounded-xl border border-[var(--pf-soft-border)] bg-[var(--pf-soft)] px-3 py-2.5"
            >
              {badge.template?.icon_url ? (
                <img
                  src={badge.template.icon_url}
                  alt=""
                  className="h-5 w-5 flex-shrink-0 rounded object-contain"
                />
              ) : (
                <Medal className="h-4 w-4 flex-shrink-0 text-violet-600 dark:text-violet-300" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-[var(--pf-text)]">
                  {badge.template?.badge_name || badge.description || "Badge"}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--pf-muted)]">
                  Earned {new Date(badge.earned_date).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {badges.length > shown.length && (
        <p className="mt-2 text-[11px] text-[var(--pf-muted)]">
          +{badges.length - shown.length} more badges earned
        </p>
      )}
    </section>
  );
}