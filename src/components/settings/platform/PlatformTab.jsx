/**
 * PlatformTab — unified MVP-format card consolidating all platform
 * administration tools into Settings > Platform.
 */
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Building2,
  Users,
  Palette,
  CreditCard,
  Zap,
  ArrowRight,
} from "lucide-react";

const PLATFORM_TOOLS = [
  {
    label: "Business Manager",
    description: "Manage clients & partners",
    icon: Building2,
    color: "text-purple-600",
    to: "BusinessManager",
  },
  {
    label: "User Management",
    description: "All platform users",
    icon: Users,
    color: "text-blue-600",
    to: "UserManagement",
  },
  {
    label: "White Label Settings",
    description: "Platform branding & identity",
    icon: Palette,
    color: "text-pink-600",
    to: "WhiteLabel",
  },
  {
    label: "Payment Portal",
    description: "Manage all subscriptions & billing",
    icon: CreditCard,
    color: "text-emerald-600",
    to: "Billing",
  },
  {
    label: "Automations",
    description: "Workflow & trigger automation rules",
    icon: Zap,
    color: "text-amber-600",
    to: "Automations",
  },
];

export default function PlatformTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Platform Administration
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage all platform-wide tools, configurations, and operations from one place.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#0202ff]" />
            <h3 className="text-base font-semibold text-gray-900">
              Platform Management
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select a tool below to manage its settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {PLATFORM_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.to}
                to={createPageUrl(tool.to)}
                className="group flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3.5 transition-all hover:border-[#0202ff]/30 hover:bg-gray-50"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${tool.color}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {tool.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {tool.description}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400 transition-colors group-hover:text-[#0202ff]" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}