import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Layers, GitBranch, Loader2 } from "lucide-react";

function slugify(text, taken) {
  const base =
    String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "value";
  let id = base;
  let n = 2;
  while (taken.includes(id)) {
    id = `${base}_${n}`;
    n++;
  }
  return id;
}

function ValueList({ label, icon: Icon, hint, values, onChange, disabled, placeholder }) {
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const add = () => {
    const labelText = newLabel.trim();
    if (!labelText) return;
    const taken = values.map((v) => v.id);
    onChange([
      ...values,
      { id: slugify(labelText, taken), label: labelText, order: values.length },
    ]);
    setNewLabel("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-[#0202ff]" />
        <p className="text-xs font-semibold text-foreground">{label}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>

      <div className="space-y-1.5">
        {values.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">Nothing defined yet.</p>
        )}
        {values.map((v, idx) => (
          <div key={v.id} className="flex items-center gap-2">
            <Input
              value={v.label}
              disabled={disabled}
              onChange={(e) => {
                const next = [...values];
                next[idx] = { ...v, label: e.target.value };
                onChange(next);
              }}
              className="text-sm h-9"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(values.filter((x) => x.id !== v.id))}
              className="p-1.5 rounded-md hover:bg-red-50 text-red-500 disabled:opacity-40 flex-shrink-0"
              title={`Remove ${v.label}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newLabel}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="text-sm h-9"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !newLabel.trim()}
          onClick={add}
          className="flex-shrink-0 h-9"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Renaming keeps existing targets intact.
      </p>
    </div>
  );
}

/** The client's structured tiers and tracks — the primary targeting values. */
export default function TaxonomyValuesCard({ tiers, tracks, onChange, disabled }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-sm font-semibold text-foreground">Tiers &amp; tracks</p>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3 max-w-2xl">
        Define the levels your organisation actually uses, and the tracks within them.
        A tier can have several tracks — for example client-facing and internal.
      </p>
      <div className="grid md:grid-cols-2 gap-5">
        <ValueList
          label="Tiers"
          icon={Layers}
          hint="Seniority or role bands, e.g. Tier 1 to Tier 5."
          values={tiers}
          disabled={disabled}
          placeholder="Add a tier (e.g. Tier 3)"
          onChange={(next) => onChange({ tiers: next, tracks })}
        />
        <ValueList
          label="Tracks"
          icon={GitBranch}
          hint="Functional split, e.g. client-facing or internal. Leave empty if a tier has no split."
          values={tracks}
          disabled={disabled}
          placeholder="Add a track (e.g. Client-Facing)"
          onChange={(next) => onChange({ tiers, tracks: next })}
        />
      </div>
    </div>
  );
}