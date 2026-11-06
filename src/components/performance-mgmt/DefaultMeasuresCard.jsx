/**
 * DefaultMeasuresCard — chooses which of the standard check-in measures
 * (Energy, Confidence, Focus, Load, Growth) appear in a check-in.
 *
 * Each measure is switched on or off on its own, so an organization can keep a
 * subset (say Energy and Load) and leave the rest out. Stored on the
 * organization as Client.settings.check_in_config.enabled_measures (an array of
 * measure keys). Absent means "all of them", so existing organizations are
 * unchanged; an empty array means no standard measures, which is how a
 * custom-questions-only check-in is configured.
 */
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useActiveClientId } from "@/components/contexts/ClientContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getPreset,
  getEnabledMeasureKeys,
  DEFAULT_PRESET_ID,
} from "@/lib/checkInPresets";

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

  const checkInConfig = client?.settings?.check_in_config || {};
  const presetId = checkInConfig.preset_id || DEFAULT_PRESET_ID;
  const measures = getPreset(presetId).measures;
  const enabled = getEnabledMeasureKeys(checkInConfig);

  const save = async (nextKeys) => {
    if (!client?.id) return;
    setSaving(true);
    try {
      const settings = { ...(client.settings || {}) };
      settings.check_in_config = {
        ...(settings.check_in_config || {}),
        enabled_measures: nextKeys,
        // The individual selection now decides which measures appear, so the
        // older "no measures at all" flag is retired here.
        ic_skip_measures: false,
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
          Standard measures
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Choose any combination of the five standard measures for this
          organization's check-ins. Switch a measure off to leave it out; custom
          questions are controlled separately below.
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
              No standard measures selected. Staff will only see the custom
              questions — make sure “Use Custom Questions” is on.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}