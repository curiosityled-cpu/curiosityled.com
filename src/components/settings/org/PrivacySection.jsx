import React from "react";
import { Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SectionCard, SettingRow } from "./OrgControls";

export default function PrivacySection({ settings, update, locks, toggleLock, canLock }) {
  const p = settings.privacy || {};
  const set = (field, value) => update("privacy", field, value);

  return (
    <SectionCard icon={Shield} title="Privacy & Visibility" description="Default confidentiality, HR visibility, and data retention.">
      <SettingRow
        label="Default confidentiality level"
        description="Default confidentiality for coaching engagements."
        lockKey="privacy_confidentiality"
        locked={locks.privacy_confidentiality}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={p.default_confidentiality_level || "confidential"} onValueChange={(v) => set("default_confidentiality_level", v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="confidential">Confidential</SelectItem>
            <SelectItem value="highly_confidential">Highly Confidential</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="HR visibility mode"
        description="Whether HR sees individual check-in data or only aggregates."
        lockKey="privacy_hr_visibility"
        locked={locks.privacy_hr_visibility}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={p.hr_visibility_mode || "aggregates_only"} onValueChange={(v) => set("hr_visibility_mode", v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aggregates_only">Aggregates only</SelectItem>
            <SelectItem value="individual">Individual data</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Data retention (days)"
        description="How long activity data is retained."
        lockKey="privacy_retention"
        locked={locks.privacy_retention}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Input
          type="number"
          min={30}
          value={p.data_retention_days ?? 90}
          onChange={(e) => set("data_retention_days", Number(e.target.value))}
          className="w-24"
        />
      </SettingRow>
    </SectionCard>
  );
}