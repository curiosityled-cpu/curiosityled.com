import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Plus, Edit, Trash2, Search, Filter, CheckCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import PageHeader from "@/components/common/PageHeader";

const EMPTY_FORM = {
  name: '', field_key: '', category: '', definition: '',
  key_components: [], is_platform_default: true
};

const CATEGORY_COLORS = {
  'Tactical': 'bg-orange-100 text-orange-700',
  'Self Leadership': 'bg-purple-100 text-purple-700',
  'People Leadership': 'bg-green-100 text-green-700',
  'Situational Intelligence': 'bg-blue-100 text-[#0202ff]',
};

function KeyComponentsEditor({ components, onChange }) {
  const add = () => onChange([...components, { name: '', weight: 0 }]);
  const remove = (i) => onChange(components.filter((_, idx) => idx !== i));
  const update = (i, field, val) => onChange(components.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const totalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Key Components</label>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            Total: {totalWeight}%
          </span>
          <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      </div>
      {components.length === 0 && (
        <p className="text-xs text-gray-400 italic">No key components yet. Click "Add" to define skills.</p>
      )}
      <div className="space-y-2">
        {components.map((comp, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={comp.name}
              onChange={(e) => update(i, 'name', e.target.value)}
              placeholder="Component name (e.g., Critical analysis)"
              className="flex-1 h-8 text-sm"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <Input
                type="number"
                min="0"
                max="100"
                value={comp.weight}
                onChange={(e) => update(i, 'weight', parseInt(e.target.value) || 0)}
                className="w-16 h-8 text-sm text-center"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => remove(i)}>
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
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Decision Making" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Field Key</label>
          <Input value={formData.field_key} onChange={(e) => setFormData({ ...formData, field_key: e.target.value })} placeholder="e.g., dm" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Category</label>
        <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g., Tactical, Self Leadership, People Leadership" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Definition</label>
        <Textarea value={formData.definition} onChange={(e) => setFormData({ ...formData, definition: e.target.value })} placeholder="Detailed definition of this competency..." rows={3} />
      </div>
      <KeyComponentsEditor
        components={formData.key_components || []}
        onChange={(kc) => setFormData({ ...formData, key_components: kc })}
      />
      <Button onClick={onSubmit} className="w-full hover:opacity-90 mt-2" style={{ backgroundColor: '#0202ff' }}>
        <CheckCircle className="w-4 h-4 mr-2" />
        {submitLabel}
      </Button>
    </div>
  );
}

function CompetencyCard({ competency, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const components = competency.key_components || [];
  const categoryColor = CATEGORY_COLORS[competency.category] || 'bg-gray-100 text-gray-700';

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900">{competency.name}</h3>
              {competency.field_key && <Badge variant="outline" className="text-xs font-mono">{competency.field_key}</Badge>}
              {competency.category && <Badge className={`text-xs ${categoryColor}`}>{competency.category}</Badge>}
            </div>

            {/* Definition */}
            {competency.definition && (
              <p className="text-sm text-gray-500 leading-relaxed">{competency.definition}</p>
            )}

            {/* Key Components toggle */}
            {components.length > 0 && (
              <div>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#0202ff] hover:opacity-80 mt-1"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {components.length} Key Component{components.length !== 1 ? 's' : ''}
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {components.map((comp, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <p className="text-xs font-medium text-gray-800 leading-snug">{comp.name}</p>
                            <p className="text-lg font-bold mt-0.5" style={{ color: '#0202ff' }}>{comp.weight}%</p>
                          </div>
                        ))}
                      </div>
                      {/* Weight bar */}
                      <div className="mt-3 flex rounded-full overflow-hidden h-2 bg-gray-100">
                        {components.map((comp, i) => (
                          <div
                            key={i}
                            className="h-full"
                            style={{ width: `${comp.weight}%`, backgroundColor: '#0202ff', opacity: 1 - i * 0.15 }}
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

          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="w-4 h-4 text-gray-400" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompetencyManagement() {
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => { loadCompetencies(); }, []);

  const loadCompetencies = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Competency.list('-created_date');
      setCompetencies(data);
    } catch (e) {
      toast.error('Failed to load competencies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const total = (formData.key_components || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    if (formData.key_components?.length > 0 && total !== 100) {
      toast.error(`Key component weights must add up to 100% (currently ${total}%)`);
      return;
    }
    try {
      await base44.entities.Competency.create(formData);
      toast.success('Competency created');
      setShowCreateDialog(false);
      setFormData(EMPTY_FORM);
      await loadCompetencies();
    } catch (e) {
      toast.error('Failed to create competency');
    }
  };

  const handleUpdate = async () => {
    const total = (formData.key_components || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    if (formData.key_components?.length > 0 && total !== 100) {
      toast.error(`Key component weights must add up to 100% (currently ${total}%)`);
      return;
    }
    try {
      await base44.entities.Competency.update(editingCompetency.id, formData);
      toast.success('Competency updated');
      setEditingCompetency(null);
      setFormData(EMPTY_FORM);
      await loadCompetencies();
    } catch (e) {
      toast.error('Failed to update competency');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this competency?')) return;
    try {
      await base44.entities.Competency.delete(id);
      toast.success('Competency deleted');
      await loadCompetencies();
    } catch (e) {
      toast.error('Failed to delete competency');
    }
  };

  const openEdit = (competency) => {
    setEditingCompetency(competency);
    setFormData({
      name: competency.name || '',
      field_key: competency.field_key || '',
      category: competency.category || '',
      definition: competency.definition || '',
      key_components: competency.key_components || [],
      is_platform_default: competency.is_platform_default || false,
    });
  };

  const filteredCompetencies = competencies.filter(c => {
    const matchesSearch = !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.definition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.key_components?.some(kc => kc.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || c.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(competencies.map(c => c.category).filter(Boolean))];

  // Group by category for display
  const grouped = filteredCompetencies.reduce((acc, c) => {
    const cat = c.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Brain className="w-12 h-12 animate-pulse" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Competency Management"
          subtitle="Manage leadership competencies, definitions, and key skill components"
          badges={[
            { text: 'Platform Admin', className: "bg-white text-[#0202ff]" },
            { text: `${competencies.length} Competencies`, className: "bg-white text-blue-600" }
          ]}
          onRefresh={loadCompetencies}
          headerColor="#0202ff"
        />

        {/* Filters & Actions */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search competencies or key components..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-[210px]">
                  <Filter className="w-4 h-4 mr-2 text-gray-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>

              <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setFormData(EMPTY_FORM); }}>
                <DialogTrigger asChild>
                  <Button style={{ backgroundColor: '#0202ff' }} className="hover:opacity-90 flex-shrink-0">
                    <Plus className="w-4 h-4 mr-2" /> Create Competency
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Competency</DialogTitle>
                  </DialogHeader>
                  <CompetencyForm formData={formData} setFormData={setFormData} onSubmit={handleCreate} submitLabel="Create Competency" />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingCompetency} onOpenChange={(open) => { if (!open) { setEditingCompetency(null); setFormData(EMPTY_FORM); } }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit: {editingCompetency?.name}</DialogTitle>
            </DialogHeader>
            <CompetencyForm formData={formData} setFormData={setFormData} onSubmit={handleUpdate} submitLabel="Save Changes" />
          </DialogContent>
        </Dialog>

        {/* Competencies grouped by category */}
        {filteredCompetencies.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No competencies found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">{category}</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuthProtection(CompetencyManagement, {
  allowedRoles: ['Platform Admin']
});