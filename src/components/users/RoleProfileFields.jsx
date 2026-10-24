import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Layers, GitBranch, Info } from "lucide-react";
import useRoleTaxonomy from "@/hooks/useRoleTaxonomy";

const NONE = "none";

const SOURCE_LABEL = {
  hris: "HR system",
  roster: "Roster import",
  manual: "Set manually",
};

/**
 * RoleProfileFields — one person's tier and track, shown inside the Edit User
 * modal. Saving here records the change as a manual profile update, so an HR
 * feed that later disagrees is flagged for review instead of silently winning.
 */
export default function RoleProfileFields({ user, onChange }) {
  const { tiers, tracks, loading, mappingForTitle, hasTaxonomy } = useRoleTaxonomy(user?.client_id);
  const derived = mappingForTitle(user?.current_role);
  const set = (patch) => onChange({ ...user, ...patch, profile_source: "manual" });

  return (
    <div className="md:col-span-2 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Info className="w-3.5 h-3.5 text-[#0202ff]" />
        <p className="text-sm font-medium text-foreground">Role profile</p>
        <span className="text-xs text-muted-foreground">
          Drives which check-ins, learning and assignments reach this person
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-3">
        <div>
          <Label className="flex items-center gap-1.5 mb-2">
            <Layers className="w-3.5 h-3.5" /> Tier
          </Label>
          <Select
            value={user?.role_tier || NONE}
            onValueChange={(value) => set({ role_tier: value === NONE ? "" : value })}
            disabled={loading || tiers.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading..." : "Not set"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              {tiers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-1.5 mb-2">
            <GitBranch className="w-3.5 h-3.5" /> Track
          </Label>
          <Select
            value={user?.role_track || NONE}
            onValueChange={(value) => set({ role_track: value === NONE ? "" : value })}
            disabled={loading || tracks.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading..." : "Not set"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              {tracks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 space-y-0.5">
        {!loading && !hasTaxonomy && (
          <p className="text-xs text-muted-foreground">
            No tiers or tracks defined yet — create them under the Role Profiles tab, then map job titles onto them.
          </p>
        )}
        {hasTaxonomy && derived && (
          <p className="text-xs text-muted-foreground">
            The title &ldquo;{user.current_role}&rdquo; maps to a tier automatically — choosing a value here overrides it.
          </p>
        )}
        {hasTaxonomy && !derived && user?.current_role && (
          <p className="text-xs text-muted-foreground">
            &ldquo;{user.current_role}&rdquo; is not mapped to a tier or track yet — set them here, or map the title under
            the Role Profiles tab so everyone with it is covered at once.
          </p>
        )}
        {user?.profile_source && (
          <p className="text-xs text-muted-foreground/80">
            Last written by: {SOURCE_LABEL[user.profile_source] || user.profile_source}
          </p>
        )}
      </div>
    </div>
  );
}