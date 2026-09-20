import React from "react";
import { Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SectionCard, SettingRow } from "./OrgControls";

export default function GoalsSection({ settings, update, locks, toggleLock, canLock }) {
  const goals = settings.goals || {};
  const set = (field, value) => update("goals", field, value);

  return (
    <SectionCard icon={Target} title="Performance & Goals" description="How your organization sets and reviews goals.">
      <SettingRow
        label="Goal framework"
        description="The operating model your teams use for performance goals."
        lockKey="goals_framework"
        locked={locks.goals_framework}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={goals.framework || "goals"} onValueChange={(v) => set("framework", v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="goals">Goals</SelectItem>
            <SelectItem value="kpis">KPIs</SelectItem>
            <SelectItem value="okrs">OKRs</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Cascade goals"
        description="Allow goals to cascade from org → team → individual."
        lockKey="goals_cascade"
        locked={locks.goals_cascade}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Switch checked={goals.cascade_enabled ?? true} onCheckedChange={(v) => set("cascade_enabled", v)} />
      </SettingRow>

      <SettingRow
        label="Review cadence"
        description="How often goals are reviewed by default."
        lockKey="goals_review_cadence"
        locked={locks.goals_review_cadence}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={goals.review_cadence || "monthly"} onValueChange={(v) => set("review_cadence", v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Biweekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Require manager approval"
        description="Managers must approve before a goal is committed."
        lockKey="goals_require_approval"
        locked={locks.goals_require_approval}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Switch checked={goals.require_manager_approval ?? false} onCheckedChange={(v) => set("require_manager_approval", v)} />
      </SettingRow>
    </SectionCard>
  );
}