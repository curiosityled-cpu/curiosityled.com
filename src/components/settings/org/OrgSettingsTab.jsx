import React, { useEffect, useState } from "react";
import { Building2, Loader2, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/useAuth";
import { useClient } from "@/components/contexts/ClientContext";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

import GoalsSection from "./GoalsSection";
import CompetencySection from "./CompetencySection";
import AssessmentSection from "./AssessmentSection";
import CoachingSection from "./CoachingSection";
import CheckInRhythmSection from "./CheckInRhythmSection";
import NotificationsSection from "./NotificationsSection";
import IntegrationsSection from "./IntegrationsSection";
import PrivacySection from "./PrivacySection";
import GamificationSection from "./GamificationSection";
import ReportingSection from "./ReportingSection";

export default function OrgSettingsTab() {
  const { user, isSuperAdmin, isHRAdmin } = useAuth();
  const { client, loading, refreshContext } = useClient();
  const [settings, setSettings] = useState(null);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState([]);
  const [competenciesConfigured, setCompetenciesConfigured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setSettings(client.settings || {});
      setSelectedCompetencyIds(client.selected_competency_ids || []);
      setCompetenciesConfigured(client.competencies_configured || false);
    }
  }, [client]);

  if (!isSuperAdmin && !isHRAdmin) {
    return (
      <Alert>
        <Lock className="w-4 h-4" />
        <AlertDescription>
          Organization settings are only available to Super Administrators and HR Administrators.
        </AlertDescription>
      </Alert>
    );
  }

  // ClientContext finished loading but no client was returned
  if (!loading && !client) {
    return (
      <Alert>
        <Lock className="w-4 h-4" />
        <AlertDescription>
          Could not load your organization.{" "}
          <button onClick={() => refreshContext()} className="underline font-medium">
            Try again
          </button>
          {" "}or contact support if the problem persists.
        </AlertDescription>
      </Alert>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const update = (section, field, value) =>
    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));

  const toggleLock = (key) =>
    setSettings((prev) => ({ ...prev, locks: { ...(prev.locks || {}), [key]: !prev.locks?.[key] } }));

  const handleSave = async () => {
    const clientId = client?.id || user?.client_id;
    if (!clientId) return;
    setSaving(true);
    try {
      await base44.entities.Client.update(clientId, {
        settings,
        selected_competency_ids: selectedCompetencyIds,
        competencies_configured: competenciesConfigured,
      });
      await refreshContext();
      toast.success("Organization settings saved");
    } catch (error) {
      toast.error("Failed to save organization settings");
    } finally {
      setSaving(false);
    }
  };

  const locks = settings.locks || {};
  const sharedProps = { settings, update, locks, toggleLock, canLock: true };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0202ff]" />
            Organization Settings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure how {client?.name || "your organization"} uses the platform. Toggle the lock icon on any setting to prevent users and lower-level admins from changing it.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" />Save Organization Settings</>
          )}
        </Button>
      </div>

      <GoalsSection {...sharedProps} />
      <CompetencySection
        selectedIds={selectedCompetencyIds}
        onSelectCompetencies={setSelectedCompetencyIds}
        competenciesConfigured={competenciesConfigured}
        onMarkConfigured={setCompetenciesConfigured}
        locks={locks}
        toggleLock={toggleLock}
        canLock
      />
      <AssessmentSection {...sharedProps} />
      <CoachingSection {...sharedProps} />
      {isSuperAdmin && <CheckInRhythmSection {...sharedProps} />}
      {isSuperAdmin && <NotificationsSection {...sharedProps} />}
      {isSuperAdmin && <IntegrationsSection {...sharedProps} />}
      {isSuperAdmin && <PrivacySection {...sharedProps} />}
      {isSuperAdmin && <GamificationSection {...sharedProps} />}
      {isSuperAdmin && <ReportingSection {...sharedProps} />}
    </div>
  );
}