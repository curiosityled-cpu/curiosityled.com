import React from "react";
import { Building2, Users, Palette, CreditCard, Zap } from "lucide-react";
import PlatformCollapsibleSection from "./PlatformCollapsibleSection";
import BusinessManager from "@/pages/BusinessManager";
import UserManagement from "@/pages/UserManagement";
import WhiteLabel from "@/pages/WhiteLabel";
import Billing from "@/pages/Billing";
import Automations from "@/pages/Automations";

export default function PlatformTab() {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#0202ff]" />
          Platform Administration
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage all platform-wide tools and configurations. Expand a section to manage it inline.
        </p>
      </div>

      <PlatformCollapsibleSection
        icon={Building2}
        iconColor="text-purple-600"
        title="Business Manager"
        description="Manage clients, partners, and business operations"
      >
        <BusinessManager embedded />
      </PlatformCollapsibleSection>

      <PlatformCollapsibleSection
        icon={Users}
        iconColor="text-blue-600"
        title="User Management"
        description="All platform users, roles, and permissions"
      >
        <UserManagement embedded />
      </PlatformCollapsibleSection>

      <PlatformCollapsibleSection
        icon={Palette}
        iconColor="text-pink-600"
        title="White Label Settings"
        description="Platform branding, identity, and appearance"
      >
        <WhiteLabel embedded />
      </PlatformCollapsibleSection>

      <PlatformCollapsibleSection
        icon={CreditCard}
        iconColor="text-emerald-600"
        title="Payment Portal"
        description="Manage subscriptions, billing, and invoices"
      >
        <Billing embedded />
      </PlatformCollapsibleSection>

      <PlatformCollapsibleSection
        icon={Zap}
        iconColor="text-amber-600"
        title="Automations"
        description="Workflow and trigger automation rules"
      >
        <Automations embedded />
      </PlatformCollapsibleSection>
    </div>
  );
}