import React, { useEffect, useState } from "react";
import { Sparkles, Loader2, Check, X, ArrowRight, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const INDUSTRY_OPTIONS = [
  "Technology / SaaS",
  "Healthcare",
  "Financial Services",
  "Manufacturing",
  "Retail / E-commerce",
  "Education",
  "Government / Public Sector",
  "Non-profit",
  "Professional Services",
  "Energy / Utilities",
  "Media / Entertainment",
  "Telecommunications",
  "Other",
];

const PRIORITY_OPTIONS = [
  "Scaling rapidly",
  "Digital transformation",
  "M&A integration",
  "Cost optimization",
  "Innovation / R&D",
  "Operational excellence",
  "Customer experience",
  "Talent retention",
  "Culture change",
  "Market expansion",
];

const LEADERSHIP_STAGE_OPTIONS = [
  "First-time managers",
  "Mid-level managers",
  "Senior leaders / Directors",
  "Executives / C-suite",
  "Mixed (all levels)",
];

export default function CompetencyAiAssistDialog({
  open,
  onOpenChange,
  client,
  competencies,
  currentlySelectedIds,
  onApply,
}) {
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [leadershipStage, setLeadershipStage] = useState("");
  const [strategicPriorities, setStrategicPriorities] = useState([]);
  const [challenges, setChallenges] = useState("");
  const [desiredCount, setDesiredCount] = useState(4);
  const [running, setRunning] = useState(false);
  const [recommendation, setRecommendation] = useState(null); // { ids, reasoning }
  const [reviewSelection, setReviewSelection] = useState([]); // ids user has toggled in review

  useEffect(() => {
    if (open) {
      setStep(1);
      setRecommendation(null);
      setReviewSelection([]);
      setIndustry(client?.industry || "");
      setCompanySize(client?.company_size || "");
      setLeadershipStage("");
      setStrategicPriorities([]);
      setChallenges("");
      setDesiredCount(4);
    }
  }, [open, client]);

  const togglePriority = (p) => {
    setStrategicPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const canProceedStep1 = industry && leadershipStage && strategicPriorities.length > 0;

  const runRecommendation = async () => {
    setRunning(true);
    setRecommendation(null);
    try {
      const catalog = competencies.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        definition: c.definition,
        is_platform_default: !!c.is_platform_default,
      }));
      const prompt = `You are an expert leadership development consultant for the "Curiosity Led" platform.
A client organization wants help selecting their core competencies — the competencies they will measure every leader against.

Organization context:
- Name: ${client?.name || "Unknown"}
- Industry: ${industry}
- Company size: ${companySize || "Unknown"}
- Primary leadership level being developed: ${leadershipStage}
- Strategic priorities: ${strategicPriorities.join(", ")}
- Key leadership challenges: ${challenges || "Not specified"}
- Desired number of core competencies: ${desiredCount} (plus Situational Intelligence if available)

Available competency catalog (JSON):
${JSON.stringify(catalog)}

Select ${desiredCount} competencies that best fit this organization's context, PLUS "Situational Intelligence" if it exists in the catalog. Favor a balanced mix across categories (Tactical, Self Leadership, People Leadership, Situational Intelligence). Prefer platform-default competencies unless an org-specific one clearly fits better.

Return ONLY a JSON object:
- recommended_competency_ids: array of competency IDs from the catalog
- reasoning: a concise 3-4 sentence explanation of why this mix fits`;

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

      const validIds = (res?.recommended_competency_ids || []).filter((id) =>
        competencies.some((c) => c.id === id)
      );
      if (validIds.length === 0) {
        toast.error("AI could not match recommendations to the competency catalog");
        setRunning(false);
        return;
      }
      setRecommendation({ ids: validIds, reasoning: res?.reasoning || "" });
      setReviewSelection(validIds);
      setStep(3);
    } catch (e) {
      toast.error("AI assist failed to complete");
    } finally {
      setRunning(false);
    }
  };

  const toggleReviewItem = (id) => {
    setReviewSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyAndClose = () => {
    onApply(reviewSelection);
    onOpenChange(false);
  };

  const competencyName = (id) => {
    const c = competencies.find((x) => x.id === id);
    return c?.name || c?.title || id;
  };
  const competencyCategory = (id) => {
    const c = competencies.find((x) => x.id === id);
    return c?.category || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0202ff]" />
            AI Competency Assist
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 — tell us about your organization and we'll recommend the right competencies.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Org context */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Industry <span className="text-destructive">*</span>
              </Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Company size
                </Label>
                <Input
                  placeholder="e.g. 500-1000"
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary leadership level <span className="text-destructive">*</span>
                </Label>
                <Select value={leadershipStage} onValueChange={setLeadershipStage}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {LEADERSHIP_STAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Strategic priorities <span className="text-destructive">*</span>
                <span className="ml-1 normal-case font-normal text-muted-foreground/70">(select all that apply)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((p) => {
                  const active = strategicPriorities.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePriority(p)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        active
                          ? "border-[#0202ff] bg-[#0202ff]/10 text-[#0202ff] font-medium"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"
                      }`}
                    >
                      {active && <Check className="w-3 h-3 inline mr-1" />}
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key leadership challenges <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
              </Label>
              <Textarea
                placeholder="e.g. New managers struggle with delegation; senior leaders need strategic thinking; siloed teams..."
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                How many core competencies? <span className="normal-case font-normal text-muted-foreground/70">(plus Situational Intelligence)</span>
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={3}
                  max={6}
                  value={desiredCount}
                  onChange={(e) => setDesiredCount(Number(e.target.value))}
                  className="flex-1 accent-[#0202ff]"
                />
                <span className="text-sm font-semibold text-[#0202ff] w-6 text-center">{desiredCount}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                style={{ backgroundColor: "#0202ff" }}
                className="hover:opacity-90"
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm & run */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review your context</p>
              <dl className="text-sm space-y-1.5">
                <div className="flex gap-2"><dt className="text-muted-foreground w-32 flex-shrink-0">Industry:</dt><dd className="font-medium">{industry}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-32 flex-shrink-0">Company size:</dt><dd className="font-medium">{companySize || "—"}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-32 flex-shrink-0">Leadership level:</dt><dd className="font-medium">{leadershipStage}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-32 flex-shrink-0">Priorities:</dt><dd className="font-medium">{strategicPriorities.join(", ")}</dd></div>
                {challenges && <div className="flex gap-2"><dt className="text-muted-foreground w-32 flex-shrink-0">Challenges:</dt><dd className="font-medium">{challenges}</dd></div>}
                <div className="flex gap-2"><dt className="text-muted-foreground w-32 flex-shrink-0">Competency count:</dt><dd className="font-medium">{desiredCount} + Situational Intelligence</dd></div>
              </dl>
            </div>

            <p className="text-sm text-muted-foreground">
              We'll analyze your context against the {competencies.length} available competencies and recommend the best fit.
            </p>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={running}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={runRecommendation}
                disabled={running}
                style={{ backgroundColor: "#0202ff" }}
                className="hover:opacity-90"
              >
                {running ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Get Recommendations</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & apply */}
        {step === 3 && recommendation && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2 p-3 rounded-lg border border-[#0202ff]/20 bg-[#0202ff]/5">
              <Sparkles className="w-4 h-4 text-[#0202ff] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0202ff] mb-1">AI Reasoning</p>
                <p className="text-xs text-foreground leading-relaxed">{recommendation.reasoning}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recommended competencies <span className="normal-case font-normal">({reviewSelection.length} selected — toggle to adjust)</span>
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recommendation.ids.map((id) => {
                  const selected = reviewSelection.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleReviewItem(id)}
                      className={`flex items-start gap-2 w-full px-3 py-2.5 rounded-lg border text-left transition-all ${
                        selected
                          ? "border-[#0202ff] bg-[#0202ff]/5"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
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
                        <p className={`text-sm ${selected ? "text-[#0202ff] font-medium" : "text-gray-700"}`}>
                          {competencyName(id)}
                        </p>
                        {competencyCategory(id) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{competencyCategory(id)}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={applyAndClose}
                disabled={reviewSelection.length === 0}
                style={{ backgroundColor: "#0202ff" }}
                className="hover:opacity-90"
              >
                Apply {reviewSelection.length} Competencies
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}