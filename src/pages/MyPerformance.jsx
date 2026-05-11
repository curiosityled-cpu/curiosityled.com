import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useSearchParams } from "react-router-dom";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Target, Users, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import GoalsAndOKRsTab from "@/components/performance-mgmt/GoalsAndOKRsTab";
import OneOnOnesTab from "@/components/performance-mgmt/OneOnOnesTab";

const USER_LEVEL_1_ROLES = ["User Level 1"];

function getTabs(appRole) {
  const isLevel1 = USER_LEVEL_1_ROLES.includes(appRole);
  const tabs = [];
  tabs.push({ id: "goals", label: "Goals & OKRs", icon: Target });
  tabs.push({ id: "1on1s", label: "1-on-1", icon: Users });
  return tabs;
}

export default function MyPerformance() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "goals");
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
      {(() => {
        const tabs = getTabs(fullUser?.app_role || fullUser?.data?.app_role);
        return (
          <>
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6 shadow-sm">
              {tabs.map(tab => {
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
              {activeTab === "goals" && (
                <GoalsAndOKRsTab user={fullUser} />
              )}
              {activeTab === "1on1s" && (
                <OneOnOnesTab user={fullUser} />
              )}
            </motion.div>
          </>
        );
      })()}
    </MVPPageLayout>
  );
}