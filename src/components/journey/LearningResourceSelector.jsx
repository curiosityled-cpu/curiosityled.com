import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Check, BookOpen, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LearningResourceSelector({ open, onClose, onSelect, selectedResourceIds = [] }) {
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadResources();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [resources, searchTerm]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.LearningResource.filter({ is_active: true });
      setResources(data);
    } catch (error) {
      console.error('Error loading resources:', error);
      toast.error('Failed to load learning resources');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...resources];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.provider?.toLowerCase().includes(term) ||
        r.competencies?.some(c => c.toLowerCase().includes(term))
      );
    }

    setFilteredResources(filtered);
  };

  const handleSelect = (resource) => {
    onSelect(resource);
  };

  const isSelected = (resourceId) => {
    return selectedResourceIds.includes(resourceId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Learning Resources</DialogTitle>
          <DialogDescription>
            Choose resources from the learning library to add to your journey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by title, provider, or competency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[50vh]">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading resources...</div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No resources found. Try adjusting your search.
              </div>
            ) : (
              <div className="grid gap-4 p-2">
                {filteredResources.map((resource) => (
                  <div
                    key={resource.id}
                    className={`p-4 border rounded-lg hover:border-blue-300 transition-colors cursor-pointer ${
                      isSelected(resource.id) ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelect(resource)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          {resource.thumbnail_url && (
                            <img
                              src={resource.thumbnail_url}
                              alt={resource.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{resource.title}</h4>
                              {isSelected(resource.id) && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {resource.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs">
                                {resource.type}
                              </Badge>
                              {resource.provider && (
                                <Badge variant="outline" className="text-xs">
                                  {resource.provider}
                                </Badge>
                              )}
                              {resource.duration_string && (
                                <Badge variant="outline" className="text-xs">
                                  {resource.duration_string}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}