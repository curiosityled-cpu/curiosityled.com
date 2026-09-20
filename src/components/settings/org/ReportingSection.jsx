import React from "react";
import { FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard, SettingRow } from "./OrgControls";

const FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (XLSX)" },
];

export default function ReportingSection({ settings, update, locks, toggleLock, canLock }) {
  const r = settings.reporting || {};
  const set = (field, value) => update("reporting", field, value);
  const toggleFormat = (f) => {
    const current = r.enabled_export_formats || [];
    const next = current.includes(f) ? current.filter((x) => x !== f) : [...current, f];
    set("enabled_export_formats", next);
  };

  return (
    <SectionCard icon={FileText} title="Reporting" description="Default analytics landing view and enabled export formats.">
      <SettingRow
        label="Default landing view"
        description="The analytics view users land on by default."
        lockKey="reporting_landing"
        locked={locks.reporting_landing}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Select value={r.default_landing_view || "org"} onValueChange={(v) => set("default_landing_view", v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="org">Organization</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Enabled export formats</p>
        <div className="space-y-2">
          {FORMATS.map((f) => {
            const active = (r.enabled_export_formats || []).includes(f.value);
            return (
              <div key={f.value} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-700">{f.label}</span>
                <Switch checked={active} onCheckedChange={() => toggleFormat(f.value)} />
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}