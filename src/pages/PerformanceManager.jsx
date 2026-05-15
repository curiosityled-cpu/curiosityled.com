import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2, Target } from "lucide-react";
import { motion } from "framer-motion";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import PerformanceOverviewTab from "@/components/performance-mgmt/PerformanceOverviewTab";
import GoalsAndOKRsTab from "@/components/performance-mgmt/GoalsAndOKRsTab";
const TABS = [
  { id: "overview", label: "Overview & Analytics", icon: BarChart2 },
  { id: "goals", label: "Goals & OKRs", icon: Target },
];

export default function PerformanceManager() {
  const { user, loading: authLoading } = useAuth();
  const [section, setSection] = useState("overview");
  const [fullUser, setFullUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setFullUser).catch(() => {});
  }, []);

  if (authLoading || !fullUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access Performance Management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MVPPageLayout
      title="Goal Manager"
      subtitle="Manage goals and OKRs across your organization"
    >
      {/* Tab navigation */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-lg transition-all whitespace-nowrap ${
                  section === tab.id
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab content */}
      <motion.div
        key={section}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {section === "overview" && <PerformanceOverviewTab user={fullUser} />}
        {section === "goals" && <GoalsAndOKRsTab user={fullUser} />}

      </motion.div>
    </MVPPageLayout>
  );
}