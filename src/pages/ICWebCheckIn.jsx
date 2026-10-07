/**
 * ICWebCheckIn — token-gated web fallback for non-user frontline ICs.
 * Route: /ic-checkin?token=<web_access_token>
 *
 * Not indexed (noindex meta injected on mount) and not behind ProtectedRoute —
 * ICs are not app users. The token in the URL identifies the IC and gates access.
 * Renders the org's preset measures + custom KPI questions and submits via the
 * icWebCheckIn backend function.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SCALE = [1, 2, 3, 4, 5];

function MeasureControl({ measure, value, onChange }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-900">
          {measure.emoji ? `${measure.emoji} ` : ""}{measure.label}
        </p>
        <p className="text-xs text-gray-500">{measure.desc}</p>
      </div>
      <div className="flex gap-2">
        {SCALE.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(`m_${measure.key}`, String(n))}
            className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${
              value === String(n)
                ? "bg-[#0202ff] text-white border-[#0202ff]"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuestionControl({ q, value, onChange }) {
  const key = `c_${q.question_key}`;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-900">
        {q.title}{q.is_required ? <span className="text-red-500"> *</span> : null}
      </p>
      {q.response_type === "number" && (
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={q.unit_label || "0"}
          className="text-sm"
        />
      )}
      {q.response_type === "text" && (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder="Type your answer…"
          className="text-sm"
        />
      )}
      {q.response_type === "yes_no" && (
        <div className="flex gap-2">
          {["yes", "no"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(key, opt)}
              className={`flex-1 h-10 rounded-lg border text-sm font-medium capitalize transition-all ${
                value === opt
                  ? "bg-[#0202ff] text-white border-[#0202ff]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {q.response_type === "scale_1_5" && (
        <div className="flex gap-2">
          {SCALE.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(key, String(n))}
              className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${
                value === String(n)
                  ? "bg-[#0202ff] text-white border-[#0202ff]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ICWebCheckIn() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Inject noindex meta so the page is never indexed.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    if (!token) {
      setError("No access token provided. Use the link from your check-in reminder.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("icWebCheckIn", {
          action: "get_context",
          token,
        });
        if (cancelled) return;
        const data = res?.data || res;
        if (data?.error) throw new Error(data.error);
        setCtx(data);
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load your check-in.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const setAnswer = (key, val) => setAnswers((a) => ({ ...a, [key]: val }));

  const handleSubmit = async () => {
    // Validate required custom questions.
    const missing = (ctx?.custom_questions || []).filter(
      (q) => q.is_required && !answers[`c_${q.question_key}`]
    );
    if (missing.length > 0) {
      setError(`Please answer all required questions (${missing.length} remaining).`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("icWebCheckIn", {
        action: "submit",
        token,
        answers,
        check_in_type: ctx?.check_in_type || "morning",
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError(e.message || "Could not save your check-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900">Check-in saved</h1>
          <p className="text-sm text-gray-500 mt-1">
            Thanks{ctx?.ic_name ? `, ${ctx.ic_name.split(" ")[0]}` : ""}! Your check-in was recorded.
          </p>
        </div>
      </div>
    );
  }

  if (error && !ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <h1 className="text-base font-semibold text-gray-900">Check-in unavailable</h1>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {ctx?.check_in_type === "evening" ? "Evening" : "Daily"} Check-in
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Hi{ctx?.ic_name ? ` ${ctx.ic_name.split(" ")[0]}` : ""} — a quick check-in.
              {ctx?.team ? ` · ${ctx.team}` : ""}
            </p>
          </div>

          {(ctx?.measures || []).map((m) => (
            <MeasureControl
              key={m.key}
              measure={m}
              value={answers[`m_${m.key}`]}
              onChange={setAnswer}
            />
          ))}

          {(ctx?.custom_questions || []).map((q) => (
            <QuestionControl
              key={q.question_key}
              q={q}
              value={answers[`c_${q.question_key}`]}
              onChange={setAnswer}
            />
          ))}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#0202ff] hover:bg-[#0101dd]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Submit check-in"
            )}
          </Button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Curiosity Led · Frontline Check-in
        </p>
      </div>
    </div>
  );
}