// Shared routing logic for the clean-core coaching/consulting request system.
// Used by backend functions (manageCoachingRequest) and frontend pages.

export const COACHING_CATEGORIES = ['1on1_coaching', 'group_coaching', 'team_coaching'];
export const CONSULTING_CATEGORIES = ['workshop', 'consultation', 'assessment'];

export const ALL_CATEGORIES = [...COACHING_CATEGORIES, ...CONSULTING_CATEGORIES];

export function categoryToRole(category) {
  return COACHING_CATEGORIES.includes(category) ? 'Leadership Coach' : 'Consultant';
}

export function categoryToEngagementType(category) {
  const map = {
    '1on1_coaching': '1on1_coaching',
    'group_coaching': 'leadership_development',
    'team_coaching': 'team_effectiveness',
    'workshop': 'leadership_development',
    'consultation': 'career_coaching',
    'assessment': 'executive_coaching',
  };
  return map[category] || '1on1_coaching';
}

export const CATEGORY_LABELS = {
  '1on1_coaching': '1:1 Coaching',
  'group_coaching': 'Group Coaching',
  'team_coaching': 'Team Coaching',
  'workshop': 'Workshop',
  'consultation': 'Consultation',
  'assessment': 'Assessment',
};

export const STATUS_LABELS = {
  'submitted': 'Submitted',
  'intake_scheduled': 'Intake Scheduled',
  'intake_complete': 'Intake Complete',
  'approved': 'Approved',
  'assigned': 'Assigned',
  'accepted': 'Accepted',
  'declined': 'Declined',
  'engagement_created': 'Engagement Created',
  'in_progress': 'In Progress',
  'completed': 'Completed',
  'rejected': 'Rejected',
};

export const STATUS_FLOW = [
  'submitted',
  'intake_scheduled',
  'intake_complete',
  'approved',
  'assigned',
  'accepted',
  'engagement_created',
  'in_progress',
  'completed',
];

export const PRIORITY_LABELS = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'urgent': 'Urgent',
};

export const PRIORITY_COLORS = {
  'low': 'bg-slate-100 text-slate-600 border-slate-200',
  'medium': 'bg-blue-50 text-blue-700 border-blue-200',
  'high': 'bg-amber-50 text-amber-700 border-amber-200',
  'urgent': 'bg-red-50 text-red-700 border-red-200',
};