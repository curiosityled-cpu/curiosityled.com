import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { BarChart2, Target, Users, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import GoalsAndOKRsTab from "@/components/performance-mgmt/GoalsAndOKRsTab";
import OneOnOnesTab from "@/components/performance-mgmt/OneOnOnesTab";
import PerformanceOverviewTab from "@/components/performance-mgmt/PerformanceOverviewTab";

const TABS = [
  { id: "overview", label: "Overview & Analytics", icon: BarChart2 },
  { id: "goals", label: "Goals & OKRs", icon: Target },
  { id: "1on1s", label: "1-on-1s", icon: Users },
];

export default function MyPerformance() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [fullUser, setFullUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await base44.auth.me();
        setFullUser(me);
      } catch (e) { console.error(e); }
    };
    if (user) loadUser();
  }, [user]);

  if (loading || !fullUser) {
    return (
      <MVPPageLayout title="My Performance" subtitle="Track your goals, 1-on-1s, and personal development">
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
        </div>
      </MVPPageLayout>
    );
  }

  return (
    <MVPPageLayout
      title="My Performance"
      subtitle="Track your goals, 1-on-1s, and personal development"
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6 shadow-sm">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: active ? "#0202ff" : "transparent",
                color: active ? "white" : "#6b7280",
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        {activeTab === "overview" && (
          <PerformanceOverviewTab user={fullUser} personalOnly />
        )}
        {activeTab === "goals" && (
          <GoalsAndOKRsTab user={fullUser} personalOnly />
        )}
        {activeTab === "1on1s" && (
          <OneOnOnesTab user={fullUser} />
        )}
      </motion.div>
    </MVPPageLayout>
  );
}