import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { BUILTIN_TEMPLATES, AVAILABLE_METRICS, normalizeCustomTemplate, getIconByName } from "./reportTemplates";
import TemplateEditorDialog from "./TemplateEditorDialog";

export default function ReportLibraryTab({ user, onUseTemplate }) {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const canManageTemplates = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin'].includes(user?.app_role);

  useEffect(() => { loadCustomTemplates(); }, []);

  const loadCustomTemplates = async () => {
    setLoading(true);
    try {
      const records = await base44.entities.ReportTemplate.list('-created_date');
      setCustomTemplates(records || []);
    } catch (e) {
      console.warn('Could not load custom templates:', e?.message);
      setCustomTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const allTemplates = useMemo(() => {
    const custom = customTemplates.map(normalizeCustomTemplate);
    return [...BUILTIN_TEMPLATES, ...custom];
  }, [customTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(BUILTIN_TEMPLATES.map(t => t.category));
    customTemplates.forEach(t => { if (t.category) cats.add(t.category); });
    return ['all', ...Array.from(cats)];
  }, [customTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => {
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allTemplates, selectedCategory, searchQuery]);

  const handleDelete = async (template) => {
    if (!template.is_custom || !template._record) return;
    if (!confirm(`Delete custom template "${template.name}"?`)) return;
    try {
      await base44.entities.ReportTemplate.delete(template._record.id);
      toast.success('Template deleted');
      loadCustomTemplates();
    } catch (e) {
      toast.error('Failed to delete template');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template._record);
    setShowEditor(true);
  };

  return (
    <div className="space-y-4">
      {/* Search + Filter + New Template */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManageTemplates && (
          <Button onClick={() => { setEditingTemplate(null); setShowEditor(true); }} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9">
            <Plus className="w-4 h-4 mr-1.5" /> New Template
          </Button>
        )}
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No templates found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTemplates.map((template, index) => {
            const TemplateIcon = template.icon;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
              >
                <div
                  className="border border-gray-100 shadow-sm rounded-2xl p-3 bg-white hover:border-[#0202ff]/30 transition-all cursor-pointer group"
                  onClick={() => onUseTemplate(template)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${template.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <TemplateIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{template.name}</h4>
                        {template.is_custom && <Badge variant="outline" className="text-[10px] bg-[#0202ff]/5 text-[#0202ff] border-[#0202ff]/20">Custom</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{template.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{template.category}</Badge>
                        <span className="text-[10px] text-gray-400">{template.metrics.length} metrics</span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-400">{template.output_format.toUpperCase()}</span>
                      </div>
                    </div>
                    {template.is_custom && canManageTemplates && (
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEdit(template)} className="p-1 rounded hover:bg-gray-100" title="Edit template">
                          <Edit className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => handleDelete(template)} className="p-1 rounded hover:bg-red-50" title="Delete template">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <TemplateEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        editingTemplate={editingTemplate}
        userEmail={user?.email}
        clientId={user?.client_id}
        onSuccess={loadCustomTemplates}
      />
    </div>
  );
}