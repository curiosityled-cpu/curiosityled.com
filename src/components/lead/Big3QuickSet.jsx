/**
 * Big3QuickSet — Inline form to set today's Big 3 priorities
 * when none were set in last night's evening check-in.
 */
import React, { useState } from "react";
import { Plus, X, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

function getTodayET() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export default function Big3QuickSet({ todayRecord, onSaved }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([{ title: "", context: "" }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addItem = () => {
    if (items.length < 3) setItems(prev => [...prev, { title: "", context: "" }]);
  };

  const removeItem = (i) => {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i, field, value) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    const valid = items.filter(it => it.title.trim());
    if (!valid.length) return;
    setSaving(true);
    const priorities = valid.map((it, idx) => ({
      id: `big3_qs_${Date.now()}_${idx}`,
      title: it.title.trim(),
      context: it.context.trim(),
      status: "planned",
    }));
    try {
      await base44.functions.invoke("saveDailyCheckIn", {
        action: "save",
        check_in_type: "morning",
        client_date: getTodayET(),
        existing_record_id: todayRecord?.id || null,
        big3_priorities: priorities,
        // Pass existing scores through if morning was already done
        energy_score: todayRecord?.energy_score || null,
        confidence_score: todayRecord?.confidence_score || null,
        focus_score: todayRecord?.focus_score || null,
        load_score: todayRecord?.load_score || null,
        growth_score: todayRecord?.growth_score || null,
      });
    } catch {
      // fallback: try updating the record directly if function call fails
      if (todayRecord?.id) {
        await base44.entities.DailyCheckIn.update(todayRecord.id, { big3_priorities: priorities }).catch(() => {});
      }
    }
    setSaving(false);
    setSaved(true);
    onSaved?.(priorities);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 py-1 text-emerald-600">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs font-medium">Big 3 set for today.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#0202ff] hover:underline"
      >
        <Plus className="w-3.5 h-3.5" /> Set your Big 3 now
      </button>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Add up to 3 priorities for today. You can refine them tonight in the evening check-in.
      </p>
      {items.map((item, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground w-3 flex-shrink-0">{i + 1}</span>
            <input
              type="text"
              placeholder={`Priority ${i + 1}`}
              value={item.title}
              onChange={e => updateItem(i, "title", e.target.value)}
              className="flex-1 text-sm bg-muted/50 border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/50"
            />
            {items.length > 1 && (
              <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Context (optional)"
            value={item.context}
            onChange={e => updateItem(i, "context", e.target.value)}
            className="w-full ml-4 text-xs bg-muted/30 border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0202ff]/20 placeholder:text-muted-foreground/40"
          />
        </div>
      ))}

      {items.length < 3 && (
        <button onClick={addItem} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground ml-4">
          <Plus className="w-3 h-3" /> Add another
        </button>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-7"
          onClick={handleSave}
          disabled={saving || !items.some(it => it.title.trim())}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Big 3"}
        </Button>
      </div>
    </div>
  );
}