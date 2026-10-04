import {
  Award, Target, BookOpen, Users, TrendingUp, Building2, BarChart3,
  Sparkles, GraduationCap, UserCheck, Briefcase
} from "lucide-react";

export const AVAILABLE_METRICS = [
  { id: 'total_leaders', label: 'Total Leaders', category: 'Leadership' },
  { id: 'avg_leadership_score', label: 'Average Leadership Score', category: 'Leadership' },
  { id: 'at_risk_leaders', label: 'At-Risk Leaders', category: 'Leadership' },
  { id: 'high_potential_leaders', label: 'High-Potential Leaders', category: 'Leadership' },
  { id: 'goal_completion_rate', label: 'Goal Completion Rate', category: 'Goals' },
  { id: 'overdue_goals', label: 'Overdue Goals', category: 'Goals' },
  { id: 'total_goals', label: 'Total Goals', category: 'Goals' },
  { id: 'learning_completion_rate', label: 'Learning Completion Rate', category: 'Learning' },
  { id: 'total_learning', label: 'Total Learning Assignments', category: 'Learning' },
  { id: 'journey_completion_rate', label: 'Journey Completion Rate', category: 'Journeys' },
  { id: 'total_journeys', label: 'Total Journey Enrollments', category: 'Journeys' },
  { id: 'total_assessments', label: 'Total Assessments', category: 'Assessments' }
];

const ICON_MAP = {
  Award, Target, BookOpen, Users, TrendingUp, Building2, BarChart3,
  Sparkles, GraduationCap, UserCheck, Briefcase
};

export function getIconByName(name) {
  if (!name) return null;
  return ICON_MAP[name] || null;
}

