/**
 * group6AlertsCalendar.ts
 *
 * Group 6 flows: alerts / calendar.
 * - view_alerts: shows current pattern alerts from ManagerTrends
 * - meeting_prep: captures pre-meeting preparation (goal, key people, friction)
 *   and saves it as a Goal (goal_type: 'action_item') for tracking
 */

import type { Flow } from '../conversationStateMachine.ts';

const viewAlerts: Flow = {
  id: 'view_alerts',
  group: 6,
  name: 'View Pattern Alerts',
  trigger_keywords: ['alert', 'alerts', 'pattern', 'risk', 'overload', 'warning'],
  trigger_label: 'View My Alerts',
  trigger_icon: '⚠️',
  steps: [],
  async onComplete(serviceBase44, userEmail) {
    const trends = await serviceBase44.entities.ManagerTrends.filter(
      { user_email: userEmail },
      '-last_trend_computed_at', 1
    ).catch(() => []);

    const trend = trends[0];
    if (!trend) return '⚠️ No pattern data yet. Complete a few check-ins and I\'ll start showing you patterns.';

    const alerts: string[] = [];
    if (trend.energy_trend === 'declining') alerts.push('📉 Energy is declining');
    if (trend.confidence_trend === 'declining') alerts.push('📉 Confidence is declining');
    if (trend.overload_pattern_strength >= 60) alerts.push(`🔥 Overload pattern building (${trend.overload_pattern_strength}/100)`);
    if (trend.identity_friction_active) alerts.push('🔀 Identity friction detected');
    if (trend.learning_stall_detected) alerts.push(' plateau Learning stall detected');
    if (trend.workload_growth_divergence_days >= 3) alerts.push(`⚖️ Load/growth divergence (${trend.workload_growth_divergence_days} days)`);

    if (alerts.length === 0) return '✅ No active alerts. Your patterns look stable.';

    return `⚠️ Active alerts:\n${alerts.map(a => `  ${a}`).join('\n')}\n\nWant to explore any of these?`;
  },
};

const meetingPrep: Flow = {
  id: 'meeting_prep',
  group: 6,
  name: 'Pre-Meeting Prep',
  trigger_keywords: ['meeting prep', 'prepare for meeting', 'pre-meeting', 'before meeting', 'meeting ready'],
  trigger_label: 'Pre-Meeting Prep',
  trigger_icon: '🗓️',
  steps: [
    {
      id: 'meeting_subject',
      prompt: '🗓️ What meeting are you preparing for?',
      input_type: 'text',
      label: 'Meeting subject',
      placeholder: 'e.g. Q3 budget review with the board',
      field: 'meeting_subject',
    },
    {
      id: 'meeting_goal',
      prompt: 'What\'s your goal for this meeting?',
      input_type: 'text',
      label: 'Your goal',
      placeholder: 'e.g. Get alignment on the revised hiring plan',
      field: 'meeting_goal',
    },
    {
      id: 'key_people',
      prompt: 'Who are the key people in the room?',
      input_type: 'text',
      label: 'Key people',
      placeholder: 'Optional',
      field: 'key_people',
      optional: true,
    },
    {
      id: 'potential_friction',
      prompt: 'What friction or resistance do you expect?',
      input_type: 'text',
      label: 'Potential friction',
      placeholder: 'Optional',
      field: 'potential_friction',
      optional: true,
    },
  ],
  async onComplete(serviceBase44, userEmail, data) {
    const title = `Meeting prep: ${data.meeting_subject}`;
    const description = [
      `Goal: ${data.meeting_goal}`,
      data.key_people ? `Key people: ${data.key_people}` : '',
      data.potential_friction ? `Potential friction: ${data.potential_friction}` : '',
    ].filter(Boolean).join('\n');

    await serviceBase44.entities.Goal.create({
      title,
      description,
      goal_type: 'action_item',
      status: 'active',
      progress: 0,
    });

    return `🗓️ Meeting prep saved for "${data.meeting_subject}". Your goal: ${data.meeting_goal}. I'll check in after to see how it went.`;
  },
};

export const GROUP6_FLOWS: Flow[] = [viewAlerts, meetingPrep];