import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus, X, Layers, GitBranch, Users } from "lucide-react";

function PillGroup({ label, icon: Icon, hint, options, selected, onToggle, emptyText }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-[#0202ff]" />
        <p className="text-[11px] font-semibold text-foreground">{label}</p>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      {options.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic mt-1.5">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {options.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(opt.value)}
                aria-pressed={active}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                  active
                    ? "bg-[#0202ff] text-white border-[#0202ff]"
                    : "bg-muted text-muted-foreground border-border hover:border-muted-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * AudienceSelector — picks who something is for (a check-in question, a piece
 * of learning, an assignment): one or more structured tiers and tracks, and
 * optionally exact job titles.
 */
export default function AudienceSelector({ tiers = [], tracks = [], titles = [], value, onChange }) {
  const [newTitle, setNewTitle] = useState("");
  const current = {
    target_tiers: value?.target_tiers || [],
    target_tracks: value?.target_tracks || [],
    target_titles: value?.target_titles || [],
  };

  const toggle = (field, id) => {
    const list = current[field];
    onChange({
      ...current,
      [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    });
  };

  const addTitle = () => {
    const clean = newTitle.trim();
    if (!clean) return;
    if (current.target_titles.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setNewTitle("");
      return;
    }
    onChange({ ...current, target_titles: [...current.target_titles, clean] });
    setNewTitle("");
  };

  const isEveryone =
    current.target_tiers.length === 0 &&
    current.target_tracks.length === 0 &&
    current.target_titles.length === 0;

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#0202ff]" />
          Who is this for
        </p>
        <span
          className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
            isEveryone
              ? "bg-muted text-muted-foreground border-border"
              : "bg-[#0202ff]/10 text-[#0202ff] border-[#0202ff]/20"
          }`}
        >
          {isEveryone ? "Everyone" : "Targeted"}
        </span>
      </div>

      <PillGroup
        label="Tiers"
        icon={Layers}
        hint="Leave empty for any tier. Picking a tier and a track narrows it to that exact audience."
        options={tiers.map((t) => ({ value: t.id, label: t.label }))}
        selected={current.target_tiers}
        onToggle={(id) => toggle("target_tiers", id)}
        emptyText="No tiers defined yet — add them under Role profiles."
      />

      <PillGroup
        label="Tracks"
        icon={GitBranch}
        hint="Leave empty for any track."
        options={tracks.map((t) => ({ value: t.id, label: t.label }))}
        selected={current.target_tracks}
        onToggle={(id) => toggle("target_tracks", id)}
        emptyText="No tracks defined yet — add them under Role profiles."
      />

      <div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3 h-3 text-[#0202ff]" />
          <p className="text-[11px] font-semibold text-foreground">Exact job titles (optional)</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Reaches people by title even when their title is not mapped to a tier or track yet.
        </p>
        {current.target_titles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {current.target_titles.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#0202ff]/10 text-[#0202ff] border border-[#0202ff]/20 rounded-lg px-2 py-0.5"
              >
                {t}
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...current,
                      target_titles: current.target_titles.filter((x) => x !== t),
                    })
                  }
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTitle();
              }
            }}
            placeholder="e.g. Warehouse Associate"
            list="audience-title-options"
            className="text-sm h-9"
          />
          <datalist id="audience-title-options">
            {titles.map((t) => (
              <option key={t.title} value={t.title} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={addTitle}
            disabled={!newTitle.trim()}
            className="p-2 rounded-md border border-border hover:bg-muted text-muted-foreground disabled:opacity-40 flex-shrink-0"
            title="Add title"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}