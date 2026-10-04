import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ClipboardList, HelpCircle, CheckCircle, BarChart3, Radio, MessageSquare, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";

const SIGNAL_TYPE_META = {
  assessment: { label: "Assessment", color: "#A25DDC", icon: ClipboardList },
  quiz: { label: "Quiz", color: "#0202ff", icon: HelpCircle },
  knowledge_check: { label: "Knowledge Check", color: "#3b82f6", icon: CheckCircle },
  survey: { label: "Survey", color: "#10b981", icon: BarChart3 },
  pulse: { label: "Pulse", color: "#f59e0b", icon: Radio },
  feedback: { label: "Feedback", color: "#ec4899", icon: MessageSquare },
  custom: { label: "Custom Form", color: "#64748b", icon: FileText },
};

const SIGNAL_FORM_TYPES = ["feedback_survey", "satisfaction_survey", "poll", "quiz", "custom"];

function getSignalTypeFromForm(form) {
  if (form.form_type === "poll") return "pulse";
  if (form.form_type === "satisfaction_survey") return "feedback";
  if (form.form_type === "feedback_survey") return "survey";
  if (form.form_type === "quiz") return "quiz";
  if (form.form_type === "custom") return "custom";
  return "survey";
}

function getSignalTypeFromAssessment(assessment) {
  const t = assessment.type;
  if (t === "custom_assessment") return "assessment";
  return t || "assessment";
}

export default function SignalPicker({ selected, onChange }) {
  const [search, setSearch] = useState("");
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [assessments, forms] = await Promise.all([
          base44.entities.CustomAssessment.list("-created_date"),
          base44.entities.CustomForm.list("-created_date"),
        ]);
        const signalForms = (forms || []).filter((f) => SIGNAL_FORM_TYPES.includes(f.form_type));
        const unified = [
          ...(assessments || []).map((a) => ({
            signal_id: a.id,
            entity_type: "CustomAssessment",
            signal_type: getSignalTypeFromAssessment(a),
            title: a.title,
            description: a.description,
            status: a.status,
          })),
          ...signalForms.map((f) => ({
            signal_id: f.id,
            entity_type: "CustomForm",
            signal_type: getSignalTypeFromForm(f),
            title: f.title,
            description: f.description,
            status: f.status,
          })),
        ];
        setSignals(unified);
      } catch (err) {
        console.error("Error loading signals:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedIds = new Set((selected || []).map((s) => `${s.entity_type}:${s.signal_id}`));

  const filtered = signals.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });

  const toggle = (signal) => {
    const key = `${signal.entity_type}:${signal.signal_id}`;
    if (selectedIds.has(key)) {
      onChange((selected || []).filter((s) => `${s.entity_type}:${s.signal_id}` !== key));
    } else {
      onChange([
        ...(selected || []),
        {
          signal_id: signal.signal_id,
          entity_type: signal.entity_type,
          signal_type: signal.signal_type,
          title: signal.title,
          status: "not_started",
        },
      ]);
    }
  };

  return (
    <div className="min-w-0 space-y-3">
      {selected?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => {
            const meta = SIGNAL_TYPE_META[s.signal_type] || SIGNAL_TYPE_META.custom;
            const Icon = meta.icon;
            return (
              <Badge key={`${s.entity_type}:${s.signal_id}`} variant="secondary" className="gap-1.5">
                <Icon className="w-3 h-3" style={{ color: meta.color }} />
                {s.title}
                <button
                  type="button"
                  onClick={() => toggle(s)}
                  className="ml-0.5 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search signals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {search ? "No signals match your search." : "No signals available. Create signals first in the Signals tab."}
        </p>
      ) : (
        <div className="max-h-[300px] overflow-y-auto space-y-1.5">
          {filtered.map((signal) => {
            const meta = SIGNAL_TYPE_META[signal.signal_type] || SIGNAL_TYPE_META.custom;
            const Icon = meta.icon;
            const key = `${signal.entity_type}:${signal.signal_id}`;
            const isSelected = selectedIds.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(signal)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? "border-[#0202ff]/30 bg-[#0202ff]/5"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${meta.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{signal.title}</p>
                  <p className="text-xs text-gray-500">{meta.label}</p>
                </div>
                {isSelected && <CheckCircle className="w-4 h-4 text-[#0202ff] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}