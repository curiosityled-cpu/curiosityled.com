import React, { useState, useEffect, useCallback } from "react";
import { Repeat, Plus, ChevronRight, Calendar, CheckCircle2 } from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection,
  SuccessionLoading,
  SuccessionError,
  SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STAGE_ORDER = [
  "framing",
  "focus",
  "blueprint",
  "discover",
  "evidence",
  "deliberate",
  "accelerate",
  "transition",
  "monitor",
  "closed",
];

const STAGE_LABELS = {
  framing: "Frame",
  focus: "Focus",
  blueprint: "Blueprint",
  discover: "Discover",
  evidence: "Evidence",
  deliberate: "Deliberate",
  accelerate: "Accelerate",
  transition: "Transition",
  monitor: "Monitor",
  closed: "Closed",
};

export default function CyclesView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const canManage = hasPermission("succession.cycles.manage");

  const fetchCycles = useCallback(async () => {
    try {
      const data = await invoke("successionListCycles", {});
      setCycles(data?.cycles || []);
    } catch {
      /* error handled by hook */
    }
  }, [invoke]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const handleCreate = async (formData) => {
    const opId = `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateCycle", {
        operation_id: opId,
        cycle_key: formData.cycle_key,
        name: formData.name,
      });
      setShowCreate(false);
      await fetchCycles();
    } catch {
      /* error handled by hook */
    }
  };

  const handleAdvanceStage = async (cycleId, currentStatus) => {
    const idx = STAGE_ORDER.indexOf(currentStatus);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return;
    const nextStatus = STAGE_ORDER[idx + 1];
    const opId = `cycle-advance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionUpdateDraftCycle", {
        operation_id: opId,
        cycle_id: cycleId,
        new_status: nextStatus,
      });
      await fetchCycles();
      if (selectedCycle?.id === cycleId) {
        setSelectedCycle((prev) => ({ ...prev, status: nextStatus }));
      }
    } catch {
      /* error handled by hook */
    }
  };

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection
        icon={Repeat}
        title="Succession Cycles"
        action={
          canManage && (
            <Button
              size="sm"
              onClick={() => setShowCreate((s) => !s)}
              className="h-7 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Cycle
            </Button>
          )
        }
      >
        {showCreate && canManage && (
          <CreateCycleForm onSubmit={handleCreate} loading={loading} onCancel={() => setShowCreate(false)} />
        )}

        {loading && cycles.length === 0 ? (
          <SuccessionLoading />
        ) : cycles.length === 0 ? (
          <SuccessionEmpty
            icon={Repeat}
            title="No succession cycles yet"
            subtitle="Create a cycle to begin framing critical roles and discovering successors."
          />
        ) : (
          <div className="space-y-2">
            {cycles.map((cycle) => (
              <CycleRow
                key={cycle.id}
                cycle={cycle}
                isSelected={selectedCycle?.id === cycle.id}
                canManage={canManage}
                onSelect={() =>
                  setSelectedCycle((prev) => (prev?.id === cycle.id ? null : cycle))
                }
                onAdvance={() => handleAdvanceStage(cycle.id, cycle.status)}
                loading={loading}
              />
            ))}
          </div>
        )}
      </SuccessionSection>

      {selectedCycle && (
        <SuccessionSection icon={Calendar} title="Cycle Details">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailField label="Cycle Key" value={selectedCycle.cycle_key} />
            <DetailField label="Name" value={selectedCycle.name} />
            <DetailField
              label="Current Stage"
              value={STAGE_LABELS[selectedCycle.status] || selectedCycle.status}
            />
            <DetailField
              label="Started"
              value={selectedCycle.started_at ? new Date(selectedCycle.started_at).toLocaleDateString() : "—"}
            />
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {STAGE_ORDER.slice(0, -1).map((stage, i) => {
                const currentIdx = STAGE_ORDER.indexOf(selectedCycle.status);
                const isComplete = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={stage} className="flex items-center">
                    <div
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        isCurrent
                          ? "bg-[#0202ff] text-white"
                          : isComplete
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-50 text-gray-400 border border-gray-200"
                      }`}
                    >
                      {isComplete && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {STAGE_LABELS[stage]}
                    </div>
                    {i < STAGE_ORDER.length - 2 && (
                      <ChevronRight className="w-3 h-3 text-gray-300 mx-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SuccessionSection>
      )}
    </div>
  );
}

function CycleRow({ cycle, isSelected, canManage, onSelect, onAdvance, loading }) {
  const isClosed = cycle.status === "closed";
  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
        isSelected
          ? "border-[#0202ff] bg-[#0202ff]/5"
          : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{cycle.name}</p>
            <span className="text-xs text-gray-400 font-mono">{cycle.cycle_key}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isClosed
                  ? "bg-gray-100 text-gray-500"
                  : "bg-[#0202ff]/10 text-[#0202ff]"
              }`}
            >
              {STAGE_LABELS[cycle.status] || cycle.status}
            </span>
          </div>
        </div>
        {canManage && !isClosed && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-shrink-0"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance();
            }}
          >
            Advance Stage
          </Button>
        )}
      </div>
    </div>
  );
}

function CreateCycleForm({ onSubmit, loading, onCancel }) {
  const [formData, setFormData] = useState({ cycle_key: "", name: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cycle_key || !formData.name) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-600">Cycle Key *</Label>
          <Input
            className="mt-1 h-8 text-sm"
            placeholder="e.g. 2026-q4-succession"
            value={formData.cycle_key}
            onChange={(e) => setFormData((d) => ({ ...d, cycle_key: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Cycle Name *</Label>
          <Input
            className="mt-1 h-8 text-sm"
            placeholder="e.g. Q4 2026 Succession Review"
            value={formData.name}
            onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !formData.cycle_key || !formData.name}>
          Create Cycle
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || "—"}</p>
    </div>
  );
}