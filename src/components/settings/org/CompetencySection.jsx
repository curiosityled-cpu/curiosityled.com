import React, { useEffect, useState } from "react";
import { Layers, Loader2, Check } from "lucide-react";
import { SectionCard, SettingRow } from "./OrgControls";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

export default function CompetencySection({ selectedIds, onSelectCompetencies, competenciesConfigured, onMarkConfigured, locks, toggleLock, canLock }) {
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Competency.list()
      .then((rows) => setCompetencies(rows || []))
      .catch(() => setCompetencies([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    const next = selectedIds?.includes(id)
      ? (selectedIds || []).filter((x) => x !== id)
      : [...(selectedIds || []), id];
    onSelectCompetencies(next);
  };

  return (
    <SectionCard icon={Layers} title="Core Competencies" description="Pick the 3–5 competencies (plus Situational Intelligence) your organization measures against.">
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {competencies.map((c) => {
            const selected = selectedIds?.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${
                  selected ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? "border-[#0202ff] bg-[#0202ff]" : "border-gray-300"}`}>
                  {selected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className={`text-sm ${selected ? "text-[#0202ff] font-medium" : "text-gray-700"}`}>{c.name || c.title || c.id}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-500">
        {(selectedIds?.length || 0)} selected. Recommended: 3–5 core competencies plus Situational Intelligence.
      </p>
      <SettingRow
        label="Lock competency set"
        description="Prevent lower-level admins from changing this selection."
        lockKey="competency_set"
        locked={locks.competency_set}
        onToggleLock={toggleLock}
        canLock={canLock}
      >
        <Switch
          checked={competenciesConfigured}
          onCheckedChange={(v) => onMarkConfigured(v)}
        />
      </SettingRow>
    </SectionCard>
  );
}