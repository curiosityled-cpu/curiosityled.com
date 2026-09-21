import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Plus, Edit, Trash2, Search, Filter, CheckCircle, X, ChevronDown, ChevronUp, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import CoreCompetenciesCard from "./CoreCompetenciesCard";

const EMPTY_FORM = {
  name: "", field_key: "", category: "", definition: "",
  key_components: [], is_platform_default: true,
};

const CATEGORY_COLORS = {
  Tactical: "bg-orange-100 text-orange-700 border-orange-200",
  "Self Leadership": "bg-purple-100 text-purple-700 border-purple-200",
  "People Leadership": "bg-green-100 text-green-700 border-green-200",
  "Situational Intelligence": "bg-blue-100 text-[#0202ff] border-blue-200",
};

function KeyComponentsEditor({ components, onChange }) {
  const add = () => onChange([...components, { name: "", weight: 0 }]);
  const remove = (i) => onChange(components.filter((_, idx) => idx !== i));
  const update = (i, field, val) =>
    onChange(components.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));
  const totalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Key Components</label>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              totalWeight === 100
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            Total: {totalWeight}%
          </span>
          <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      </div>
      {components.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No key components yet. Click "Add" to define skills.</p>
      )}
      <div className="space-y-2">
        {components.map((comp, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={comp.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Component name (e.g., Critical analysis)"
              className="flex-1 h-8 text-sm"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <Input
                type="number"
                min="0"
                max="100"
                value={comp.weight}
                onChange={(e) => update(i, "weight", parseInt(e.target.value) || 0)}
                className="w-16 h-8 text-sm text-center"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
              onClick={() => remove(i)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetencyForm({ formData, setFormData, onSubmit, submitLabel }) {
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Decision Making"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Field Key</label>
          <Input
            value={formData.field_key}
            onChange={(e) => setFormData({ ...formData, field_key: e.target.value })}
            placeholder="e.g., dm"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Category</label>
        <Input
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., Tactical, Self Leadership, People Leadership"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Definition</label>
        <Textarea
          value={formData.definition}
          onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
          placeholder="Detailed definition of this competency..."
          rows={3}
        />
      </div>
      <KeyComponentsEditor
        components={formData.key_components || []}
        onChange={(kc) => setFormData({ ...formData, key_components: kc })}
      />
      <Button onClick={onSubmit} className="w-full hover:opacity-90 mt-2" style={{ backgroundColor: "#0202ff" }}>
        <CheckCircle className="w-4 h-4 mr-2" />
        {submitLabel}
      </Button>
    </div>
  );
}

function CompetencyCard({ competency, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const components = competency.key_components || [];
  const categoryColor = CATEGORY_COLORS[competency.category] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground">{competency.name}</h3>
              {competency.field_key && (
                <Badge variant="outline" className="text-xs font-mono">{competency.field_key}</Badge>
              )}
              {competency.category && (
                <Badge className={`text-xs border ${categoryColor}`}>{competency.category}</Badge>
              )}
            </div>
            {competency.definition && (
              <p className="text-sm text-muted-foreground leading-relaxed">{competency.definition}</p>
            )}
            {components.length > 0 && (
              <div>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#0202ff] hover:opacity-80 mt-1"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {components.length} Key Component{components.length !== 1 ? "s" : ""}
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {components.map((comp, i) => (
                          <div key={i} className="bg-muted/40 rounded-lg px-3 py-2 border border-border">
                            <p className="text-xs font-medium text-foreground leading-snug">{comp.name}</p>
                            <p className="text-lg font-bold mt-0.5" style={{ color: "#0202ff" }}>{comp.weight}%</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex rounded-full overflow-hidden h-2 bg-muted">
                        {components.map((comp, i) => (
                          <div
                            key={i}
                            className="h-full"
                            style={{ width: `${comp.weight}%`, backgroundColor: "#0202ff", opacity: 1 - i * 0.15 }}
                            title={`${comp.name}: ${comp.weight}%`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          {competency.is_platform_default ? (
            <div className="flex-shrink-0">
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                System
              </Badge>
            </div>
          ) : (
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompetencyManagerTab() {
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem("competencyCollapsedCategories") || "{}"); }
    catch { return {}; }
  });

  useEffect(() => { loadCompetencies(); }, []);

  const toggleCategory = (category) => {
    setCollapsedCategories((prev) => {
      const next = { ...prev, [category]: !prev[category] };
      localStorage.setItem("competencyCollapsedCategories", JSON.stringify(next));
      return next;
    });
  };

  const loadCompetencies = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Competency.list("-created_date");
      setCompetencies(data);
    } catch (e) {
      toast.error("Failed to load competencies");
    } finally {
      setLoading(false);
    }
  };

  const validateWeights = () => {
    const total = (formData.key_components || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    if (formData.key_components?.length > 0 && total !== 100) {
      toast.error(`Key component weights must add up to 100% (currently ${total}%)`);
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateWeights()) return;
    try {
      await base44.entities.Competency.create(formData);
      toast.success("Competency created");
      setShowCreateDialog(false);
      setFormData(EMPTY_FORM);
      await loadCompetencies();
    } catch (e) {
      toast.error("Failed to create competency");
    }
  };

  const handleUpdate = async () => {
    if (!validateWeights()) return;
    try {
      await base44.entities.Competency.update(editingCompetency.id, formData);
      toast.success("Competency updated");
      setEditingCompetency(null);
      setFormData(EMPTY_FORM);
      await loadCompetencies();
    } catch (e) {
      toast.error("Failed to update competency");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this competency?")) return;
    try {
      await base44.entities.Competency.delete(id);
      toast.success("Competency deleted");
      await loadCompetencies();
    } catch (e) {
      toast.error("Failed to delete competency");
    }
  };

  const openEdit = (competency) => {
    setEditingCompetency(competency);
    setFormData({
      name: competency.name || "",
      field_key: competency.field_key || "",
      category: competency.category || "",
      definition: competency.definition || "",
      key_components: competency.key_components || [],
      is_platform_default: competency.is_platform_default || false,
    });
  };

  const filteredCompetencies = competencies.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.definition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.key_components?.some((kc) => kc.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === "all" || c.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const CATEGORY_ORDER = ["Tactical", "Self Leadership", "People Leadership", "Situational Intelligence"];

  const categories = [
    ...CATEGORY_ORDER.filter((cat) => competencies.some((c) => c.category === cat)),
    ...[...new Set(competencies.map((c) => c.category).filter(Boolean))]
      .filter((cat) => !CATEGORY_ORDER.includes(cat) && cat !== "Uncategorized")
      .sort(),
    ...(competencies.some((c) => c.category === "Uncategorized") ? ["Uncategorized"] : []),
  ];

  const grouped = filteredCompetencies.reduce((acc, c) => {
    const cat = c.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  // Render categories in the fixed order above, then any others alphabetically, then Uncategorized last
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((cat) => grouped[cat]),
    ...Object.keys(grouped)
      .filter((cat) => !CATEGORY_ORDER.includes(cat) && cat !== "Uncategorized")
      .sort(),
    ...(grouped["Uncategorized"] ? ["Uncategorized"] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Super Admin: Core competency selection */}
      <CoreCompetenciesCard />

      {/* Filters & Actions — bordered section with header bar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter & Search
          </span>
        </div>
        <div className="p-5">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search competencies or key components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[210px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog
              open={showCreateDialog}
              onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setFormData(EMPTY_FORM); }}
            >
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: "#0202ff" }} className="hover:opacity-90 flex-shrink-0">
                  <Plus className="w-4 h-4 mr-2" /> Create Competency
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Competency</DialogTitle>
                </DialogHeader>
                <CompetencyForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleCreate}
                  submitLabel="Create Competency"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingCompetency}
        onOpenChange={(open) => { if (!open) { setEditingCompetency(null); setFormData(EMPTY_FORM); } }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit: {editingCompetency?.name}</DialogTitle>
          </DialogHeader>
          <CompetencyForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Competency Library — bordered section with header bar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Competency Library
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{filteredCompetencies.length} shown</span>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0202ff" }} />
            </div>
          ) : filteredCompetencies.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No competencies found</p>
            </div>
          ) : (
            <div className="space-y-8">
              {orderedCategories.map((category) => {
                const items = grouped[category];
                const collapsed = collapsedCategories[category];
                return (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-3 mb-3 w-full text-left group"
                  >
                    {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                      {category}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3">
                          {items.map((competency, idx) => (
                            <motion.div
                              key={competency.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                            >
                              <CompetencyCard
                                competency={competency}
                                onEdit={() => openEdit(competency)}
                                onDelete={() => handleDelete(competency.id)}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}