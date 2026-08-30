import React from "react";
import { Badge } from "@/components/ui/badge";

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

export const PRIORITY_LABELS = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'urgent': 'Urgent',
};

const CATEGORY_COLORS = {
  '1on1_coaching': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'group_coaching': 'bg-violet-50 text-violet-700 border-violet-200',
  'team_coaching': 'bg-purple-50 text-purple-700 border-purple-200',
  'workshop': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'consultation': 'bg-amber-50 text-amber-700 border-amber-200',
  'assessment': 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_COLORS = {
  'submitted': 'bg-slate-100 text-slate-700 border-slate-200',
  'intake_scheduled': 'bg-blue-50 text-blue-700 border-blue-200',
  'intake_complete': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'approved': 'bg-teal-50 text-teal-700 border-teal-200',
  'assigned': 'bg-orange-50 text-orange-700 border-orange-200',
  'accepted': 'bg-green-50 text-green-700 border-green-200',
  'declined': 'bg-red-50 text-red-700 border-red-200',
  'engagement_created': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'in_progress': 'bg-violet-50 text-violet-700 border-violet-200',
  'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'rejected': 'bg-red-100 text-red-800 border-red-200',
};

const PRIORITY_COLORS = {
  'low': 'bg-slate-50 text-slate-600 border-slate-200',
  'medium': 'bg-blue-50 text-blue-700 border-blue-200',
  'high': 'bg-amber-50 text-amber-700 border-amber-200',
  'urgent': 'bg-red-50 text-red-700 border-red-200',
};

export function CategoryBadge({ category, className = "" }) {
  const color = CATEGORY_COLORS[category] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${color} ${className}`}>
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

export function StatusBadge({ status, className = "" }) {
  const color = STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${color} ${className}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority, className = "" }) {
  if (!priority) return null;
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${color} ${className}`}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}