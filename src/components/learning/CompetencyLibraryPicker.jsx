import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_COLORS = {
  Tactical: "bg-orange-100 text-orange-700 border-orange-200",
  "Self Leadership": "bg-purple-100 text-purple-700 border-purple-200",
  "People Leadership": "bg-green-100 text-green-700 border-green-200",
  "Situational Intelligence": "bg-blue-100 text-[#0202ff] border-blue-200",
};

const CATEGORY_ORDER = ["Tactical", "Self Leadership", "People Leadership", "Situational Intelligence"];

export default function CompetencyLibraryPicker({ selected = [], onChange }) {
  const [competencies, setCompetencies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

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

  const grouped = useMemo(() => {
    const filtered = competencies.filter(c =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.definition?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase())
    );
    const map = {};
    filtered.forEach(c => {
      const cat = c.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(c);
    });
    return map;
  }, [competencies, search]);

  const toggle = (name) => {
    if (selected.includes(name)) {
      onChange(selected.filter(s => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const orderedCategories = [
    ...CATEGORY_ORDER.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c))
  ];

  return (
    <div className="border rounded-xl bg-white border-gray-100">
      <div className="p-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-[#0202ff]" />
          <span className="text-sm font-medium">Competency Library</span>
          {selected.length > 0 && (
            <Badge className="bg-[#0202ff]/10 text-[#0202ff] border-[#0202ff]/20">
              {selected.length} selected
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search competencies..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setExpanded(true); }}
            onFocus={() => setExpanded(true)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {selected.length > 0 && !expanded && (
        <div className="px-3 pb-3 text-xs text-gray-500">Click the search bar to browse the competency library.</div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading competencies...</div>
            ) : (
              <ScrollArea className="h-64">
                <div className="p-3 space-y-4">
                  {orderedCategories.map(category => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                          {category}
                        </span>
                        <span className="text-xs text-gray-400">{grouped[category].length}</span>
                      </div>
                      <div className="space-y-1">
                        {grouped[category].map(comp => {
                          const isSelected = selected.includes(comp.name);
                          return (
                            <label
                              key={comp.id}
                              className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-[#0202ff]/5" : "hover:bg-gray-50"}`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggle(comp.name)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 block">{comp.name}</span>
                                {comp.definition && (
                                  <span className="text-xs text-gray-500 line-clamp-2">{comp.definition}</span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {orderedCategories.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-500">No competencies found</div>
                  )}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}