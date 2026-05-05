import React, { useState } from "react";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Settings2 } from "lucide-react";
import ExecutiveDashboardView from "@/components/dashboard/leadership/ExecutiveDashboardView";
import HRAdminDashboardView from "@/components/dashboard/leadership/HRAdminDashboardView";

const EXEC_ROLES = ['Platform Admin', 'Super Administrator', 'Executive', 'Partner Business Administrator'];
const HR_ROLES = ['Admin Level 2', 'Admin Level 1', 'Analyst'];

function LeadershipDashboard() {
  const { user, appRole } = useAuth();

  const isExec = EXEC_ROLES.includes(appRole);
  const isHR = HR_ROLES.includes(appRole);

  // Default view: exec roles see Executive, HR roles see HR Admin, others see Executive
  const defaultView = isHR && !isExec ? 'hr' : 'executive';
  const [activeView, setActiveView] = useState(defaultView);

  const canToggle = isExec && isHR || appRole === 'Platform Admin' || appRole === 'Super Administrator' || appRole === 'Admin Level 2';

  return (
    <MVPPageLayout
      title="Leadership Intelligence Hub"
      subtitle={activeView === 'executive' ? 'Strategic overview for executive leadership' : 'Diagnostic intelligence for HR administrators'}
      action={
        <div className="flex items-center gap-2">
          {(isExec || isHR) && (
            <>
              <Button
                variant={activeView === 'executive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('executive')}
                className="flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Executive View
              </Button>
              {(isHR || appRole === 'Platform Admin' || appRole === 'Super Administrator') && (
                <Button
                  variant={activeView === 'hr' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('hr')}
                  className="flex items-center gap-2"
                >
                  <Settings2 className="w-4 h-4" />
                  HR Admin View
                </Button>
              )}
            </>
          )}
        </div>
      }
    >
      {activeView === 'executive' ? (
        <ExecutiveDashboardView user={user} appRole={appRole} />
      ) : (
        <HRAdminDashboardView user={user} appRole={appRole} />
      )}
    </MVPPageLayout>
  );
}

export default withAuthProtection(LeadershipDashboard, [
  'Platform Admin',
  'Super Administrator',
  'Partner Business Administrator',
  'Analyst',
  'Executive',
  'Admin Level 1',
  'Admin Level 2',
]);