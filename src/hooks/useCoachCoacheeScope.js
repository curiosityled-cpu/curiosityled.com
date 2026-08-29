import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Resolves the coachee scope for a Leadership Coach.
 *
 * If the current user is a Leadership Coach, fetches their active
 * CoachingEngagement records and collects all coachee emails
 * (1:1 coachee_email + team_member_emails). Other roles get an
 * empty list with isCoachScoped=false, so existing behavior is
 * unchanged.
 *
 * @param {object} user — current user from useAuth()
 * @returns {{ isCoachScoped: boolean, coacheeEmails: string[], loading: boolean }}
 */
export function useCoachCoacheeScope(user) {
  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const isCoach = appRole === 'Leadership Coach';
  const [coacheeEmails, setCoacheeEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCoach || !user?.email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const engagements = await base44.entities.CoachingEngagement.filter({
          coach_email: user.email,
          status: { $in: ['pending', 'active', 'on_hold', 'completed', 'terminated'] },
        });
        const emails = new Set();
        engagements.forEach((eng) => {
          if (eng.coachee_email) emails.add(eng.coachee_email);
          (eng.team_member_emails || []).forEach((e) => emails.add(e));
        });
        if (!cancelled) setCoacheeEmails([...emails]);
      } catch (e) {
        console.warn('Could not load coachee scope:', e?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCoach, user?.email]);

  return { isCoachScoped: isCoach, coacheeEmails, loading };
}