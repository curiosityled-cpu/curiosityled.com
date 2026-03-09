import React, { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Settings, AlertTriangle, X } from "lucide-react";
import { useCompetencies } from "@/components/contexts/CompetencyContext";
import { useAuth } from "@/components/useAuth";
import CompetencySelector from "@/components/admin/CompetencySelector";

export default function CompetencyConfigBanner({ className = "" }) {
  const { competenciesConfigured, loading } = useCompetencies();
  const { isSuperAdmin, isHRAdmin, isPartnerBusinessAdmin, isPlatformAdmin } = useAuth();
  const [showSelector, setShowSelector] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const canConfigure = isSuperAdmin || isHRAdmin || isPartnerBusinessAdmin || isPlatformAdmin;

  // Don't show if configured, loading, dismissed, or user can't configure
  if (competenciesConfigured || loading || dismissed || !canConfigure) {
    return null;
  }

  return (
    <>
      <Alert className={`bg-amber-50 border-amber-200 mb-6 ${className}`}>
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span className="text-amber-800">
            <strong>Action Required:</strong> Your organization hasn't configured core competencies yet. 
            Analytics are showing default competencies. Configure your organization's 3-5 core competencies to customize dashboards and reports.
          </span>
          <div className="flex items-center gap-2 ml-4">
            <Button 
              size="sm" 
              onClick={() => setShowSelector(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Now
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="text-amber-600 hover:text-amber-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <CompetencySelector 
        open={showSelector} 
        onOpenChange={setShowSelector}
      />
    </>
  );
}