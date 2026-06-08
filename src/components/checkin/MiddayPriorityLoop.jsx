/**
 * MiddayPriorityLoop — Quick midday check on the Big 3.
 * Shows today's Big 3 priorities and lets the user mark status + add a note for each.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Repeat, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const STATUS_OPTIONS = [
  { value: "on_track", label: "On track", color: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  { value: "shifted",  label: "Shifted",  color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "blocked",  label: "Blocked",  color: "border-rose-400 bg-rose-50 text-rose-700" },
];

export default function MiddayPriorityLoop({ todayRecord, onComplete }) {
  const big3 = todayRecord?.big3_priorities || [];
  const alreadyDone = todayRecord?.midday_loop_completed;

  const [statuses, setStatuses] = useState(() =>
    big3.reduce((acc, p) => ({ ...acc, [p.id]: p.midday_status || "" }), {})
  );
  const [midNotes, setMidNotes] = useState(() =>
    big3.reduce((acc, p) => ({ ...acc, [p.id]: p.midday_note || "" }), {})
  );
  const [saving, setSaving] = useState(false);

  if (!big3.length) return null;

  if (alreadyDone) {
    return (
      <div className="bg-card rounded-2xl border border-blue-200/60 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Midday loop done</p>
          <p className="text-xs text-muted-foreground">Big 3 status captured for today.</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    const updatedBig3 = big3.map(p => ({
      ...p,
      midday_status: statuses[p.id] || "",
      midday_note: midNotes[p.id] || "",
    }));
    await base44.functions.invoke("saveDailyCheckIn", {
      action: "save",
      check_in_type: "midday",
      big3_priorities: updatedBig3,
    }).catch(console.error);
    setSaving(false);
    onComplete?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
        <Repeat className="w-4 h-4 text-blue-400" />
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Midday priority loop</p>
        <p className="text-xs text-muted-foreground ml-1">How's your Big 3 tracking?</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {big3.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="space-y-2"
          >
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#0202ff] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-sm font-medium text-foreground leading-snug">{p.title}</p>
            </div>

            <div className="ml-7 flex gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatuses(s => ({ ...s, [p.id]: opt.value }))}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-all
                    ${statuses[p.id] === opt.value ? opt.color : "border-border text-muted-foreground hover:bg-muted/50"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {statuses[p.id] && statuses[p.id] !== "on_track" && (
              <textarea
                value={midNotes[p.id]}
                onChange={e => setMidNotes(n => ({ ...n, [p.id]: e.target.value }))}
                placeholder="What shifted or what's blocking you?"
                rows={2}
                className="ml-7 w-[calc(100%-1.75rem)] text-xs bg-muted/40 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/50"
              />
            )}
          </motion.div>
        ))}

        <Button
          onClick={handleSave}
          disabled={saving || !big3.some(p => statuses[p.id])}
          className="w-full bg-[#0202ff] hover:bg-[#0101dd] mt-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save midday loop"}
        </Button>
      </div>
    </div>
  );
}