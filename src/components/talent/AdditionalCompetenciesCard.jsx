import React, { useState, useMemo } from "react";
import { Layers, Search, ChevronDown, ChevronRight, Plus, Edit, Trash2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useClient } from "@/components/contexts/ClientContext";
import { useAuth } from "@/lib/AuthContext";

const CATEGORY_COLORS = {
  Tactical: "bg-orange-100 text-orange-700 border-orange-200",
  "Self Leadership": "bg-purple-100 text-purple-700 border-purple-200",
  "People Leadership": "bg-green-100 text-green-700 border-green-200",
  "Situational Intelligence": "bg-blue-100 text-[#0202ff] border-blue-200",
};

const CATEGORY_ORDER = ["Tactical", "Self Leadership", "People Leadership", "Situational Intelligence"];

export default function AdditionalCompetenciesCard({ competencies, onEdit, onDelete, canEdit }) {
  const { client } = useClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const selectedIds = client?.selected_competency_ids || [];
  const clientId = user?.client_id || user?.data?.client_id;

  // Additional competencies = client-specific (non-platform-default) AND not in the core set
  const additionalCompetencies = useMemo(() => {
    return competencies.filter((c) => {
      const isClientOwned = !c.is_platform_default && c.client_id === clientId;
      const isNotCore = !selectedIds.includes(c.id);
      return isClientOwned && isNotCore;
    });
  }, [competencies, clientId, selectedIds]);

  const filtered = additionalCompetencies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.definition?.toLowerCase().includes(q) ||
      c.key_components?.some((kc) => kc.name?.toLowerCase().includes(q))
    );
  });

  const grouped = filtered.reduce((acc, c) => {
    const cat = c.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((cat) => grouped[cat]),
    ...Object.keys(grouped)
      .filter((cat) => !CATEGORY_ORDER.includes(cat) && cat !== "Uncategorized")
      .sort(),
    ...(grouped["Uncategorized"] ? ["Uncategorized"] : []),
  ];

  const toggleCategory = (cat) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Organization Specific Competencies
          </span>
          <span className="text-xs text-muted-foreground">({additionalCompetencies.length})</span>
        </div>
        {additionalCompetencies.length > 0 && (
          <span className="text-xs text-muted-foreground italic">
            Not part of your core set
          </span>
        )}
      </div>

      <div className="p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          Competencies specific to your organization that sit outside your core selection. These are available for development plans, assessments, and reporting but aren't measured as part of your primary leadership framework.
        </p>

        {additionalCompetencies.length === 0 ? (
          <div className="py-8 text-center">
            <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No additional competencies yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Import from a file or create custom competencies — they'll appear here.
            </p>
          </div>
        ) : (
          <>
            {additionalCompetencies.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search additional competencies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            )}

            <div className="space-y-5">
              {orderedCategories.map((category) => {
                const items = grouped[category];
                const collapsed = collapsedCategories[category];
                return (
                  <div key={category}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-3 mb-2 w-full text-left group"
                    >
                      {collapsed ? (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                        {category}
                      </h3>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">{items.length}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2">
                            {items.map((c) => {
                              const categoryColor = CATEGORY_COLORS[c.category] || "bg-gray-100 text-gray-700 border-gray-200";
                              return (
                                <div
                                  key={c.id}
                                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                                >
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                                      {c.field_key && (
                                        <Badge variant="outline" className="text-xs font-mono">{c.field_key}</Badge>
                                      )}
                                      {c.category && (
                                        <Badge className={`text-xs border ${categoryColor}`}>{c.category}</Badge>
                                      )}
                                    </div>
                                    {c.definition && (
                                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{c.definition}</p>
                                    )}
                                  </div>
                                  {canEdit && (
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => onEdit(c)}
                                      >
                                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => onDelete(c.id)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}