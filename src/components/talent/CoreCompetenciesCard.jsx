import React, { useEffect, useMemo, useState } from "react";
import { Layers, Check, Loader2, Lock, Unlock, Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useClient } from "@/components/contexts/ClientContext";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CoreCompetenciesCard() {
  const { user } = useAuth();
  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const isSuperAdmin = appRole === "Super Administrator";
  const { client, loading: clientLoading, refreshContext } = useClient();
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiReasoning, setAiReasoning] = useState(null);

  const selectedIds = client?.selected_competency_ids || [];

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    base44.entities.Competency.list()
      .then((rows) => { if (!cancelled) setCompetencies(rows || []); })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isSuperAdmin, user?.app_role, user?.data?.app_role, user?.role]);

  const coreCompetencies = useMemo(
    () => competencies.filter((c) => c.is_platform_default),
    [competencies]
  );
  const orgSpecificCompetencies = useMemo(
    () => competencies.filter((c) => !c.is_platform_default && c.client_id === client?.id),
    [competencies, client?.id]
  );

  if (!isSuperAdmin) return null;

  const competencySetLocked = client?.settings?.locks?.competency_set;

  const toggleLock = async () => {
    if (!client) return;
    const currentLocks = client.settings?.locks || {};
    const nextLocks = { ...currentLocks, competency_set: !currentLocks.competency_set };
    setSaving(true);
    try {
      await base44.entities.Client.update(client.id, {
        settings: { ...client.settings, locks: nextLocks },
      });
      await refreshContext();
      toast.success(nextLocks.competency_set ? "Competency set locked" : "Competency set unlocked");
    } catch (e) {
      toast.error("Failed to update lock");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id) => {
    if (!client) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setSaving(true);
    try {
      await base44.entities.Client.update(client.id, {
        selected_competency_ids: next,
        competencies_configured: next.length > 0,
      });
      await refreshContext();
      toast.success("Core competencies updated");
    } catch (e) {
      toast.error("Failed to update core competencies");
    } finally {
      setSaving(false);
    }
  };

  const runAiAssist = async () => {
    if (!client) return;
    setAiRunning(true);
    setAiReasoning(null);
    try {
      const catalog = competencies.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        definition: c.definition,
        is_platform_default: !!c.is_platform_default,
      }));
      const prompt = `You are an expert leadership development consultant for the "Curiosity Led" platform.
A client organization needs help selecting their core competencies — the 3-5 competencies (plus Situational Intelligence) they will measure every leader against.

Client context:
- Organization name: ${client.name || "Unknown"}
- Industry: ${client.industry || "Unknown"}
- Company size: ${client.company_size || "Unknown"}
- Primary contact role: ${client.contact_name || "Unknown"}

Available competencies (JSON):
${JSON.stringify(catalog)}

Select the most relevant 3-5 competencies PLUS "Situational Intelligence" if present. Prefer a balanced mix across categories (Tactical, Self Leadership, People Leadership, Situational Intelligence). Return ONLY a JSON object with:
- recommended_competency_ids: array of competency IDs from the catalog above
- reasoning: a concise 2-3 sentence explanation of why this mix fits this organization`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_competency_ids: {
              type: "array",
              items: { type: "string" },
            },
            reasoning: { type: "string" },
          },
          required: ["recommended_competency_ids", "reasoning"],
        },
      });

      const recommended = (res?.recommended_competency_ids || []).filter((id) =>
        competencies.some((c) => c.id === id)
      );
      if (recommended.length === 0) {
        toast.error("AI could not match recommendations to the competency catalog");
        setAiRunning(false);
        return;
      }

      await base44.entities.Client.update(client.id, {
        selected_competency_ids: recommended,
        competencies_configured: true,
      });
      await refreshContext();
      setAiReasoning(res?.reasoning || null);
      toast.success(`AI selected ${recommended.length} competencies`);
    } catch (e) {
      toast.error("AI assist failed to complete");
    } finally {
      setAiRunning(false);
    }
  };

  const renderColumn = (title, items, accent) => (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${accent}`}>
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground">{items.length} available</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 -mr-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-3">
            {title === "Org Specific"
              ? "No organization-specific competencies yet."
              : "No core competencies available."}
          </p>
        ) : (
          items.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                disabled={saving}
                className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-left transition-all disabled:opacity-60 w-full ${
                  selected
                    ? "border-[#0202ff] bg-[#0202ff]/5"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                    selected ? "border-[#0202ff] bg-[#0202ff]" : "border-gray-300"
                  }`}
                >
                  {selected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm leading-tight ${selected ? "text-[#0202ff] font-medium" : "text-gray-700"}`}>
                    {c.name || c.title || c.id}
                  </p>
                  {c.category && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.category}</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Organizational Competency Settings
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#0202ff] bg-[#0202ff]/10 px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> Super Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runAiAssist}
            disabled={saving || aiRunning || !client || loading || clientLoading}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md text-[#0202ff] bg-[#0202ff]/10 hover:bg-[#0202ff]/20 transition-colors disabled:opacity-50"
            title="Let AI recommend competencies based on your organization's context"
          >
            {aiRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiRunning ? "AI selecting..." : "AI Assist"}
          </button>
          <button
            type="button"
            onClick={toggleLock}
            disabled={saving || !client}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors disabled:opacity-60 ${
              competencySetLocked
                ? "text-[#0202ff] bg-[#0202ff]/10"
                : "text-muted-foreground hover:bg-muted"
            }`}
            title={competencySetLocked ? "Org override ON — users cannot change this" : "Lock as org override"}
          >
            {competencySetLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {competencySetLocked ? "Locked" : "Lock"}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          Pick the 3–5 competencies (plus Situational Intelligence) your organization measures against. These power development, assessments, and reporting across the platform.
        </p>

        {aiReasoning && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-[#0202ff]/20 bg-[#0202ff]/5">
            <Sparkles className="w-4 h-4 text-[#0202ff] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0202ff] mb-1">AI Recommendation</p>
              <p className="text-xs text-foreground leading-relaxed">{aiReasoning}</p>
            </div>
            <button
              type="button"
              onClick={() => setAiReasoning(null)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {loading || clientLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !client ? (
          <p className="text-sm text-muted-foreground italic py-4">
            No client organization linked to your account.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderColumn("Core", coreCompetencies, "text-[#0202ff] bg-[#0202ff]/10")}
            {renderColumn("Org Specific", orgSpecificCompetencies, "text-amber-700 bg-amber-100")}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {selectedIds.length} selected. Recommended: 3–5 core competencies plus Situational Intelligence.
          </p>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>
    </div>
  );
}