import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Map, Users, BarChart3, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";

import MyJourneysView from "@/components/dashboard/journeys/MyJourneysView";
import TeamJourneysView from "@/components/dashboard/journeys/TeamJourneysView";
import JourneyAnalyticsView from "@/components/dashboard/journeys/JourneyAnalyticsView";

const VIEW_TABS = [
  { id: 'my', label: 'My Experiences', icon: Map },
  { id: 'team', label: 'Team Experiences', icon: Users },
  { id: 'analytics', label: 'Experience Analytics', icon: BarChart3 }
];

export default function JourneysOverview() {
  const { 
    user, 
    loading: authLoading,
    hasPermission, 
    hasTeamAccess, 
    hasOrgAnalyticsAccess,
    isManagerOfManagers,
    isOrgLeader,
    isProgramManager,
    isHRAdmin,
    isSuperAdmin,
    isPartnerBusinessAdmin,
    isPlatformAdmin
  } = useAuth();
  
  const [activeView, setActiveView] = useState('my');
  const [initialized, setInitialized] = useState(false);

  // Set initial view based on role after auth loads
  useEffect(() => {
    if (!authLoading && !initialized) {
      // Default analytics for higher-level roles
      if (isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin || isOrgLeader) {
        setActiveView('analytics');
      } else if (isManagerOfManagers || isProgramManager || isHRAdmin) {
        setActiveView('team');
      }
      setInitialized(true);
    }
  }, [authLoading, initialized, isPlatformAdmin, isSuperAdmin, isPartnerBusinessAdmin, isOrgLeader, isManagerOfManagers, isProgramManager, isHRAdmin]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  // Determine which tabs to show based on permissions
  const getAvailableTabs = () => {
    const tabs = [VIEW_TABS[0]]; // Always show My Journeys

    // Show Team Journeys for managers and above
    const canViewTeam = hasTeamAccess || 
      isManagerOfManagers || 
      isOrgLeader || 
      isProgramManager || 
      isHRAdmin || 
      isSuperAdmin || 
      isPartnerBusinessAdmin || 
      isPlatformAdmin ||
      hasPermission('team.journeys.view');

    if (canViewTeam) {
      tabs.push(VIEW_TABS[1]);
    }

    // Show Analytics for org leaders, admins, etc.
    const canViewAnalytics = hasOrgAnalyticsAccess || 
      isOrgLeader || 
      isProgramManager || 
      isHRAdmin || 
      isSuperAdmin || 
      isPartnerBusinessAdmin || 
      isPlatformAdmin ||
      hasPermission('analytics.journeys.view');

    if (canViewAnalytics) {
      tabs.push(VIEW_TABS[2]);
    }

    return tabs;
  };

  const availableTabs = getAvailableTabs();

  // Ensure active view is valid
  const currentView = availableTabs.find(t => t.id === activeView) ? activeView : 'my';

  const renderContent = () => {
    switch (currentView) {
      case 'team':
        return <TeamJourneysView />;
      case 'analytics':
        return <JourneyAnalyticsView />;
      default:
        return <MyJourneysView />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 sm:p-6 shadow-lg"
        style={{ backgroundColor: '#0202ff' }}
      >
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Learning Experiences</h2>
        <p className="text-white opacity-90 mb-4 text-sm sm:text-base">
          Track progress and manage learning programs
        </p>

        {/* View Toggle Tabs */}
        {availableTabs.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentView === tab.id;
              
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView(tab.id)}
                  className={`flex items-center gap-2 transition-all ${
                    isActive 
                      ? 'bg-white text-gray-900 hover:bg-gray-100' 
                      : 'text-white hover:bg-white/20 border border-white/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Content based on active view */}
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}