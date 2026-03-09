import React from "react";
import { useAuth } from "@/components/useAuth";
import TeamLeaderAnalytics from "./analytics/TeamLeaderAnalytics";
import AnalystAnalytics from "./analytics/AnalystAnalytics";
import ProgramAdminAnalytics from "./analytics/ProgramAdminAnalytics";
import HRAdminAnalytics from "./analytics/HRAdminAnalytics";
import SuperAdminAnalytics from "./analytics/SuperAdminAnalytics";
import PartnerAdminAnalytics from "./analytics/PartnerAdminAnalytics";
import PlatformAdminAnalytics from "./analytics/PlatformAdminAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function PerformanceAnalytics() {
  const { user, appRole } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Route to appropriate analytics view based on role
  switch (appRole) {
    case 'User Level 2':
      return <TeamLeaderAnalytics user={user} />;
    
    case 'Analyst':
      return <AnalystAnalytics user={user} />;
    
    case 'Admin Level 1':
      return <ProgramAdminAnalytics user={user} />;
    
    case 'Admin Level 2':
      return <HRAdminAnalytics user={user} />;
    
    case 'Super Administrator':
      return <SuperAdminAnalytics user={user} />;
    
    case 'Partner Business Administrator':
      return <PartnerAdminAnalytics user={user} />;
    
    case 'Platform Admin':
      return <PlatformAdminAnalytics />;
    
    case 'User Level 1':
    default:
      return (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Analytics Not Available
            </h3>
            <p className="text-sm text-blue-700">
              Performance analytics are available for Team Leaders and above.
              Focus on managing your personal goals in the Performance Management tab.
            </p>
          </CardContent>
        </Card>
      );
  }
}