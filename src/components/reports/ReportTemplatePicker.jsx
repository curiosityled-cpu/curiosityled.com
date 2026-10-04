import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle } from "lucide-react";
import { BUILTIN_TEMPLATES, AVAILABLE_METRICS, normalizeCustomTemplate, getIconByName } from "./reportTemplates";
import { base44 } from "@/api/base44Client";

export default function ReportTemplatePicker({ open, onOpenChange, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customTemplates, setCustomTemplates] = useState([]);

  useEffect(() => {
    if (open) loadCustom();
  }, [open]);

  const loadCustom = async () => {
    try {
      const records = await base44.entities.ReportTemplate.list('-created_date');
      setCustomTemplates(records || []);
    } catch { setCustomTemplates([]); }
  };

  const allTemplates = useMemo(() => {
    return [...BUILTIN_TEMPLATES, ...customTemplates.map(normalizeCustomTemplate)];
  }, [customTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, [allTemplates]);

  const filtered = useMemo(() => {
    return allTemplates.filter(t => {
      const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [allTemplates, selectedCategory, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 py-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No templates found</p>
            </div>
          ) : (
            filtered.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="w-full text-left border border-gray-100 rounded-xl p-3 hover:border-[#0202ff]/30 hover:shadow-sm transition-all group flex items-start gap-3"
                >
                  <div className={`w-9 h-9 ${template.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{template.name}</h4>
                      {template.is_custom && <Badge variant="outline" className="text-[10px] bg-[#0202ff]/5 text-[#0202ff] border-[#0202ff]/20">Custom</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{template.category}</Badge>
                      <span className="text-[10px] text-gray-400">{template.metrics.length} metrics · {template.output_format.toUpperCase()}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}