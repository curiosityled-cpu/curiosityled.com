import React from "react";
import { Trophy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard, SettingRow } from "./OrgControls";

export default function GamificationSection({ settings, update, locks, toggleLock, canLock }) {
  const g = settings.gamification || {};
  const set = (field, value) => update("gamification", field, value);

  return (
    <SectionCard icon={Trophy} title="Gamification" description="Points, levels, and leaderboard visibility.">
      <SettingRow
        label="Enable gamification"
        description="Turn points, levels, and leaderboards on or off org-wide."
        lockKey="gamification_enabled"
        locked={locks.gamification_enabled}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Switch checked={g.enabled ?? true} onCheckedChange={(v) => set("enabled", v)} />
      </SettingRow>

      <SettingRow
        label="Leaderboard scope"
        description="How broadly leaderboards are visible."
        lockKey="gamification_scope"
        locked={locks.gamification_scope}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={g.leaderboard_scope || "team_scoped"} onValueChange={(v) => set("leaderboard_scope", v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="org_wide">Org-wide</SelectItem>
            <SelectItem value="team_scoped">Team-scoped</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SectionCard>
  );
}