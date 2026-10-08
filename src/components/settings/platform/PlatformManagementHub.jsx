import React, { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { Building2, Users, Target, Palette, CreditCard, Activity, Mail } from "lucide-react";
import StripeDiagnosticsPanel from "./StripeDiagnosticsPanel";

// Lazy-load the existing management pages so they only mount when selected.
const LazyBusinessManager = lazy(() => import("@/pages/BusinessManager"));
const LazyUserManagement = lazy(() => import("@/pages/UserManagement"));
const LazyDevelopmentManager = lazy(() => import("@/pages/DevelopmentManager"));
const LazyWhiteLabel = lazy(() => import("@/pages/WhiteLabel"));
const LazyBilling = lazy(() => import("@/pages/Billing"));
const LazyEmailTemplates = lazy(() => import("@/pages/EmailTemplates"));
const LazyAutomations = lazy(() => import("@/pages/Automations"));

const COLOR_STYLES = {
  purple: { icon: "text-purple-600", hover: "hover:bg-purple-50 hover:border-purple-300" },
  blue: { icon: "text-blue-600", hover: "hover:bg-blue-50 hover:border-blue-300" },
  orange: { icon: "text-orange-600", hover: "hover:bg-orange-50 hover:border-orange-300" },
  pink: { icon: "text-pink-600", hover: "hover:bg-pink-50 hover:border-pink-300" },
  emerald: { icon: "text-emerald-600", hover: "hover:bg-emerald-50 hover:border-emerald-300" },
  red: { icon: "text-red-600", hover: "hover:bg-red-50 hover:border-red-300" },
  indigo: { icon: "text-indigo-600", hover: "hover:bg-indigo-50 hover:border-indigo-300" },
  amber: { icon: "text-amber-600", hover: "hover:bg-amber-50 hover:border-amber-300" },
};

const MODULES = [
  { id: "business", label: "Business Manager", desc: "Manage clients & partners", icon: Building2, color: "purple", component: LazyBusinessManager },
  { id: "users", label: "User Management", desc: "All platform users", icon: Users, color: "blue", component: LazyUserManagement },
  { id: "programs", label: "Programs & Cohorts", desc: "All platform programs", icon: Target, color: "orange", component: LazyDevelopmentManager },
  { id: "whitelabel", label: "White Label Settings", desc: "Platform branding", icon: Palette, color: "pink", component: LazyWhiteLabel },
  { id: "billing", label: "Payment Portal", desc: "Manage all subscriptions", icon: CreditCard, color: "emerald", component: LazyBilling },
  { id: "stripe", label: "Stripe Diagnostics", desc: "Payment system health", icon: Activity, color: "red", component: null },
  { id: "email", label: "Email & Notification Templates", desc: "Customize system emails", icon: Mail, color: "indigo", component: LazyEmailTemplates },
  { id: "automations", label: "Automations", desc: "Workflows & triggers", icon: Zap, color: "amber", component: LazyAutomations },
];

export default function PlatformManagementHub() {
  const [activeId, setActiveId] = useState(null);
  const active = MODULES.find((m) => m.id === activeId);

  if (active) {
    const Content = active.component;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setActiveId(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Platform Management
          </Button>
          <h2 className="text-lg font-semibold text-foreground">{active.label}</h2>
        </div>
        <div className="rounded-lg border bg-background overflow-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            }
          >
            {Content ? <Content /> : <StripeDiagnosticsPanel />}
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" /> Platform Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage clients, users, programs, branding, billing, and integrations — all from within the Platform tab.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const s = COLOR_STYLES[m.color];
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              className={`w-full text-left rounded-lg border bg-card p-4 transition-colors ${s.hover}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${s.icon}`} />
                  <div>
                    <div className="font-semibold text-foreground">{m.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}