/**
 * DefaultMeasuresCard — chooses which of the standard check-in measures
 * (Energy, Confidence, Focus, Load, Growth) appear in a check-in.
 *
 * Stored on the organization as
 * Client.settings.check_in_config.enabled_measures (an array of measure keys).
 * Absent means "all of them", so existing organizations are unchanged.
 * An empty array means the standard measures are switched off entirely — the
 * check-in then shows only the custom questions.
 */
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useActiveClientId } from "@/components/contexts/ClientContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getPreset, DEFAULT_PRESET_ID } from "@/lib/checkInPresets";

export default function DefaultMeasuresCard() {
  const activeClientId = useActiveClientId();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeClientId) {
      setLoading(false);
      return;
    }
    try {
      const row = await base44.entities.Client.get(activeClientId).catch(() => null);
      setClient(row);
    } finally {
      setLoading(false);
    }
  }, [activeClientId]);

  useEffect(() => {
    load();
  }, [load]);

  const presetId = client?.settings?.check_in_config?.preset_id || DEFAULT_PRESET_ID;
  const measures = getPreset(presetId).measures;
  const stored = client?.settings?.check_in_config?.enabled_measures;
  const enabled = Array.isArray(stored)
    ? stored
    : measures.map((m) => m.key);

  const save = async (nextKeys) => {
    if (!client?.id) return;
    setSaving(true);
    try {
      const settings = { ...(client.settings || {}) };
      settings.check_in_config = {
        ...(settings.check_in_config || {}),
        enabled_measures: nextKeys,
      };
      await base44.entities.Client.update(client.id, { settings });
      setClient({ ...client, settings });
    } catch (e) {
      toast.error("Could not save: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key) => {
    const nextSet = new Set(enabled);
    if (nextSet.has(key)) nextSet.delete(key);
    else nextSet.add(key);
    save(measures.map((m) => m.key).filter((k) => nextSet.has(k)));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-[#0202ff]" />
        </CardContent>
      </Card>
    );
  }

  if (!client) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
          Select questions or measures
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          These are the standard measures in every check-in for this
          organization. Switch any off to leave it out — switch them all off to
          run a custom-questions-only check-in.
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          {measures.map((m) => {
            const on = enabled.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggle(m.key)}
                disabled={saving}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors disabled:opacity-60 ${
                  on
                    ? "border-[#0202ff] bg-[#0202ff]/5 text-foreground"
                    : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                <span className="text-base leading-none">{m.emoji}</span>
                <span className={on ? "font-medium" : ""}>{m.label}</span>
              </button>
            );
          })}
        </div>

        {enabled.length === 0 && (
          <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              No standard measures selected. Users will only see the custom
              questions you add below.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}