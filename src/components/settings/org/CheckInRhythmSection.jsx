import React from "react";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard, SettingRow } from "./OrgControls";
import { PRESET_LIST } from "@/lib/checkInPresets";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function CheckInRhythmSection({ settings, update, locks, toggleLock, canLock }) {
  const ci = settings.check_in_config || {};
  const set = (field, value) => update("check_in_config", field, value);

  return (
    <SectionCard icon={Clock} title="Check-in Rhythm" description="Default check-in preset, cadence, and weekly reflection for your organization.">
      <SettingRow
        label="Check-in preset"
        description="The question set new users start with."
        lockKey="check_in_preset"
        locked={locks.check_in_preset}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={ci.preset_id || "balance"} onValueChange={(v) => set("preset_id", v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESET_LIST.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Default cadence"
        description="How often new users are prompted to check in."
        lockKey="check_in_cadence"
        locked={locks.check_in_cadence}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={ci.default_cadence || "daily"} onValueChange={(v) => set("default_cadence", v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="every_other_day">Every other day</SelectItem>
            <SelectItem value="important_only">Only when it matters</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Weekly reflection day"
        description="Default day for the weekly rhythm reflection."
        lockKey="check_in_reflection_day"
        locked={locks.check_in_reflection_day}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={ci.weekly_reflection_day || "friday"} onValueChange={(v) => set("weekly_reflection_day", v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Proactivity level"
        description="How proactive Atreus is with check-ins."
        lockKey="check_in_preset"
        locked={locks.check_in_preset}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={ci.proactivity_level || "proactive"} onValueChange={(v) => set("proactivity_level", v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="reactive">Reactive</SelectItem>
            <SelectItem value="suggestive">Suggestive</SelectItem>
            <SelectItem value="proactive">Proactive</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SectionCard>
  );
}