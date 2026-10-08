import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Zap, Building2, Users, Target, Palette, CreditCard,
  Activity, Mail, Workflow, CheckCircle, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/useAuth";

// Management surfaces available to Platform Admins, rendered as a single
// cohesive "Platform Management" grid inside Settings > Platform.
const MANAGEMENT_CARDS = [
  {
    label: "Business Manager",
    description: "Manage clients & partners",
    icon: Building2,
    color: "text-purple-600",
    page: "BusinessManager",
  },
  {
    label: "User Management",
    description: "All platform users",
    icon: Users,
    color: "text-blue-600",
    page: "UserManagement",
  },
  {
    label: "Programs & Cohorts",
    description: "All platform programs",
    icon: Target,
    color: "text-orange-600",
    page: "DevelopmentManager",
  },
  {
    label: "White Label Settings",
    description: "Platform branding",
    icon: Palette,
    color: "text-pink-600",
    page: "WhiteLabel",
  },
  {
    label: "Payment Portal",
    description: "Manage all subscriptions",
    icon: CreditCard,
    color: "text-emerald-600",
    page: "Billing",
  },
  {
    label: "Stripe Diagnostics",
    description: "Payment system health",
    icon: Activity,
    color: "text-red-600",
    page: "StripeDiagnostic",
  },
  {
    label: "Email & Notification Templates",
    description: "System email templates",
    icon: Mail,
    color: "text-indigo-600",
    page: "EmailTemplates",
  },
  {
    label: "Automations",
    description: "Workflows & scheduled jobs",
    icon: Workflow,
    color: "text-amber-600",
    page: "Automations",
  },
  {
    label: "UAT Admin Dashboard",
    description: "Manage test cases",
    icon: CheckCircle,
    color: "text-indigo-600",
    page: "UATAdminDashboard",
  },
];

export default function PlatformTab() {
  const { user } = useAuth();
  const roleLabel =
    user?.app_role || user?.data?.app_role || user?.role || "Platform Administrator";

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Platform Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Platform-wide administration across all organizations
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          {roleLabel}
        </span>
      </div>

      {/* Management grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MANAGEMENT_CARDS.map(({ label, description, icon: Icon, color, page }) => (
          <Link
            key={page}
            to={createPageUrl(page)}
            className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white shadow-sm p-4 hover:border-purple-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3 min-w-0">
              <Icon className={`w-5 h-5 mt-0.5 ${color} shrink-0`} />
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate">{label}</div>
                <div className="text-xs text-gray-500 mt-1">{description}</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}