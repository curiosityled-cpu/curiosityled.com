import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookOpen, X, ExternalLink, Loader2 } from "lucide-react";

const TYPE_COLORS = {
  book: "bg-amber-50 text-amber-700 border-amber-100",
  course: "bg-blue-50 text-blue-700 border-blue-100",
  article: "bg-gray-50 text-gray-700 border-gray-100",
  video: "bg-rose-50 text-rose-700 border-rose-100",
  podcast: "bg-purple-50 text-purple-700 border-purple-100",
  whitepaper: "bg-slate-50 text-slate-700 border-slate-100",
  assessment_tool: "bg-emerald-50 text-emerald-700 border-emerald-100",
  document: "bg-gray-50 text-gray-700 border-gray-100",
  quiz: "bg-indigo-50 text-indigo-700 border-indigo-100",
  external_link: "bg-sky-50 text-sky-700 border-sky-100",
};

export default function LearningResourcePicker({ selected = [], onChange }) {
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.LearningResource.list("title", 200);
        setResources(data || []);
      } catch (e) {
        console.error("Failed to load learning resources:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // selected is an array of {resource_id, title, provider, url}
  const selectedIds = useMemo(() => selected.map((s) => s.resource_id).filter(Boolean), [selected]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return resources.filter((r) =>
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.provider?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  }, [resources, search]);

  const toggle = (r) => {
    if (selectedIds.includes(r.id)) {
      onChange(selected.filter((s) => s.resource_id !== r.id));
    } else {
      onChange([...selected, { resource_id: r.id, title: r.title, provider: r.provider, url: r.url }]);
    }
  };

  const remove = (resource_id) => onChange(selected.filter((s) => s.resource_id !== resource_id));

  return (
    <div className="space-y-2">
      {/* Selected */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge key={s.resource_id || s.title} variant="secondary" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {s.title}
              <button type="button" onClick={() => remove(s.resource_id)}><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search the content library..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <ScrollArea className="h-56 rounded-xl border border-gray-100 bg-white">
        <div className="p-2 space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading library...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No resources found</div>
          ) : (
            filtered.map((r) => {
              const isSelected = selectedIds.includes(r.id);
              return (
                <label key={r.id} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-[#0202ff]/5" : "hover:bg-gray-50"}`}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggle(r)} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                      {r.type && <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[r.type] || "bg-gray-50 text-gray-600 border-gray-100"}`}>{r.type}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {r.provider || "Unknown provider"}
                      {r.duration_string ? ` · ${r.duration_string}` : ""}
                      {r.cost_string ? ` · ${r.cost_string}` : ""}
                    </p>
                  </div>
                  {r.url && <a href={r.url} target="_blank" rel="noreferrer" onClick={(e) => e.preventDefault()} className="text-gray-300 hover:text-[#0202ff]"><ExternalLink className="w-3.5 h-3.5" /></a>}
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}