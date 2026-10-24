import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, AlertCircle, RefreshCw } from "lucide-react";
import TaxonomyValuesCard from "./TaxonomyValuesCard";
import TitleMappingCard from "./TitleMappingCard";
import ProfileConflictsCard from "./ProfileConflictsCard";
import ProfileFeedImportCard from "./ProfileFeedImportCard";

const EMPTY = { tiers: [], tracks: [], title_mappings: [] };

/** Admin surface for the role taxonomy, title mapping, and profile conflicts. */
export default function RoleTargetingTab({ user }) {
  const [overview, setOverview] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyConflict, setBusyConflict] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("getRoleTargetingOverview", {});
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setOverview(data);
      setDraft(data?.taxonomy || EMPTY);
      setError(null);
    } catch (e) {
      setError(e.message || "Could not load role targeting");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty =
    overview && JSON.stringify(overview.taxonomy || EMPTY) !== JSON.stringify(draft);

  const save = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("applyRoleTaxonomy", {
        ...draft,
        propagate: true,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      const stats = data?.stats || {};
      toast.success(
        `Saved. ${stats.updated || 0} profile${stats.updated === 1 ? "" : "s"} updated` +
          (stats.still_unmapped ? ` · ${stats.still_unmapped} still unmapped` : "")
      );
      await load();
    } catch (e) {
      toast.error(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const resolveConflict = async (conflict, resolution) => {
    setBusyConflict(conflict.id);
    try {
      const res = await base44.functions.invoke("resolveProfileConflict", {
        conflict_id: conflict.id,
        resolution,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      toast.success(
        resolution === "took_incoming" ? "Incoming value applied" : "On-profile value kept"
      );
      await load();
    } catch (e) {
      toast.error(e.message || "Could not resolve that conflict");
    } finally {
      setBusyConflict("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  const coverage = overview?.coverage || {};

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Role targeting</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Define the tiers and tracks your organisation uses and map job titles onto them, so
            check-ins, learning and assignments can be aimed at the audiences that matter. People
            whose title is not mapped yet still receive everything targeted at their exact title.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-9"
            onClick={load}
            disabled={saving}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="text-xs h-9 bg-[#0202ff] hover:bg-[#0101dd]"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            Save &amp; apply
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "People", value: coverage.total_people || 0 },
          { label: "With a tier/track", value: coverage.profiled || 0 },
          { label: "Not yet mapped", value: coverage.unprofiled || 0 },
          { label: "Open conflicts", value: (overview?.open_conflicts || []).length },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {(coverage.by_tier?.length > 0 || coverage.by_track?.length > 0) && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-foreground">Coverage</p>
          <div className="mt-2 space-y-2">
            {coverage.by_tier?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground w-14">
                  Tiers
                </span>
                {coverage.by_tier.map((t) => (
                  <span
                    key={t.id}
                    className="text-[11px] bg-muted border border-border rounded-md px-2 py-0.5"
                  >
                    {t.label} · {t.count}
                  </span>
                ))}
              </div>
            )}
            {coverage.by_track?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground w-14">
                  Tracks
                </span>
                {coverage.by_track.map((t) => (
                  <span
                    key={t.id}
                    className="text-[11px] bg-muted border border-border rounded-md px-2 py-0.5"
                  >
                    {t.label} · {t.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <TaxonomyValuesCard
        tiers={draft.tiers}
        tracks={draft.tracks}
        disabled={saving}
        onChange={({ tiers, tracks }) => setDraft((d) => ({ ...d, tiers, tracks }))}
      />

      <TitleMappingCard
        mappings={draft.title_mappings}
        tiers={draft.tiers}
        tracks={draft.tracks}
        availableTitles={overview?.roster_titles || []}
        unmapped={overview?.unmapped_titles || []}
        onChange={(next) => setDraft((d) => ({ ...d, title_mappings: next }))}
      />

      <ProfileFeedImportCard onApplied={load} />

      <ProfileConflictsCard
        open={overview?.open_conflicts || []}
        resolved={overview?.resolved_conflicts || []}
        onResolve={resolveConflict}
        busyId={busyConflict}
      />
    </div>
  );
}