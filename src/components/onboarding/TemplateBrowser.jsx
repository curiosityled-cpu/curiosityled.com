import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Sparkles, Clock, TrendingUp, Filter, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TEMPLATE_CATEGORIES = [
  { value: 'all', label: 'All Templates' },
  { value: 'technical', label: 'Technical' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'general', label: 'General' },
  { value: 'custom', label: 'Custom' }
];

export default function TemplateBrowser({ isOpen, onClose, onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (templates.length > 0) {
      const tags = [...new Set(templates.flatMap(t => t.template_tags || []))];
      setAllTags(tags);
    }
  }, [templates]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allPlans = await base44.entities.OnboardingPlan.filter({ is_template: true });
      setTemplates(allPlans);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.target_role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.template_category === selectedCategory;
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => template.template_tags?.includes(tag));
    
    return matchesSearch && matchesCategory && matchesTags;
  });

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_date) - new Date(a.created_date);
      case 'popular':
        return (b.use_count || 0) - (a.use_count || 0);
      case 'name':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const handleSelectTemplate = async (template) => {
    try {
      await base44.entities.OnboardingPlan.update(template.id, {
        use_count: (template.use_count || 0) + 1,
        last_used_date: new Date().toISOString()
      });
      onSelectTemplate(template);
      onClose();
    } catch (error) {
      console.error('Error updating template:', error);
      onSelectTemplate(template);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" />
            Template Library
          </DialogTitle>
          <DialogDescription>
            Browse and select reusable onboarding plan templates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="recent">Recently Created</option>
                <option value="popular">Most Used</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            {/* Categories */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <TabsTrigger key={cat.value} value={cat.value}>
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Tag Filters */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-500" />
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-purple-100"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="text-xs"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Templates Grid */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-600 mt-4">Loading templates...</p>
              </div>
            ) : sortedTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No templates found</p>
                <p className="text-sm text-gray-500">Try adjusting your filters or create a new template</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                {sortedTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-purple-300"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {template.description || 'No description'}
                          </p>
                        </div>
                        {template.ai_generated && (
                          <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 ml-2" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {template.template_category && (
                          <Badge variant="outline" className="text-xs">
                            {template.template_category}
                          </Badge>
                        )}
                        {template.target_role && (
                          <Badge variant="outline" className="text-xs">
                            {template.target_role}
                          </Badge>
                        )}
                        {template.duration_days && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.duration_days} days
                          </Badge>
                        )}
                        {template.milestones?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {template.milestones.length} milestones
                          </Badge>
                        )}
                      </div>

                      {template.template_tags && template.template_tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-3">
                          {template.template_tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} className="bg-purple-100 text-purple-700 text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.template_tags.length > 3 && (
                            <Badge className="bg-gray-100 text-gray-600 text-xs">
                              +{template.template_tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {template.use_count > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <TrendingUp className="w-3 h-3" />
                          Used {template.use_count} time{template.use_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}