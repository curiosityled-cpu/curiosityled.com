import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2, Target, Calendar, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import PerformanceOverviewTab from "@/components/performance-mgmt/PerformanceOverviewTab";
import ExpectationsTab from "@/components/performance-mgmt/ExpectationsTab";
import OneOnOnesTab from "@/components/performance-mgmt/OneOnOnesTab";
import ReviewsTabContent from "@/components/performance-mgmt/ReviewsTabContent";
import TeamCockpit from "@/components/performance-mgmt/TeamCockpit";
import { useCoachCoacheeScope } from "@/hooks/useCoachCoacheeScope";

const TABS = [
  { id: "expectations", label: "Expectations", icon: Target },
  { id: "checkins", label: "Check-Ins", icon: Calendar },
  { id: "reviews", label: "Reviews", icon: ClipboardList },
  { id: "overview", label: "Overview", icon: BarChart2 },
];

export default function PerformanceManager() {
  const { user, loading: authLoading } = useAuth();
  const { coacheeEmails } = useCoachCoacheeScope(user);
  const [section, setSection] = useState("expectations");
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
      title="Performance"
      subtitle="Goals, reviews, check-ins, and evidence — unified"
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
        {section === "expectations" && <ExpectationsTab user={fullUser} />}
        {section === "checkins" && <OneOnOnesTab user={fullUser} />}
        {section === "reviews" && <ReviewsTabContent user={fullUser} />}
        {section === "overview" && (
          <div className="space-y-4">
            <PerformanceOverviewTab user={fullUser} coacheeEmails={coacheeEmails} />
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Team Cockpit</h3>
              <TeamCockpit user={fullUser} />
            </div>
          </div>
        )}
      </motion.div>
    </MVPPageLayout>
  );
}