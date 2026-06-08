/**
 * WeeklyRhythmReflection — Upgraded weekly reflection with check-in intelligence.
 * Synthesizes the week's DailyCheckIn data + weekly wins/learnings/forward intent.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

const MEASURES = [
  { key: "energy", label: "Energy", emoji: "⚡" },
  { key: "confidence", label: "Confidence", emoji: "🎯" },
  { key: "focus", label: "Focus", emoji: "🔍" },
  { key: "load", label: "Load", emoji: "🪨" },
  { key: "growth", label: "Growth", emoji: "🌱" },
];

function avg(arr) {
  const v = arr.filter(Boolean);
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null;
}

function TrendIcon({ val }) {
  if (!val) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (val >= 4) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (val <= 2.5) return <TrendingDown className="w-3 h-3 text-rose-500" />;
  return <Minus className="w-3 h-3 text-amber-400" />;
}

export default function WeeklyRhythmReflection({ isOpen, onClose, onSuccess, userEmail }) {
  const [wentWell, setWentWell] = useState("");
  const [surprised, setSurprised] = useState("");
  const [keyDecisions, setKeyDecisions] = useState("");
  const [nextWeekIntent, setNextWeekIntent] = useState("");
  const [weekSummary, setWeekSummary] = useState(null);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !userEmail) return;
    setLoadingWeek(true);

    // Load this week's DailyCheckIn records
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    base44.entities.DailyCheckIn.filter({ user_email: userEmail }, '-check_in_date', 14)
      .then(records => {
        const weekRecords = records.filter(r => r.check_in_date >= weekAgoStr);
        if (!weekRecords.length) { setLoadingWeek(false); return; }

        const summary = {};
        MEASURES.forEach(m => {
          const scores = weekRecords.map(r => r[`${m.key}_score`]).filter(Boolean);
          summary[m.key] = avg(scores);
        });

        const morningCount = weekRecords.filter(r => r.morning_completed).length;
        const eveningCount = weekRecords.filter(r => r.evening_completed).length;
        const big3Days = weekRecords.filter(r => r.big3_priorities?.length > 0).length;

        setWeekSummary({ ...summary, morningCount, eveningCount, big3Days, totalDays: weekRecords.length });
        setLoadingWeek(false);
      })
      .catch(() => setLoadingWeek(false));
  }, [isOpen, userEmail]);

  const handleSubmit = async () => {
    if (!wentWell.trim()) { toast.error("Share at least one win from this week"); return; }
    setSubmitting(true);
    try {
      await base44.entities.ManagerPulse.create({
        user_email: userEmail,
        prompt_type: 'weekly_reflection',
        source: 'web',
        biggest_weight_today: wentWell,
        ...(surprised && { identity_friction_note: surprised }),
        ...(keyDecisions && { delegation_commitment: keyDecisions }),
        ...(nextWeekIntent && { focus_intention: nextWeekIntent }),
        metadata: weekSummary ? { week_averages: weekSummary } : undefined,
      });
      toast.success("Weekly rhythm reflection saved.");
      if (onSuccess) onSuccess();
      onClose();
      setWentWell(""); setSurprised(""); setKeyDecisions(""); setNextWeekIntent("");
    } catch {
      toast.error("Failed to save reflection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Weekly Rhythm Reflection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Week-at-a-glance from DailyCheckIn data */}
          {loadingWeek && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading your week...
            </div>
          )}

          {weekSummary && !loadingWeek && (
            <div className="bg-muted/40 rounded-xl px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">This week's averages</p>
              <div className="grid grid-cols-5 gap-2">
                {MEASURES.map(m => (
                  <div key={m.key} className="text-center">
                    <span className="text-base">{m.emoji}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <p className="text-sm font-bold text-foreground">{weekSummary[m.key] ?? "–"}</p>
                      <TrendIcon val={weekSummary[m.key] ? parseFloat(weekSummary[m.key]) : null} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">🌅 {weekSummary.morningCount} mornings</p>
                <p className="text-xs text-muted-foreground">🌙 {weekSummary.eveningCount} evenings</p>
                <p className="text-xs text-muted-foreground">📋 {weekSummary.big3Days} Big 3 days</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">What went well or as planned?</label>
            <textarea
              placeholder="Wins, moments of focus, things that worked out..."
              value={wentWell}
              onChange={e => setWentWell(e.target.value)}
              rows={3}
              className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">What surprised you?</label>
            <textarea
              placeholder="Unexpected challenges, pivots, difficult moments (optional)"
              value={surprised}
              onChange={e => setSurprised(e.target.value)}
              rows={2}
              className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Key decisions or realizations</label>
            <textarea
              placeholder="Important choices you made, insights for next week (optional)"
              value={keyDecisions}
              onChange={e => setKeyDecisions(e.target.value)}
              rows={2}
              className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Intent for next week</label>
            <textarea
              placeholder="One thing you want to do differently or protect next week (optional)"
              value={nextWeekIntent}
              onChange={e => setNextWeekIntent(e.target.value)}
              rows={2}
              className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !wentWell.trim()}
              className="flex-1 bg-[#0202ff] hover:bg-[#0101dd]"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save reflection"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}