/**
 * DEMO SNAPSHOT DATA — for presentation screenshots only.
 * Toggle DEMO_SNAPSHOT_MODE in OrgInsightsView.jsx to enable/disable.
 * Remove this file and its imports when no longer needed.
 */

// 6 months of realistic DM / SI / Manager Effectiveness trend data
export const DEMO_TREND_DATA = [
  { month: 'Apr', assessmentScore: 68, dmScore: 64, siScore: 62, goalCompletion: 71, learningCompletion: 65 },
  { month: 'May', assessmentScore: 70, dmScore: 66, siScore: 64, goalCompletion: 73, learningCompletion: 68 },
  { month: 'Jun', assessmentScore: 72, dmScore: 69, siScore: 67, goalCompletion: 75, learningCompletion: 70 },
  { month: 'Jul', assessmentScore: 74, dmScore: 71, siScore: 70, goalCompletion: 78, learningCompletion: 74 },
  { month: 'Aug', assessmentScore: 76, dmScore: 73, siScore: 72, goalCompletion: 80, learningCompletion: 77 },
  { month: 'Sep', assessmentScore: 78, dmScore: 75, siScore: 74, goalCompletion: 82, learningCompletion: 80 },
];

// Realistic aggregate pulse data matching getOrgPulseAggregates response shape
export const DEMO_PULSE_AGGREGATES = {
  meta: {
    total_managers: 24,
    minimum_group_size: 5,
    data_freshness: 'Based on ManagerTrends last computed nightly',
    privacy_notice: 'All metrics are aggregate only. No individual manager data is included. Metrics below minimum group size are suppressed.',
  },
  energy: {
    distribution: { improving: 9, stable: 11, declining: 3, insufficient_data: 1 },
    stretched_frequently_pct: 38,
    note: 'Based on self-reported energy over 14 days. No individual attribution.',
  },
  overload: {
    risk_bands: { high: 4, moderate: 9, low: 11 },
    risk_trajectory: { increasing: 5, stable: 14, decreasing: 5 },
    note: 'Risk score computed from meeting load, self-report, and goal stagnation signals. No individual attribution.',
  },
  confidence: {
    distribution: { improving: 8, stable: 12, declining: 4 },
    declining_pct: 17,
    note: 'Self-reported confidence trend. Always private at individual level.',
  },
  resilience: {
    distribution: { improving: 7, stable: 13, declining: 4 },
    note: 'Self-reported resilience trend. Always private at individual level.',
  },
  development: {
    learning_stall_rate_pct: 25,
    delegation_gap_rate_pct: 33,
    note: 'Percentage of managers with learning inertia > 7 days or repeated delegation intention-action gaps.',
  },
  engagement: {
    check_in_engagement_rate_pct: 67,
    active_engagers: 16,
    note: 'Managers who completed ≥3 check-ins in the last 14 days.',
  },
  identity_friction: { rate_pct: 21, note: 'Aggregate rate of identity friction signals. Suppressed if group < 5.' },
};