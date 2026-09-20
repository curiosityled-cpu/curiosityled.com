import React from "react";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard, SettingRow } from "./OrgControls";

const CHANNELS = [
  { value: "in_app", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "slack", label: "Slack" },
  { value: "push", label: "Mobile Push" },
];

export default function NotificationsSection({ settings, update, locks, toggleLock, canLock }) {
  const n = settings.notifications || {};
  const set = (field, value) => update("notifications", field, value);
  const toggleChannel = (ch) => {
    const current = n.enabled_channels || [];
    const next = current.includes(ch) ? current.filter((x) => x !== ch) : [...current, ch];
    set("enabled_channels", next);
  };

  return (
    <SectionCard icon={Bell} title="Notifications & Channels" description="Which notification channels are available org-wide and the default cadence.">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Available channels</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CHANNELS.map((ch) => {
            const active = (n.enabled_channels || []).includes(ch.value);
            return (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                  active ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                <span className={`text-sm ${active ? "text-[#0202ff] font-medium" : "text-gray-700"}`}>{ch.label}</span>
                <Switch checked={active} />
              </button>
            );
          })}
        </div>
      </div>

      <SettingRow
        label="Default cadence"
        description="How often notifications are delivered by default."
        lockKey="notifications_cadence"
        locked={locks.notifications_cadence}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={n.default_cadence || "instant"} onValueChange={(v) => set("default_cadence", v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="instant">Instant</SelectItem>
            <SelectItem value="daily">Daily digest</SelectItem>
            <SelectItem value="weekly">Weekly summary</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SectionCard>
  );
}