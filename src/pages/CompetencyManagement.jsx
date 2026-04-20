import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Plus, Edit, Trash2, Search, Filter, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import PageHeader from "@/components/common/PageHeader";

function CompetencyManagement() {
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    field_key: '',
    category: '',
    definition: '',
    is_platform_default: true
  });

  useEffect(() => {
    loadCompetencies();
  }, []);

  const loadCompetencies = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Competency.list('-created_date');
      setCompetencies(data);
    } catch (error) {
      console.error('Error loading competencies:', error);
      toast.error('Failed to load competencies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await base44.entities.Competency.create(formData);
      toast.success('Competency created successfully');
      setShowCreateDialog(false);
      setFormData({
        name: '',
        field_key: '',
        category: '',
        definition: '',
        is_platform_default: true
      });
      await loadCompetencies();
    } catch (error) {
      console.error('Error creating competency:', error);
      toast.error('Failed to create competency');
    }
  };

  const handleUpdate = async () => {
    try {
      await base44.entities.Competency.update(editingCompetency.id, formData);
      toast.success('Competency updated successfully');
      setEditingCompetency(null);
      setFormData({
        name: '',
        field_key: '',
        category: '',
        definition: '',
        is_platform_default: true
      });
      await loadCompetencies();
    } catch (error) {
      console.error('Error updating competency:', error);
      toast.error('Failed to update competency');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this competency?')) return;

    try {
      await base44.entities.Competency.delete(id);
      toast.success('Competency deleted successfully');
      await loadCompetencies();
    } catch (error) {
      console.error('Error deleting competency:', error);
      toast.error('Failed to delete competency');
    }
  };

  const openEditDialog = (competency) => {
    setEditingCompetency(competency);
    setFormData({
      name: competency.name || '',
      field_key: competency.field_key || '',
      category: competency.category || '',
      definition: competency.definition || '',
      is_platform_default: competency.is_platform_default || false
    });
  };

  const filteredCompetencies = competencies.filter(c => {
    const matchesSearch = !searchTerm || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.definition?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || c.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(competencies.map(c => c.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 animate-pulse mx-auto mb-4" style={{ color: '#0202ff' }} />
          <p className="text-gray-600">Loading competencies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Competency Management"
          subtitle="Manage leadership competencies and their definitions"
          badges={[
            { text: 'Platform Admin', className: "bg-white text-[#0202ff]" },
            { text: `${competencies.length} Total`, className: "bg-white text-blue-600" }
          ]}
          onRefresh={loadCompetencies}
          headerColor="#0202ff"
        />

        {/* Filters & Actions */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search competencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button style={{ backgroundColor: '#0202ff' }} className="hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Competency
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Competency</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., Decision Making"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Field Key</label>
                      <Input
                        value={formData.field_key}
                        onChange={(e) => setFormData({...formData, field_key: e.target.value})}
                        placeholder="e.g., dm (for analytics mapping)"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        placeholder="e.g., Tactical"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Definition</label>
                      <Textarea
                        value={formData.definition}
                        onChange={(e) => setFormData({...formData, definition: e.target.value})}
                        placeholder="Detailed definition of this competency..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleCreate} className="w-full hover:opacity-90" style={{ backgroundColor: '#0202ff' }}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Competency
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Competencies List */}
        <div className="space-y-4">
          {filteredCompetencies.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No competencies found</p>
              </CardContent>
            </Card>
          ) : (
            filteredCompetencies.map((competency, idx) => (
              <motion.div
                key={competency.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">{competency.name}</h3>
                          {competency.field_key && (
                            <Badge variant="outline" className="text-xs">
                              {competency.field_key}
                            </Badge>
                          )}
                          {competency.category && (
                            <Badge className="bg-blue-100 text-[#0202ff]">
                              {competency.category}
                            </Badge>
                          )}
                          {competency.is_platform_default && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Platform Default
                            </Badge>
                          )}
                        </div>

                        {competency.definition && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {competency.definition}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(competency)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Competency</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Name</label>
                                <Input
                                  value={formData.name}
                                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Field Key</label>
                                <Input
                                  value={formData.field_key}
                                  onChange={(e) => setFormData({...formData, field_key: e.target.value})}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Category</label>
                                <Input
                                  value={formData.category}
                                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Definition</label>
                                <Textarea
                                  value={formData.definition}
                                  onChange={(e) => setFormData({...formData, definition: e.target.value})}
                                  rows={4}
                                />
                              </div>
                              <Button onClick={handleUpdate} className="w-full hover:opacity-90" style={{ backgroundColor: '#0202ff' }}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Update Competency
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(competency.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuthProtection(CompetencyManagement, {
  allowedRoles: ['Platform Admin']
});