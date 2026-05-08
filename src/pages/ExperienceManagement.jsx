import React, { useState, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Map, Users, ClipboardList, Settings2 } from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { getMVPRole } from "@/components/mvp/MVPLayout";
import { useLocation, useNavigate } from "react-router-dom";

// Lazy load heavy components
const BuildersHub = lazy(() => import("@/components/experiences/BuildersHub"));
const JourneyManagementDashboard = lazy(() => import("@/components/program-manager/JourneyManagementDashboard"));

const SUB_NAV = [
  { id: 'overview', label: 'Experience Management', icon: Settings2 },
  { id: 'journeys', label: 'Journeys', icon: Map },
  { id: 'programs', label: 'Programs', icon: Users },
  { id: 'requests', label: 'Requests', icon: ClipboardList },
];

export default function ExperienceManagement() {
  const { user, hasPermission, roleDisplayName, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mvpRole = getMVPRole(user?.app_role);

  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    const valid = SUB_NAV.map(s => s.id);
    return valid.includes(hash) ? hash : 'journeys';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleTabClick = (id) => {
    if (id === 'requests') {
      navigate('/RequestDashboard');
      return;
    }
    setActiveTab(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (!user || !hasPermission('experiences.manage_org')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-500">You don't have permission to access Experience Management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Experience Management</h1>
              <p className="text-gray-500 mt-1 text-sm">Create, deploy, and manage learning experiences across your organization</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#0202ff]/20 bg-[#0202ff]/5 text-[#0202ff] text-xs font-medium">
              {roleDisplayName}
            </span>
          </div>

          {/* Sub Navigation */}
          <div className="flex gap-1 overflow-x-auto">
            {SUB_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.id !== 'requests' && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-[#0202ff] text-[#0202ff]'
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-[#0202ff]" />
          </div>
        }>
          {activeTab === 'overview' && (
            <BuildersHub />
          )}

          {activeTab === 'journeys' && (
            <JourneyManagementDashboard initialSubTab="journeys" />
          )}

          {activeTab === 'programs' && (
            <JourneyManagementDashboard initialSubTab="programs" />
          )}
        </Suspense>
      </div>
    </div>
  );
}