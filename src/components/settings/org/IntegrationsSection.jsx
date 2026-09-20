import React from "react";
import { Plug } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SectionCard, SettingRow } from "./OrgControls";

const PROVIDERS = [
  { value: "googlecalendar", label: "Google Calendar" },
  { value: "outlook", label: "Outlook / Microsoft 365" },
  { value: "hubspot", label: "HubSpot" },
];

export default function IntegrationsSection({ settings, update, locks, toggleLock, canLock }) {
  const integ = settings.integrations || {};
  const set = (field, value) => update("integrations", field, value);
  const toggleProvider = (p) => {
    const current = integ.enabled_providers || [];
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    set("enabled_providers", next);
  };

  return (
    <SectionCard icon={Plug} title="Integrations" description="External providers that feed pattern detection and insights.">
      <div className="space-y-2">
        {PROVIDERS.map((p) => {
          const active = (integ.enabled_providers || []).includes(p.value);
          return (
            <div key={p.value} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-700">{p.label}</span>
              <Switch checked={active} onCheckedChange={() => toggleProvider(p.value)} />
            </div>
          );
        })}
      </div>
      <SettingRow
        label="Lock integration scope"
        description="Prevent lower-level admins from enabling or disabling providers."
        lockKey="integrations_providers"
        locked={locks.integrations_providers}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Switch checked={!!locks.integrations_providers} onCheckedChange={() => toggleLock("integrations_providers")} />
      </SettingRow>
    </SectionCard>
  );
}