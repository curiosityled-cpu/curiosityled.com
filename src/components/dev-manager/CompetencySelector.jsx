import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, X, ChevronDown, Loader2, Layers } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CATEGORY_COLORS = {
  Tactical: "bg-orange-100 text-orange-700 border-orange-200",
  "Self Leadership": "bg-purple-100 text-purple-700 border-purple-200",
  "People Leadership": "bg-green-100 text-green-700 border-green-200",
  "Situational Intelligence": "bg-blue-100 text-[#0202ff] border-blue-200",
};

export default function CompetencySelector({ selected = [], onChange, journeyTitle = "", journeyDescription = "" }) {
  const [competencies, setCompetencies] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadCompetencies();
  }, []);

  const loadCompetencies = async () => {
    try {
      const data = await base44.entities.Competency.list("name");
      setCompetencies(data || []);
    } catch (e) {
      console.error("Failed to load competencies:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return competencies;
    const q = search.toLowerCase();
    return competencies.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.definition?.toLowerCase().includes(q)
    );
  }, [competencies, search]);

  const toggle = (name) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const handleAIAssist = async () => {
    if (!journeyTitle.trim()) {
      toast.error("Add a title first so AI can suggest relevant competencies");
      return;
    }
    setAiLoading(true);
    try {
      const compNames = competencies.map((c) => c.name);
      const prompt = `You are a leadership development expert. Given a learning journey, select the most relevant competencies from the provided library.

Journey title: ${journeyTitle}
Journey description: ${journeyDescription || "(none provided)"}

Available competencies in the library:
${compNames.map((n) => `- ${n}`).join("\n")}

Return a JSON object with a "competencies" array of 3-6 competency names drawn ONLY from the list above that this journey should target. Pick the most directly relevant ones.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            competencies: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      });

      const suggested = (res.competencies || []).filter((name) =>
        compNames.includes(name)
      );
      const merged = Array.from(new Set([...selected, ...suggested]));
      onChange(merged);
      if (suggested.length > 0) {
        toast.success(`AI suggested ${suggested.length} competenc${suggested.length > 1 ? "ies" : "y"}`);
      } else {
        toast.error("AI couldn't match any library competencies");
      }
    } catch (e) {
      console.error(e);
      toast.error("AI assist failed");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#0202ff]" /> Target Competencies
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAIAssist}
          disabled={aiLoading || loading}
          className="h-7 text-xs gap-1.5 border-[#0202ff]/20 text-[#0202ff] hover:bg-[#0202ff]/5"
        >
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {aiLoading ? "Suggesting..." : "AI Assist"}
        </Button>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => {
            const comp = competencies.find((c) => c.name === name);
            const cat = comp?.category;
            return (
              <Badge
                key={name}
                variant="secondary"
                className={`gap-1 ${cat ? CATEGORY_COLORS[cat] : ""}`}
              >
                {name}
                <button type="button" onClick={() => toggle(name)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full h-9 px-3 text-sm text-left border border-gray-200 rounded-lg bg-white flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
        >
          <span className="text-gray-500">
            {loading ? "Loading library..." : selected.length > 0 ? `${selected.length} selected — add more` : "Select from competency library"}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden flex flex-col">
              <div className="p-2 border-b sticky top-0 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search competencies..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No competencies found</div>
                ) : (
                  filtered.map((comp) => {
                    const isSelected = selected.includes(comp.name);
                    return (
                      <button
                        type="button"
                        key={comp.id}
                        onClick={() => toggle(comp.name)}
                        className={`w-full text-left p-2.5 flex items-start gap-2 transition-colors ${isSelected ? "bg-[#0202ff]/5" : "hover:bg-gray-50"}`}
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[#0202ff] border-[#0202ff]" : "border-gray-300"}`}>
                          {isSelected && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900">{comp.name}</span>
                            {comp.category && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[comp.category] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                {comp.category}
                              </span>
                            )}
                          </div>
                          {comp.definition && (
                            <span className="text-xs text-gray-500 line-clamp-1">{comp.definition}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}