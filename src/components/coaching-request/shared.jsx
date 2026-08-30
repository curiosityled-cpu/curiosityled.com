import {
  User, Users, Presentation, ClipboardCheck, MessageSquare,
  Clock, CalendarClock, CheckCircle2, UserPlus, Hand, XCircle,
  PlayCircle, Trophy, Ban
} from "lucide-react";

// Category → practitioner role mapping (category-split routing)
export const COACHING_CATEGORIES = ["1on1_coaching", "group_coaching", "team_coaching"];
export const CONSULTING_CATEGORIES = ["workshop", "consultation", "assessment"];

export const CATEGORY_CONFIG = {
  "1on1_coaching": { label: "1:1 Coaching", role: "Leadership Coach", icon: User, engagementType: "1on1_coaching", color: "text-blue-600" },
  "group_coaching": { label: "Group Coaching", role: "Leadership Coach", icon: Users, engagementType: "team_effectiveness", color: "text-indigo-600" },
  "team_coaching": { label: "Team Coaching", role: "Leadership Coach", icon: Users, engagementType: "team_effectiveness", color: "text-violet-600" },
  "workshop": { label: "Workshop", role: "Consultant", icon: Presentation, engagementType: "leadership_development", color: "text-amber-600" },
  "consultation": { label: "Consultation", role: "Consultant", icon: MessageSquare, engagementType: "career_coaching", color: "text-emerald-600" },
  "assessment": { label: "Assessment", role: "Consultant", icon: ClipboardCheck, engagementType: "performance_improvement", color: "text-rose-600" },
};

export const STATUS_CONFIG = {
  "submitted": { label: "Submitted", icon: Clock, badge: "bg-slate-100 text-slate-700 border-slate-200" },
  "intake_scheduled": { label: "Intake Scheduled", icon: CalendarClock, badge: "bg-blue-100 text-blue-700 border-blue-200" },
  "intake_complete": { label: "Intake Complete", icon: CheckCircle2, badge: "bg-sky-100 text-sky-700 border-sky-200" },
  "approved": { label: "Approved", icon: CheckCircle2, badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "assigned": { label: "Assigned", icon: UserPlus, badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  "accepted": { label: "Accepted", icon: Hand, badge: "bg-green-100 text-green-700 border-green-200" },
  "declined": { label: "Declined", icon: XCircle, badge: "bg-red-100 text-red-700 border-red-200" },
  "engagement_created": { label: "Engagement Created", icon: CheckCircle2, badge: "bg-teal-100 text-teal-700 border-teal-200" },
  "in_progress": { label: "In Progress", icon: PlayCircle, badge: "bg-amber-100 text-amber-700 border-amber-200" },
  "completed": { label: "Completed", icon: Trophy, badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "rejected": { label: "Rejected", icon: Ban, badge: "bg-red-100 text-red-700 border-red-200" },
};

export const SCOPE_CONFIG = {
  "individual": { label: "Individual" },
  "cohort": { label: "Cohort" },
  "team": { label: "Team" },
};

export const URGENCY_CONFIG = {
  "standard": { label: "Standard", badge: "bg-slate-100 text-slate-600" },
  "priority": { label: "Priority", badge: "bg-amber-100 text-amber-700" },
  "urgent": { label: "Urgent", badge: "bg-red-100 text-red-700" },
};

export const getRoleForCategory = (category) => CATEGORY_CONFIG[category]?.role || "Leadership Coach";
export const getEngagementTypeForCategory = (category) => CATEGORY_CONFIG[category]?.engagementType || "1on1_coaching";
export const isCoachingCategory = (category) => COACHING_CATEGORIES.includes(category);

export const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};