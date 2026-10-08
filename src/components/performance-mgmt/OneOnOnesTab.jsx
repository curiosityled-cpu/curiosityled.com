import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart2, Zap, Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";

import OneOnOneInsights from "./oneonone/OneOnOneInsights";
import CheckInHistory from "./oneonone/CheckInHistory";
import CheckInSetupTab from "./CheckInSetupTab";

const HR_ADMIN_ROLES = ["Admin Level 1", "Admin Level 2", "Super Administrator", "Partner Business Administrator", "Platform Admin"];

export default function OneOnOnesTab({ user }) {
  const userRole = user?.app_role || user?.data?.app_role || user?.role || "";
  const isHRAdmin = HR_ADMIN_ROLES.includes(userRole);
  const [activeTab, setActiveTab] = useState("checkin");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsersRes = await base44.functions.invoke("listAllUsers", {}).catch(() => null);
        const allUsers = allUsersRes?.data?.users || [];
        let usersToShow = allUsers;
        if (allUsers.length === 0) {
          try {
            const allUsersEntity = await base44.entities.User.list();
            usersToShow = allUsersEntity.map(u => ({
              email: u.email,
              full_name: u.data?.display_name || u.full_name || u.email,
              manager_email: u.data?.manager_email || u.manager_email,
              client_id: u.data?.client_id || u.client_id,
              current_role: u.data?.current_role,
              ...u.data,
            }));
          } catch {}
        }
        setUsers(usersToShow.filter(u => u.email !== user.email));
      } catch (e) { console.error(e); }
    };
    loadUsers();
  }, [user]);

  const teamMembers = users.filter(u =>
    u.manager_email === user.email ||
    u.data?.manager_email === user.email ||
    (user.subordinate_emails || []).includes(u.email)
  );

  const isManager = true;

  const SUB_TABS = [
    { id: "checkin", label: "Check-In", icon: Zap },
    ...(isHRAdmin ? [{ id: "setup", label: "Check-In Settings", icon: SettingsIcon }] : []),
    { id: "insights", label: "Insights", icon: BarChart2 },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg transition-all whitespace-nowrap ${active ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {activeTab === "checkin" && (
          <CheckInHistory user={user} />
        )}
        {activeTab === "setup" && isHRAdmin && (
          <CheckInSetupTab user={user} />
        )}
        {activeTab === "insights" && (
          <OneOnOneInsights user={user} teamMembers={teamMembers} isEmployee={!isManager} />
        )}
      </motion.div>
    </div>
  );
}