export const BUILTIN_TEMPLATES = [
  {
    id: 'my_leadership_assessment_summary',
    name: 'My Leadership Assessment Summary',
    description: 'Personal leadership profile with overall score, SI score, top strengths, development areas, and current archetype',
    category: 'Individual Development',
    audience: 'User Level 1',
    icon: Award, color: 'bg-purple-500',
    estimatedTime: '1-2 min', frequency: 'On-demand',
    metrics: ['avg_leadership_score', 'total_assessments', 'high_potential_leaders', 'at_risk_leaders'],
    filters: { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'once'
  },
  {
    id: 'my_goal_progress',
    name: 'My Goal Progress Report',
    description: 'Track active goals, completed goals, goal completion rate, overdue goals, and progress on specific objectives',
    category: 'Individual Development',
    audience: 'User Level 1',
    icon: Target, color: 'bg-green-500',
    estimatedTime: '1 min', frequency: 'Weekly/Monthly',
    metrics: ['total_goals', 'goal_completion_rate', 'overdue_goals'],
    filters: { timeframe: '3months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'weekly'
  },
  {
    id: 'my_learning_journey',
    name: 'My Learning Journey Overview',
    description: 'Summary of assigned learning, completed courses, learning completion rate, and progress tracking',
    category: 'Individual Development',
    audience: 'User Level 1',
    icon: BookOpen, color: 'bg-blue-500',
    estimatedTime: '1 min', frequency: 'Monthly',
    metrics: ['total_learning', 'learning_completion_rate'],
    filters: { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'monthly'
  },
  {
    id: 'team_leadership_health',
    name: 'Team Leadership Health Report',
    description: 'Comprehensive view of team members, average team leadership score, at-risk leaders, high-potential leaders, and competency distribution',
    category: 'Team Performance',
    audience: 'User Level 2',
    icon: Users, color: 'bg-indigo-500',
    estimatedTime: '2-3 min', frequency: 'Weekly/Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'at_risk_leaders', 'high_potential_leaders'],
    filters: { timeframe: '6months', division: 'all', level: 'manager', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'weekly'
  },
  {
    id: 'team_development_progress',
    name: 'Team Development Progress',
    description: 'Track team goal completion rate, learning completion rate, overdue goals, and overall development momentum',
    category: 'Team Performance',
    audience: 'User Level 2',
    icon: TrendingUp, color: 'bg-emerald-500',
    estimatedTime: '2 min', frequency: 'Weekly',
    metrics: ['goal_completion_rate', 'learning_completion_rate', 'overdue_goals', 'total_goals', 'total_learning'],
    filters: { timeframe: '3months', division: 'all', level: 'manager', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'weekly'
  },
  {
    id: 'organizational_leadership_index',
    name: 'Organizational Leadership Index Summary',
    description: 'Executive-level view of overall org average leadership score, bench strength, ready-now leaders, high-potential leaders, and at-risk leaders',
    category: 'Organizational Strategy',
    audience: 'User Level 3',
    icon: Building2, color: 'bg-purple-600',
    estimatedTime: '3-5 min', frequency: 'Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'high_potential_leaders', 'at_risk_leaders', 'total_assessments'],
    filters: { timeframe: '12months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'monthly'
  },
  {
    id: 'competency_gap_analysis',
    name: 'Competency Gap Analysis',
    description: 'Identify organization-wide competency gaps with average scores for each competency and lowest-scoring areas',
    category: 'Organizational Strategy',
    audience: 'User Level 3',
    icon: BarChart3, color: 'bg-orange-500',
    estimatedTime: '3-4 min', frequency: 'Quarterly',
    metrics: ['avg_leadership_score', 'total_leaders', 'at_risk_leaders', 'total_assessments'],
    filters: { timeframe: '12months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'csv', schedule_interval: 'monthly'
  },
  {
    id: 'talent_pipeline_readiness',
    name: 'Talent Pipeline & Succession Readiness',
    description: 'Strategic view of pipeline strength, ready-now candidates for key roles, and high-potential leaders by level',
    category: 'Organizational Strategy',
    audience: 'User Level 3',
    icon: Award, color: 'bg-yellow-500',
    estimatedTime: '3-4 min', frequency: 'Monthly',
    metrics: ['high_potential_leaders', 'total_leaders', 'avg_leadership_score', 'at_risk_leaders'],
    filters: { timeframe: '12months', division: 'all', level: 'director', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'monthly'
  },
  {
    id: 'division_performance_comparison',
    name: 'Division Performance Comparison',
    description: 'Compare leadership performance across divisions with average scores, at-risk counts, and high-potential distribution',
    category: 'Organizational Strategy',
    audience: 'User Level 3',
    icon: TrendingUp, color: 'bg-blue-600',
    estimatedTime: '2-3 min', frequency: 'Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'at_risk_leaders', 'high_potential_leaders'],
    filters: { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'csv', schedule_interval: 'monthly'
  },
  {
    id: 'program_effectiveness',
    name: 'Program Effectiveness Report',
    description: 'Evaluate ROI of leadership development programs with participant completion rate, score improvement, and goal achievement',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: Target, color: 'bg-teal-500',
    estimatedTime: '3-4 min', frequency: 'Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'goal_completion_rate', 'learning_completion_rate', 'total_assessments'],
    filters: { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'monthly'
  },
  {
    id: 'platform_engagement_activity',
    name: 'User Engagement & Activity',
    description: 'Monitor platform adoption with total active users, new users, login frequency, and feature usage',
    category: 'Platform Administration',
    audience: 'Admin Level 2',
    icon: Users, color: 'bg-indigo-600',
    estimatedTime: '2 min', frequency: 'Weekly',
    metrics: ['total_leaders', 'total_assessments', 'total_goals', 'total_learning', 'total_journeys'],
    filters: { timeframe: '3months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'csv', schedule_interval: 'weekly'
  },
  {
    id: 'assessment_deployment_status',
    name: 'Assessment Deployment Status',
    description: 'Track assessment completion rates, outstanding assessments, and deployment effectiveness',
    category: 'Platform Administration',
    audience: 'Admin Level 2',
    icon: BarChart3, color: 'bg-purple-500',
    estimatedTime: '1-2 min', frequency: 'Weekly',
    metrics: ['total_assessments', 'total_leaders', 'avg_leadership_score'],
    filters: { timeframe: '3months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'weekly'
  },
  {
    id: 'executive_dashboard_summary',
    name: 'Executive Dashboard Summary',
    description: 'Complete organizational overview with all key metrics, trends, risks, and opportunities in a single comprehensive report',
    category: 'Executive Summary',
    audience: 'User Level 3',
    icon: Sparkles, color: 'bg-gradient-to-r from-purple-600 to-blue-600',
    estimatedTime: '5-7 min', frequency: 'Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'goal_completion_rate', 'learning_completion_rate', 'journey_completion_rate', 'at_risk_leaders', 'high_potential_leaders', 'overdue_goals', 'total_assessments', 'total_goals', 'total_learning', 'total_journeys'],
    filters: { timeframe: '12months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'monthly'
  },
  {
    id: 'program_class_attendance',
    name: 'Class Attendance Report',
    description: 'Detailed class attendance tracking including present, absent, late, and excused participants across all classes',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: GraduationCap, color: 'bg-indigo-500',
    estimatedTime: '2-3 min', frequency: 'Weekly',
    metrics: ['total_classes', 'total_participants', 'attendance_rate'],
    filters: { timeframe: '3months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'csv', schedule_interval: 'weekly'
  },
  {
    id: 'program_coaching_summary',
    name: 'Coaching Engagement Summary',
    description: 'Overview of all coaching engagements including session counts, completion rates, and participant progress',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: Users, color: 'bg-purple-500',
    estimatedTime: '2-3 min', frequency: 'Monthly',
    metrics: ['total_engagements', 'sessions_completed', 'coaching_completion_rate'],
    filters: { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'monthly'
  },
  {
    id: 'program_participant_progress',
    name: 'Participant Progress Report',
    description: 'Comprehensive view of participant enrollment, completion status, and progress across programs, classes, and coaching',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: UserCheck, color: 'bg-emerald-500',
    estimatedTime: '3-4 min', frequency: 'Weekly',
    metrics: ['total_participants', 'enrollment_rate', 'completion_rate', 'at_risk_participants'],
    filters: { timeframe: '3months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'weekly'
  },
  {
    id: 'program_certificate_issuance',
    name: 'Certificate Issuance Report',
    description: 'Track all certificates issued including type, recipient, and associated programs or classes',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: Award, color: 'bg-yellow-500',
    estimatedTime: '1-2 min', frequency: 'Monthly',
    metrics: ['certificates_issued', 'certificates_by_type', 'certificates_by_program'],
    filters: { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'csv', schedule_interval: 'monthly'
  },
  {
    id: 'program_overview_dashboard',
    name: 'Program Overview Dashboard',
    description: 'Executive summary of all program management activities including classes, coaching, participants, and certificates',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: Briefcase, color: 'bg-blue-600',
    estimatedTime: '3-5 min', frequency: 'Monthly',
    metrics: ['total_programs', 'total_classes', 'total_engagements', 'total_participants', 'certificates_issued', 'overall_completion_rate'],
    filters: { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' },
    output_format: 'pdf', schedule_interval: 'monthly'
  }
];

// Map custom template DB records to the same shape as built-in templates
export const normalizeCustomTemplate = (record) => ({
  id: record.id,
  name: record.title,
  description: record.description || '',
  category: record.category || 'Custom',
  audience: record.audience_role || 'User Level 3',
  icon: getIconByName(record.icon_name) || BarChart3,
  color: record.color || 'bg-[#0202ff]',
  estimatedTime: 'Varies',
  frequency: 'Configurable',
  metrics: record.metrics || [],
  filters: record.filters || { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' },
  output_format: record.output_format || 'pdf',
  schedule_interval: record.default_schedule_interval || 'once',
  is_custom: true,
  _record: record
});