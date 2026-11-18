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
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useActiveClientId } from "@/components/contexts/ClientContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getPreset,
  getEnabledMeasureKeys,
  DEFAULT_PRESET_ID,
} from "@/lib/checkInPresets";

export default function DefaultMeasuresCard() {
  const activeClientId = useActiveClientId();
  const queryClient = useQueryClient();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]);

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

  const orderedKeys = (keys) => measures.map((m) => m.key).filter((k) => keys.includes(k));
  const savedKeys = orderedKeys(enabled).join(",");
  const draftKeys = orderedKeys(selected).join(",");
  const dirty = draftKeys !== savedKeys;

  // Re-sync the draft whenever the stored configuration loads or changes.
  useEffect(() => {
    setSelected(enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, savedKeys]);

  const save = async () => {
    if (!client?.id || !dirty) return;
    setSaving(true);
    try {
      const settings = { ...(client.settings || {}) };
      settings.check_in_config = {
        ...(settings.check_in_config || {}),
        enabled_measures: orderedKeys(selected),
      };
      await base44.entities.Client.update(client.id, { settings });
      const stored = (await base44.entities.Client.get(client.id).catch(() => null)) || {
        ...client,
        settings,
      };
      setClient(stored);
      // The check-in screens resolve their measures from this cache, so drop it
      // and they pick the new selection up on the next check-in.
      queryClient.invalidateQueries({ queryKey: ["manager-preferences"] });
      toast.success("Standard measures saved");
    } catch (e) {
      toast.error("Could not save: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
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
            const on = selected.includes(m.key);
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

        {selected.length === 0 && (
          <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              No standard measures selected. Staff will only see the custom
              questions — make sure “Use Custom Questions” is on.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-border">
          <p className="text-[11px] text-muted-foreground">
            {saving
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : `${selected.length} of ${measures.length} measures on`}
          </p>
          <Button
            size="sm"
            onClick={save}
            disabled={!dirty || saving}
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}