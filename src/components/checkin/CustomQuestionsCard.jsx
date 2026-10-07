/**
 * CustomQuestionsCard — renders tenant-configured custom KPI questions as a
 * single step appended to the daily check-in (morning/evening). Supports four
 * response types: number, short text, 1–5 scale, and yes/no.
 *
 * Shown only when at least one custom question applies to the current user.
 * Required questions must be answered before "Continue" is enabled; a skip
 * option is offered only when no question is required.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronRight } from "lucide-react";

function NumberInput({ q, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        placeholder="0"
        className="flex-1 text-sm bg-muted/40 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/50"
      />
      {q.unit_label && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {q.unit_label}
        </span>
      )}
    </div>
  );
}

function TextInput({ value, onChange }) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer…"
      className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/50"
    />
  );
}

function ScalePicker({ value, onChange, accent }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            value === n
              ? "text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
          style={value === n ? { backgroundColor: accent } : undefined}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function YesNo({ value, onChange, accent }) {
  return (
    <div className="flex gap-2">
      {[
        { v: true, l: "Yes" },
        { v: false, l: "No" },
      ].map((o) => (
        <button
          key={o.l}
          onClick={() => onChange(o.v)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            value === o.v
              ? "text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
          style={value === o.v ? { backgroundColor: accent } : undefined}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export default function CustomQuestionsCard({
  questions,
  answers,
  onChange,
  onComplete,
  onSkip,
  saving = false,
  title = "Quick KPI check",
  subtitle,
  accent = "#0202ff",
  icon,
}) {
  const hasRequired = questions.some((q) => q.is_required);
  const allRequiredAnswered = questions.every(
    (q) =>
      !q.is_required ||
      (answers[q.question_key] !== undefined &&
        answers[q.question_key] !== "" &&
        answers[q.question_key] !== null)
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
        {icon}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {title}
          </p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {questions.length}
        </span>
      </div>

      <div className="px-4 py-5 space-y-5">
        {questions.map((q) => (
          <div key={q.id || q.question_key} className="space-y-2">
            <div className="flex items-start gap-2">
              <p className="text-sm font-medium text-foreground flex-1">
                {q.title}
              </p>
              {q.is_required && (
                <span className="text-[10px] font-semibold text-red-500 flex-shrink-0 mt-0.5">
                  Required
                </span>
              )}
            </div>
            {q.response_type === "number" && (
              <NumberInput
                q={q}
                value={answers[q.question_key]}
                onChange={(v) => onChange(q.question_key, v)}
              />
            )}
            {q.response_type === "text" && (
              <TextInput
                value={answers[q.question_key]}
                onChange={(v) => onChange(q.question_key, v)}
              />
            )}
            {q.response_type === "scale_1_5" && (
              <ScalePicker
                value={answers[q.question_key]}
                onChange={(v) => onChange(q.question_key, v)}
                accent={accent}
              />
            )}
            {q.response_type === "yes_no" && (
              <YesNo
                value={answers[q.question_key]}
                onChange={(v) => onChange(q.question_key, v)}
                accent={accent}
              />
            )}
          </div>
        ))}

        <Button
          onClick={onComplete}
          disabled={saving || (hasRequired && !allRequiredAnswered)}
          className="w-full flex items-center gap-1.5 text-white"
          style={{ backgroundColor: accent }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Continue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>

        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}