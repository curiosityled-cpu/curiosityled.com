import { base44 } from '@/api/base44Client';

/**
 * Load all DevelopmentExperiences and CoachingSessions linked to an engagement.
 * Returns { experiences, sessions } sorted newest-first.
 */
export async function loadEngagementChildren(engagementId) {
  if (!engagementId) return { experiences: [], sessions: [] };
  const [experiences, sessions] = await Promise.all([
    base44.entities.DevelopmentExperience.filter({ engagement_id: engagementId }, '-created_date'),
    base44.entities.CoachingSession.filter({ engagement_id: engagementId }, '-scheduled_date'),
  ]);
  return { experiences, sessions };
}

/**
 * Build a map of engagement_id -> engagement object for a list of experiences.
 * Fetches each unique engagement_id once. Missing engagements are skipped.
 */
export async function loadEngagementMap(engagementIds) {
  const unique = [...new Set((engagementIds || []).filter(Boolean))];
  if (unique.length === 0) return {};
  const results = await Promise.all(
    unique.map(id => base44.entities.CoachingEngagement.get(id).catch(() => null))
  );
  const map = {};
  results.forEach((eng, i) => {
    if (eng) map[unique[i]] = eng;
  });
  return map;
}

/**
 * Count sessions per engagement_id for a list of sessions.
 */
export function countSessionsByEngagement(sessions) {
  const counts = {};
  (sessions || []).forEach(s => {
    if (s.engagement_id) {
      counts[s.engagement_id] = (counts[s.engagement_id] || 0) + 1;
    }
  });
  return counts;
}