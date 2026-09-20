import React from "react";
import { BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard, SettingRow } from "./OrgControls";

export default function AssessmentSection({ settings, update, locks, toggleLock, canLock }) {
  const a = settings.assessment || {};
  const set = (field, value) => update("assessment", field, value);

  return (
    <SectionCard icon={BarChart3} title="Assessment Cadence & Scope" description="Baseline, reassessment rhythm, 360° feedback, and scoring scale.">
      <SettingRow
        label="Require baseline at onboarding"
        description="New users must complete a baseline assessment when they join."
        lockKey="assessment_baseline"
        locked={locks.assessment_baseline}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Switch checked={a.require_baseline ?? true} onCheckedChange={(v) => set("require_baseline", v)} />
      </SettingRow>

      <SettingRow
        label="Reassessment cadence"
        description="How often reassessments run."
        lockKey="assessment_cadence"
        locked={locks.assessment_cadence}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={String(a.reassessment_cadence_months || 6)} onValueChange={(v) => set("reassessment_cadence_months", Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Every 3 months</SelectItem>
            <SelectItem value="6">Every 6 months</SelectItem>
            <SelectItem value="12">Annually</SelectItem>
            <SelectItem value="24">Every 2 years</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Enable 360° feedback"
        description="Allow multi-rater feedback on assessments."
        lockKey="assessment_360"
        locked={locks.assessment_360}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Switch checked={a.enable_360 ?? false} onCheckedChange={(v) => set("enable_360", v)} />
      </SettingRow>

      <SettingRow
        label="Scoring scale"
        description="The rating scale used across assessments."
        lockKey="assessment_scoring"
        locked={locks.assessment_scoring}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={String(a.scoring_scale || 5)} onValueChange={(v) => set("scoring_scale", Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">1–5</SelectItem>
            <SelectItem value="7">1–7</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SectionCard>
  );
}