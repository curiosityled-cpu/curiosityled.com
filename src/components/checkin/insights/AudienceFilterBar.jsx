import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, X } from "lucide-react";

const ALL = "__all__";

/**
 * AudienceFilterBar — narrows check-in insights to one title, tier, or track so
 * results can be compared across groups. Facets come from the role profile
 * snapshots stored with each check-in.
 */
export default function AudienceFilterBar({ facets, filter, onChange, coverage }) {
  const titles = facets?.titles || [];
  const tiers = facets?.tiers || [];
  const tracks = facets?.tracks || [];
  const active = !!(filter?.title || filter?.tier || filter?.track);

  if (titles.length === 0 && tiers.length === 0 && tracks.length === 0) {
    return (
      <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          No role profiles captured on these check-ins yet, so there is nothing to compare by title,
          tier, or track.
        </span>
      </div>
    );
  }

  const set = (key, value) => onChange({ ...filter, [key]: value === ALL ? "" : value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
        <Users className="w-3 h-3" />
        Audience
      </span>

      {titles.length > 0 && (
        <Select value={filter?.title || ALL} onValueChange={(v) => set("title", v)}>
          <SelectTrigger className="h-8 text-xs w-[190px]">
            <SelectValue placeholder="Any title" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any title</SelectItem>
            {titles.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.value} ({t.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {tiers.length > 0 && (
        <Select value={filter?.tier || ALL} onValueChange={(v) => set("tier", v)}>
          <SelectTrigger className="h-8 text-xs w-[170px]">
            <SelectValue placeholder="Any tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any tier</SelectItem>
            {tiers.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.value} ({t.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {tracks.length > 0 && (
        <Select value={filter?.track || ALL} onValueChange={(v) => set("track", v)}>
          <SelectTrigger className="h-8 text-xs w-[170px]">
            <SelectValue placeholder="Any track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any track</SelectItem>
            {tracks.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.value} ({t.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {active && (
        <button
          type="button"
          onClick={() => onChange({ title: "", tier: "", track: "" })}
          className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}

      {coverage && coverage.without_profile > 0 && (
        <span className="text-[10px] text-gray-400">
          {coverage.without_profile} check-in{coverage.without_profile === 1 ? "" : "s"} predate role
          profiles and are excluded when a filter is applied
        </span>
      )}
    </div>
  );
}