import React from "react";
import { motion } from "framer-motion";
import ActionItemsSection from "./ActionItemsSection";
import ProgressSummarySection from "./ProgressSummarySection";
import QuickActionsBar from "./QuickActionsBar";
import InsightsSummarySection from "./InsightsSummarySection";

export default function UserDashboard({ user, dashboardData, loading }) {
  return (
    <div className="space-y-8">
      {/* Task-Driven Section - Top */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <QuickActionsBar dashboardData={dashboardData} />
        </motion.div>

        {/* Action Items - Notifications & Pending Tasks */}
        <ActionItemsSection user={user} />

        {/* Progress Summary Cards */}
        <ProgressSummarySection dashboardData={dashboardData} loading={loading} />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gradient-to-br from-slate-50 to-blue-50 px-4 text-sm text-gray-500">
            Insights & Recommendations
          </span>
        </div>
      </div>

      {/* Insight-Driven Section - Bottom */}
      <InsightsSummarySection user={user} dashboardData={dashboardData} />
    </div>
  );
}