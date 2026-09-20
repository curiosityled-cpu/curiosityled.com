import React from "react";
import { Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { SectionCard, SettingRow } from "./OrgControls";

const ENGAGEMENT_TYPES = [
  { value: "1on1_coaching", label: "1:1 Coaching" },
  { value: "team_effectiveness", label: "Team Effectiveness" },
  { value: "leadership_development", label: "Leadership Development" },
  { value: "career_coaching", label: "Career Coaching" },
  { value: "performance_improvement", label: "Performance Improvement" },
  { value: "executive_coaching", label: "Executive Coaching" },
];

export default function CoachingSection({ settings, update, locks, toggleLock, canLock }) {
  const c = settings.coaching || {};
  const set = (field, value) => update("coaching", field, value);
  const toggleType = (type) => {
    const current = c.enabled_engagement_types || [];
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    set("enabled_engagement_types", next);
  };

  return (
    <SectionCard icon={Users} title="Coaching" description="Which engagement types are offered and default session parameters.">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Engagement types offered</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ENGAGEMENT_TYPES.map((t) => {
            const active = (c.enabled_engagement_types || []).includes(t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleType(t.value)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                  active ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                <span className={`text-sm ${active ? "text-[#0202ff] font-medium" : "text-gray-700"}`}>{t.label}</span>
                <Switch checked={active} />
              </button>
            );
          })}
        </div>
      </div>

      <SettingRow
        label="Default session count"
        description="Sessions per engagement by default."
        lockKey="coaching_sessions"
        locked={locks.coaching_sessions}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Input
          type="number"
          min={1}
          value={c.default_session_count ?? 6}
          onChange={(e) => set("default_session_count", Number(e.target.value))}
          className="w-24"
        />
      </SettingRow>

      <SettingRow
        label="Default session length (min)"
        description="Length of each coaching session."
        lockKey="coaching_sessions"
        locked={locks.coaching_sessions}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Input
          type="number"
          min={15}
          step={15}
          value={c.default_session_length_minutes ?? 60}
          onChange={(e) => set("default_session_length_minutes", Number(e.target.value))}
          className="w-24"
        />
      </SettingRow>

      <SettingRow
        label="Allow external coaches"
        description="Permit external coaches in addition to internal staff."
        lockKey="coaching_external"
        locked={locks.coaching_external}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Switch checked={c.allow_external_coaches ?? true} onCheckedChange={(v) => set("allow_external_coaches", v)} />
      </SettingRow>
    </SectionCard>
  );
}