import React, { useEffect, useState } from "react";
import { Layers, Check, Loader2, Lock, Unlock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CoreCompetenciesCard() {
  const { user } = useAuth();
  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const isSuperAdmin = appRole === "Super Administrator";
  const [competencies, setCompetencies] = useState([]);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    Promise.all([
      base44.entities.Competency.list().catch(() => []),
      base44.functions.invoke("getClientContext").catch(() => null),
    ])
      .then(([rows, res]) => {
        if (cancelled) return;
        const cli = res?.data?.data?.client || res?.data?.client || null;
        setCompetencies(rows || []);
        setClient(cli);
        setSelectedIds(cli?.selected_competency_ids || []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isSuperAdmin, user?.app_role, user?.data?.app_role, user?.role]);

  if (!isSuperAdmin) return null;

  const competencySetLocked = client?.settings?.locks?.competency_set;

  const toggleLock = async () => {
    if (!client) return;
    const currentLocks = client.settings?.locks || {};
    const nextLocks = { ...currentLocks, competency_set: !currentLocks.competency_set };
    setSaving(true);
    try {
      const updated = await base44.entities.Client.update(client.id, {
        settings: { ...client.settings, locks: nextLocks },
      });
      setClient(updated);
      toast.success(nextLocks.competency_set ? "Competency set locked" : "Competency set unlocked");
    } catch (e) {
      toast.error("Failed to update lock");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id) => {
    if (!client) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    setSaving(true);
    try {
      const updated = await base44.entities.Client.update(client.id, {
        selected_competency_ids: next,
        competencies_configured: next.length > 0,
      });
      setClient(updated);
      toast.success("Core competencies updated");
    } catch (e) {
      toast.error("Failed to update core competencies");
      setSelectedIds(client.selected_competency_ids || []);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Core Competencies
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#0202ff] bg-[#0202ff]/10 px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> Super Admin
          </span>
        </div>
        <button
          type="button"
          onClick={toggleLock}
          disabled={saving || !client}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors disabled:opacity-60 ${
            competencySetLocked
              ? "text-[#0202ff] bg-[#0202ff]/10"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title={competencySetLocked ? "Org override ON — users cannot change this" : "Lock as org override"}
        >
          {competencySetLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          {competencySetLocked ? "Locked" : "Lock"}
        </button>
      </div>

      <div className="p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          Pick the 3–5 competencies (plus Situational Intelligence) your organization measures against. These power development, assessments, and reporting across the platform.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !client ? (
          <p className="text-sm text-muted-foreground italic py-4">
            No client organization linked to your account.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {competencies.map((c) => {
              const selected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  disabled={saving}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all disabled:opacity-60 ${
                    selected
                      ? "border-[#0202ff] bg-[#0202ff]/5"
                      : "border-gray-200 hover:border-gray-300 bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                      selected ? "border-[#0202ff] bg-[#0202ff]" : "border-gray-300"
                    }`}
                  >
                    {selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`text-sm ${selected ? "text-[#0202ff] font-medium" : "text-gray-700"}`}>
                    {c.name || c.title || c.id}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {selectedIds.length} selected. Recommended: 3–5 core competencies plus Situational Intelligence.
          </p>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>
    </div>
  );
}