import React from "react";
import { Target } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SectionCard, SettingRow } from "./OrgControls";

const FRAMEWORK_OPTIONS = [
  { value: "goals", label: "Goals" },
  { value: "kpis", label: "KPIs" },
  { value: "okrs", label: "OKRs" },
];

// Normalize legacy single-string values into an array for multi-select.
const normalizeFramework = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw) {
    if (raw === "hybrid") return ["goals", "kpis", "okrs"];
    return [raw];
  }
  return ["goals"];
};

export default function GoalsSection({ settings, update, locks, toggleLock, canLock }) {
  const goals = settings.goals || {};
  const set = (field, value) => update("goals", field, value);
  const frameworks = normalizeFramework(goals.framework);

  const toggleFramework = (value) => {
    const next = frameworks.includes(value)
      ? frameworks.filter((f) => f !== value)
      : [...frameworks, value];
    // Keep at least one framework selected.
    set("framework", next.length > 0 ? next : frameworks);
  };

  return (
    <SectionCard icon={Target} title="Performance & Goals" description="How your organization sets and reviews goals.">
      <SettingRow
        label="Goal framework"
        description="Select one or more frameworks your teams use for performance goals."
        lockKey="goals_framework"
        locked={locks.goals_framework}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <div className="flex flex-wrap gap-4">
          {FRAMEWORK_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                checked={frameworks.includes(opt.value)}
                onCheckedChange={() => toggleFramework(opt.value)}
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
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