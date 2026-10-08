/**
 * RetroactiveCheckInCard — lets a user complete a missed daily check-in for a
 * past date within their organization's configurable lookback window.
 *
 * Renders the standard 5 measures (from the org preset) plus any applicable
 * custom KPI questions, and saves to DailyCheckIn with the chosen date.
 *
 * Shown in My Rhythm → Daily Check-Ins.
 */
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CHECK_IN_PRESETS, SCALE_LABELS } from "@/lib/checkInPresets";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarClock, CheckCircle2, Sunrise, Moon } from "lucide-react";
import { toast } from "sonner";

function shiftET(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function ScorePicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            value === n
              ? "bg-[#0202ff] text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {n}
          <span className="block text-[9px] font-normal leading-tight mt-0.5 opacity-80">
            {SCALE_LABELS[n]}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function RetroactiveCheckInCard({ initialDate, initialType, editMode, onSaved, onCancel, targetEmail, targetName }) {
  const { user } = useAuth();
  const userEmail = user?.email;
  const clientId = user?.data?.client_id || user?.client_id;
  const userRole = user?.app_role || user?.data?.app_role || user?.role || "";

  const [lookback, setLookback] = useState(7);
  const [measures, setMeasures] = useState(CHECK_IN_PRESETS.balance.measures);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(initialDate || shiftET(-1));
  const [checkInType, setCheckInType] = useState(initialType || "morning");
  const [scores, setScores] = useState({
    energy: 3,
    confidence: 3,
    focus: 3,
    load: 3,
    growth: 3,
  });
  const [notes, setNotes] = useState({});
  const [customQs, setCustomQs] = useState([]);
  const [customAnswers, setCustomAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [existingForDate, setExistingForDate] = useState(null);

  // Load org config (lookback + preset) and custom questions
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let lb = 7;
      let presetId = "balance";
      try {
        if (clientId) {
          const client = await base44.entities.Client.get(clientId);
          const cfg = client?.settings?.check_in_config || {};
          lb = cfg.retroactive_lookback_days ?? 7;
          if (cfg.preset_id && CHECK_IN_PRESETS[cfg.preset_id]) presetId = cfg.preset_id;
        }
      } catch {
        /* defaults */
      }
      if (cancelled) return;
      setLookback(lb);
      setMeasures((CHECK_IN_PRESETS[presetId] || CHECK_IN_PRESETS.balance).measures);
      setLoading(false);

      // Custom questions (active, role + applies_to filtered client-side)
      try {
        const all = await base44.entities.CheckInCustomQuestion.filter(
          { is_active: true },
          "display_order",
          100
        );
        if (cancelled) return;
        setCustomQs(all || []);
      } catch {
        if (!cancelled) setCustomQs([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const minDate = useMemo(() => shiftET(-Math.max(0, lookback)), [lookback]);
  const maxDate = useMemo(() => shiftET(0), []);

  // Clamp selected date into the allowed window
  useEffect(() => {
    if (selectedDate < minDate) setSelectedDate(minDate);
    if (selectedDate > maxDate) setSelectedDate(maxDate);
  }, [minDate, maxDate, selectedDate]);

  // Check whether a record already exists for the selected date.
  // Skipped when backfilling for a target person (self or a direct report) —
  // the service-role function handles find-or-create, and client RLS blocks
  // reading other users' records.
  useEffect(() => {
    let cancelled = false;
    if (!userEmail || targetEmail) return;
    (async () => {
      try {
        const rows = await base44.entities.DailyCheckIn.filter(
          { user_email: userEmail },
          "-created_date",
          60
        );
        if (cancelled) return;
        const match = (rows || []).find((r) => r.check_in_date === selectedDate);
        setExistingForDate(match || null);
        if (match) {
          setScores({
            energy: match.energy_score || 3,
            confidence: match.confidence_score || 3,
            focus: match.focus_score || 3,
            load: match.load_score || 3,
            growth: match.growth_score || 3,
          });
          setNotes({
            energy: match.energy_note || "",
            confidence: match.confidence_note || "",
            focus: match.focus_note || "",
            load: match.load_note || "",
            growth: match.growth_note || "",
          });
          setCustomAnswers(match.custom_answers || {});
        }
      } catch {
        if (!cancelled) setExistingForDate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userEmail, selectedDate]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
        </CardContent>
      </Card>
    );
  }

  if (lookback <= 0) return null; // retroactive disabled for this org

  const applicableCustomQs = customQs.filter((q) => {
    if (q.target_role && q.target_role !== userRole) return false;
    if (q.applies_to !== "both" && q.applies_to !== checkInType) return false;
    return true;
  });

  const alreadyDone =
    (checkInType === "morning" && existingForDate?.morning_completed) ||
    (checkInType === "evening" && existingForDate?.evening_completed);

  const handleSave = async () => {
    if (!userEmail) {
      toast.error("Sign in to save a check-in.");
      return;
    }
    setSaving(true);
    try {
      // Backfilling for a specific person (self or a direct report) — route
      // through the service-role function so managers can save on behalf of
      // their reports (DailyCheckIn RLS is owner-only).
      if (targetEmail) {
        await base44.functions.invoke("saveCheckInForUser", {
          target_email: targetEmail,
          check_in_date: selectedDate,
          check_in_type: checkInType,
          scores,
          notes,
          custom_answers:
            applicableCustomQs.length > 0 ? customAnswers : undefined,
        });
        toast.success(
          `Check-in saved for ${targetName || formatDateLabel(selectedDate)}.`
        );
        onSaved?.();
        return;
      }
      const scorePayload = {
        energy_score: scores.energy,
        energy_note: notes.energy || "",
        confidence_score: scores.confidence,
        confidence_note: notes.confidence || "",
        focus_score: scores.focus,
        focus_note: notes.focus || "",
        load_score: scores.load,
        load_note: notes.load || "",
        growth_score: scores.growth,
        growth_note: notes.growth || "",
        ...(applicableCustomQs.length > 0 ? { custom_answers: customAnswers } : {}),
      };
      const now = new Date().toISOString();
      if (checkInType === "morning") {
        scorePayload.morning_completed = true;
        scorePayload.morning_completed_at = now;
      } else {
        scorePayload.evening_completed = true;
        scorePayload.evening_completed_at = now;
      }

      if (existingForDate?.id) {
        await base44.entities.DailyCheckIn.update(existingForDate.id, scorePayload);
      } else {
        await base44.entities.DailyCheckIn.create({
          user_email: userEmail,
          check_in_date: selectedDate,
          check_in_type: checkInType,
          ...scorePayload,
        });
      }
      toast.success(`Check-in saved for ${formatDateLabel(selectedDate)}.`);
      setExistingForDate({ ...(existingForDate || {}), ...scorePayload });
      onSaved?.();
    } catch (e) {
      toast.error("Could not save: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#0202ff]" />
          <p className="text-sm font-semibold text-foreground">
            {editMode
              ? "Edit check-in"
              : targetName
                ? `Check-in for ${targetName}`
                : "Complete a missed check-in"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          {editMode
            ? "Update the scores and notes for this check-in."
            : `Backfill a check-in for a day you missed, up to ${lookback} day${lookback === 1 ? "" : "s"} back.`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Date</Label>
            <Input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              readOnly={!!editMode}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              {formatDateLabel(selectedDate)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Check-in type</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setCheckInType("morning")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  checkInType === "morning"
                    ? "bg-[#0202ff] text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                <Sunrise className="w-4 h-4" /> Morning
              </button>
              <button
                onClick={() => setCheckInType("evening")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  checkInType === "evening"
                    ? "bg-[#0202ff] text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                <Moon className="w-4 h-4" /> Evening
              </button>
            </div>
          </div>
        </div>

        {alreadyDone && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              This {checkInType} check-in was already completed for{" "}
              {formatDateLabel(selectedDate)}. Saving will update it.
            </span>
          </div>
        )}

        {/* Measures */}
        <div className="space-y-3 pt-1">
          {measures.map((m) => (
            <div key={m.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{m.emoji}</span>
                <p className="text-xs font-semibold text-foreground">
                  {m.label} · {m.desc}
                </p>
              </div>
              <ScorePicker
                value={scores[m.key]}
                onChange={(v) => setScores((s) => ({ ...s, [m.key]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Custom KPI questions */}
        {applicableCustomQs.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              KPI questions
            </p>
            {applicableCustomQs.map((q) => (
              <div key={q.id || q.question_key} className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">{q.title}</p>
                {q.response_type === "number" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={customAnswers[q.question_key] ?? ""}
                      onChange={(e) =>
                        setCustomAnswers((a) => ({
                          ...a,
                          [q.question_key]:
                            e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="text-sm flex-1"
                    />
                    {q.unit_label && (
                      <span className="text-xs text-muted-foreground">
                        {q.unit_label}
                      </span>
                    )}
                  </div>
                )}
                {q.response_type === "text" && (
                  <Input
                    type="text"
                    value={customAnswers[q.question_key] ?? ""}
                    onChange={(e) =>
                      setCustomAnswers((a) => ({
                        ...a,
                        [q.question_key]: e.target.value,
                      }))
                    }
                    placeholder="Type your answer…"
                    className="text-sm"
                  />
                )}
                {q.response_type === "scale_1_5" && (
                  <ScorePicker
                    value={customAnswers[q.question_key]}
                    onChange={(v) =>
                      setCustomAnswers((a) => ({ ...a, [q.question_key]: v }))
                    }
                  />
                )}
                {q.response_type === "yes_no" && (
                  <div className="flex gap-2">
                    {[
                      { v: true, l: "Yes" },
                      { v: false, l: "No" },
                    ].map((o) => (
                      <button
                        key={o.l}
                        onClick={() =>
                          setCustomAnswers((a) => ({
                            ...a,
                            [q.question_key]: o.v,
                          }))
                        }
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          customAnswers[q.question_key] === o.v
                            ? "bg-[#0202ff] text-white shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="flex-shrink-0"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#0202ff] hover:bg-[#0101dd]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Save ${checkInType} check-in for ${targetName || formatDateLabel(selectedDate)}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}