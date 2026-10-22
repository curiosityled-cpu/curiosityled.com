import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Seeds the platform-default badge rules into BadgeTemplate — the table both the
 * badge gallery and the awarding engine (evaluateAllBadges / checkBadgeEligibility /
 * awardBadge) read from. Idempotent: existing rules with the same name are skipped,
 * so it is safe to re-run after adding new starter rules.
 *
 * criteria_type / criteria_config values must be ones checkBadgeEligibility can
 * evaluate: cumulative { total_points | courses_completed | resources_completed |
 * journeys_completed } or single_event { entity_type: 'Course' | 'Assessment' }.
 */

const DEFAULT_BADGE_RULES = [
  {
    badge_name: 'First Course Complete',
    description: 'Completed your first course',
    badge_category: 'completion',
    criteria_type: 'cumulative',
    criteria_config: {
      metric: 'courses_completed',
      target_value: 1,
      description: 'Complete your first course'
    },
    points_awarded: 50,
    rarity: 'common'
  },
  {
    badge_name: 'Three Courses Complete',
    description: 'Completed three courses',
    badge_category: 'completion',
    criteria_type: 'cumulative',
    criteria_config: {
      metric: 'courses_completed',
      target_value: 3,
      description: 'Complete three courses'
    },
    points_awarded: 150,
    rarity: 'uncommon'
  },
  {
    badge_name: 'First Resource Complete',
    description: 'Completed your first learning resource',
    badge_category: 'completion',
    criteria_type: 'cumulative',
    criteria_config: {
      metric: 'resources_completed',
      target_value: 1,
      description: 'Complete your first learning resource'
    },
    points_awarded: 25,
    rarity: 'common'
  },
  {
    badge_name: 'Five Resources Complete',
    description: 'Completed five learning resources',
    badge_category: 'completion',
    criteria_type: 'cumulative',
    criteria_config: {
      metric: 'resources_completed',
      target_value: 5,
      description: 'Complete five learning resources'
    },
    points_awarded: 100,
    rarity: 'uncommon'
  },
  {
    badge_name: 'Learning Path Finisher',
    description: 'Completed a learning path or curriculum',
    badge_category: 'milestone',
    criteria_type: 'cumulative',
    criteria_config: {
      metric: 'journeys_completed',
      target_value: 1,
      description: 'Complete a learning path'
    },
    points_awarded: 100,
    rarity: 'uncommon'
  },
  {
    badge_name: 'Learning Momentum',
    description: 'Earned 250 points',
    badge_category: 'milestone',
    criteria_type: 'cumulative',
    criteria_config: {
      metric: 'total_points',
      target_value: 250,
      description: 'Earn 250 points'
    },
    points_awarded: 0,
    rarity: 'common'
  },
  {
    badge_name: 'Committed Learner',
    description: 'Earned 1,000 points',
    badge_category: 'achievement',
    criteria_type: 'cumulative',
    criteria_config: {
      metric: 'total_points',
      target_value: 1000,
      description: 'Earn 1,000 points'
    },
    points_awarded: 0,
    rarity: 'rare'
  }
];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const isAdmin =
      user &&
      (user.role === 'admin' ||
        ['Platform Admin', 'Super Administrator'].includes(user.app_role));
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.BadgeTemplate.filter({
      is_platform_default: true
    });
    const existingNames = new Set(existing.map((b) => b.badge_name));

    const toCreate = DEFAULT_BADGE_RULES.filter((rule) => !existingNames.has(rule.badge_name));
    const created = toCreate.length
      ? await base44.asServiceRole.entities.BadgeTemplate.bulkCreate(
          toCreate.map((rule) => ({
            ...rule,
            is_active: true,
            is_platform_default: true
          }))
        )
      : [];

    return Response.json({
      success: true,
      created_count: created.length,
      already_present: DEFAULT_BADGE_RULES.length - toCreate.length,
      total_rules: DEFAULT_BADGE_RULES.length,
      rules: (Array.isArray(created) ? created : []).map((b) => b.badge_name)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}