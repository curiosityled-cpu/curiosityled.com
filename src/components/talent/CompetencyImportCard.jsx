import React, { useState, useRef } from "react";
import { Upload, FileUp, Loader2, Sparkles, CheckCircle, X, AlertCircle, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useClient } from "@/components/contexts/ClientContext";
import { toast } from "sonner";

const CONFIDENCE_STYLES = {
  high: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", label: "High Match" },
  medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", label: "Medium Match" },
  low: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", label: "Low Match" },
  none: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", label: "No Match" },
};

export default function CompetencyImportCard({ competencies, onCreated }) {
  const { user } = useAuth();
  const { client } = useClient();
  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const canImport = ["Platform Admin", "Super Administrator", "Admin Level 1", "Partner Business Administrator"].includes(appRole);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [creatingIds, setCreatingIds] = useState(new Set());
  const [createdIds, setCreatedIds] = useState(new Set());

  if (!canImport) return null;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [".csv", ".xlsx", ".xls", ".pdf", ".json"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      toast.error("Please upload a CSV, Excel, PDF, or JSON file");
      return;
    }

    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadPublicFile({ file });
      const fileUrl = uploadRes.file_url;
      setUploading(false);
      setAnalyzing(true);

      const importRes = await base44.functions.invoke("importCompetencies", {
        file_url: fileUrl,
        existing_competencies: competencies.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          definition: c.definition,
        })),
      });

      const data = importRes?.data?.data || importRes?.data || importRes;
      if (!data || data.error) {
        throw new Error(data?.error || "Failed to analyze competencies");
      }

      setResult(data);
      setShowResultDialog(true);
    } catch (err) {
      toast.error(err.message || "Failed to import competencies");
    } finally {
      setUploading(false);
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const createSuggestedCompetency = async (suggestion, index) => {
    const suggestionKey = `suggestion-${index}`;
    setCreatingIds((prev) => new Set(prev).add(suggestionKey));
    try {
      await base44.entities.Competency.create({
        name: suggestion.name,
        field_key: suggestion.field_key || "",
        category: suggestion.category || "Tactical",
        definition: suggestion.definition || "",
        key_components: suggestion.key_components || [],
        is_platform_default: false,
        client_id: user?.client_id || user?.data?.client_id,
      });
      setCreatedIds((prev) => new Set(prev).add(suggestionKey));
      toast.success(`Created "${suggestion.name}"`);
      if (onCreated) onCreated();
    } catch (err) {
      toast.error(`Failed to create "${suggestion.name}"`);
    } finally {
      setCreatingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionKey);
        return next;
      });
    }
  };

  const createAllSuggestions = async () => {
    const pending = result?.suggestions?.filter((_, i) => !createdIds.has(`suggestion-${i}`)) || [];
    if (pending.length === 0) {
      toast.info("All suggestions have already been created");
      return;
    }
    for (let i = 0; i < result.suggestions.length; i++) {
      if (!createdIds.has(`suggestion-${i}`)) {
        await createSuggestedCompetency(result.suggestions[i], i);
      }
    }
  };

  const mappedCount = result?.mappings?.filter((m) => m.matched_competency_id && m.confidence !== "none")?.length || 0;
  const suggestionCount = result?.suggestions?.length || 0;

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Import Competencies
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#0202ff] bg-[#0202ff]/10 px-2 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" /> AI-Powered
            </span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a CSV, Excel, or PDF file containing competencies from another system. AI will extract them, map each to your existing competency library, and recommend new competencies for anything that doesn't match.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto border-[#0202ff]/30 text-[#0202ff] hover:bg-[#0202ff]/5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || analyzing}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
              ) : analyzing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with AI...</>
              ) : (
                <><FileUp className="w-4 h-4 mr-2" /> Choose File</>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              Supports CSV, Excel, PDF, JSON
            </span>
          </div>

          {analyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Sparkles className="w-4 h-4 text-[#0202ff] animate-pulse" />
              AI is extracting and mapping competencies...
            </div>
          )}
        </div>
      </div>

      {/* Results Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0202ff]" />
              AI Competency Mapping Results
            </DialogTitle>
          </DialogHeader>

          {result && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px] rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-2xl font-bold text-foreground">{result.extracted?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Extracted</p>
                </div>
                <div className="flex-1 min-w-[140px] rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-2xl font-bold text-green-700">{mappedCount}</p>
                  <p className="text-xs text-green-700">Mapped to Existing</p>
                </div>
                <div className="flex-1 min-w-[140px] rounded-lg border border-[#0202ff]/20 bg-[#0202ff]/5 px-4 py-3">
                  <p className="text-2xl font-bold text-[#0202ff]">{suggestionCount}</p>
                  <p className="text-xs text-[#0202ff]">New Competencies Suggested</p>
                </div>
              </div>

              {/* Mappings */}
              {result.mappings && result.mappings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Competency Mappings
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.mappings.map((m, i) => {
                      const style = CONFIDENCE_STYLES[m.confidence] || CONFIDENCE_STYLES.none;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{m.extracted_name}</p>
                            {m.matched_competency_name ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{m.matched_competency_name}</span>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic mt-1">No existing match — see suggestions below</p>
                            )}
                            {m.reasoning && (
                              <p className="text-xs text-muted-foreground mt-1 italic">{m.reasoning}</p>
                            )}
                          </div>
                          <Badge className={`text-xs flex-shrink-0 ${style.bg} ${style.text} ${style.border} border`}>
                            {style.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#0202ff]" />
                      Recommended New Competencies
                    </h3>
                    <Button
                      size="sm"
                      style={{ backgroundColor: "#0202ff" }}
                      className="hover:opacity-90 h-7 text-xs"
                      onClick={createAllSuggestions}
                      disabled={creatingIds.size > 0}
                    >
                      Create All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {result.suggestions.map((s, i) => {
                      const key = `suggestion-${i}`;
                      const isCreated = createdIds.has(key);
                      const isCreating = creatingIds.has(key);
                      return (
                        <div key={i} className={`p-4 rounded-lg border ${isCreated ? "border-green-200 bg-green-50" : "border-[#0202ff]/20 bg-[#0202ff]/5"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                                {s.category && (
                                  <Badge variant="outline" className="text-xs">{s.category}</Badge>
                                )}
                                {s.field_key && (
                                  <Badge variant="outline" className="text-xs font-mono">{s.field_key}</Badge>
                                )}
                              </div>
                              {s.definition && (
                                <p className="text-xs text-muted-foreground leading-relaxed">{s.definition}</p>
                              )}
                              {s.key_components && s.key_components.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {s.key_components.map((kc, j) => (
                                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                      {kc.name} · {kc.weight}%
                                    </span>
                                  ))}
                                </div>
                              )}
                              {s.reasoning && (
                                <p className="text-xs text-muted-foreground italic mt-1">{s.reasoning}</p>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {isCreated ? (
                                <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Created
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-[#0202ff]/30 text-[#0202ff] hover:bg-[#0202ff]/5"
                                  onClick={() => createSuggestedCompetency(s, i)}
                                  disabled={isCreating}
                                >
                                  {isCreating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                                  Create
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.mappings?.length === 0 && result.suggestions?.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No competencies could be extracted from this file.</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setShowResultDialog(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}