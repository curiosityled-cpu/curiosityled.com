import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Link2, UserRoundCheck } from "lucide-react";

const NONE = "__none__";

function selectValue(value) {
  return value || NONE;
}

/** Maps employee job titles onto the client's tiers and tracks. */
export default function TitleMappingCard({
  mappings,
  tiers,
  tracks,
  availableTitles = [],
  unmapped = [],
  onChange,
}) {
  const [newTitle, setNewTitle] = useState("");

  const addMapping = (title) => {
    const clean = String(title || "").trim();
    if (!clean) return;
    if (mappings.some((m) => m.title.toLowerCase() === clean.toLowerCase())) return;
    onChange([...mappings, { title: clean, tier_id: "", track_id: "" }]);
  };

  const updateRow = (idx, patch) => {
    const next = [...mappings];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const pendingTitles = unmapped.filter(
    (u) => !mappings.some((m) => m.title.toLowerCase() === u.title.toLowerCase())
  );

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-[#0202ff]" />
            Title mapping
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Point each job title at a tier and track. Everyone whose profile already carries an
            HRIS or roster value keeps it; the mapping fills in the rest.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMapping(newTitle);
                setNewTitle("");
              }
            }}
            placeholder="Add a job title…"
            list="role-targeting-titles"
            className="text-sm h-9 w-56"
          />
          <datalist id="role-targeting-titles">
            {availableTitles.map((t) => (
              <option key={t.title} value={t.title} />
            ))}
          </datalist>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={!newTitle.trim()}
            onClick={() => {
              addMapping(newTitle);
              setNewTitle("");
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {pendingTitles.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-[11px] font-semibold text-amber-800">
            {pendingTitles.length} title{pendingTitles.length === 1 ? "" : "s"} on your profiles
            {pendingTitles.length === 1 ? " is" : " are"} not mapped yet
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            These people still receive baseline questions and any question targeting their exact
            title, but they are left out of tier and track targeting until mapped.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {pendingTitles.slice(0, 12).map((u) => (
              <button
                key={u.title}
                type="button"
                onClick={() => addMapping(u.title)}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-amber-300 rounded-md px-2 py-1 hover:border-amber-400"
              >
                <Plus className="w-3 h-3" />
                {u.title}
                <span className="text-amber-600">· {u.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mappings.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic mt-3">
          No titles mapped yet. Add one above, or pick from the titles already on your profiles.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {mappings.map((m, idx) => (
            <div
              key={`${m.title}-${idx}`}
              className="grid grid-cols-1 sm:grid-cols-[1fr_150px_150px_auto] gap-2 items-center"
            >
              <Input
                value={m.title}
                onChange={(e) => updateRow(idx, { title: e.target.value })}
                className="text-sm h-9"
              />
              <Select
                value={selectValue(m.tier_id)}
                onValueChange={(v) => updateRow(idx, { tier_id: v === NONE ? "" : v })}
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue placeholder="Any tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any tier</SelectItem>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectValue(m.track_id)}
                onValueChange={(v) => updateRow(idx, { track_id: v === NONE ? "" : v })}
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue placeholder="Any track" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any track</SelectItem>
                  {tracks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => onChange(mappings.filter((_, i) => i !== idx))}
                className="p-1.5 rounded-md hover:bg-red-50 text-red-500 justify-self-start"
                title={`Remove mapping for ${m.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {availableTitles.length > 0 && mappings.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
          <UserRoundCheck className="w-3 h-3" />
          {availableTitles.filter((t) => t.mapped).length} of {availableTitles.length} titles on
          your profiles are mapped.
        </p>
      )}
    </div>
  );
}