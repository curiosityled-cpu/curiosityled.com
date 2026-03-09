import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function MultiStepFormManager({ form, onUpdate }) {
  const [pages, setPages] = useState(form.pages || [
    {
      id: "page_1",
      title: "Page 1",
      section_ids: form.config?.sections?.map(s => s.id) || []
    }
  ]);

  const [enabled, setEnabled] = useState(form.multi_step_enabled || false);

  const addPage = () => {
    const newPage = {
      id: `page_${Date.now()}`,
      title: `Page ${pages.length + 1}`,
      section_ids: []
    };
    const updated = [...pages, newPage];
    setPages(updated);
    savePages(updated);
  };

  const removePage = (pageId) => {
    if (pages.length <= 1) {
      toast.error("Form must have at least one page");
      return;
    }
    const updated = pages.filter(p => p.id !== pageId);
    setPages(updated);
    savePages(updated);
  };

  const updatePageTitle = (pageId, title) => {
    const updated = pages.map(p => 
      p.id === pageId ? { ...p, title } : p
    );
    setPages(updated);
    savePages(updated);
  };

  const toggleSection = (pageId, sectionId) => {
    const updated = pages.map(page => {
      if (page.id === pageId) {
        const hasSection = page.section_ids.includes(sectionId);
        return {
          ...page,
          section_ids: hasSection
            ? page.section_ids.filter(id => id !== sectionId)
            : [...page.section_ids, sectionId]
        };
      } else {
        // Remove from other pages
        return {
          ...page,
          section_ids: page.section_ids.filter(id => id !== sectionId)
        };
      }
    });
    setPages(updated);
    savePages(updated);
  };

  const movePage = (pageId, direction) => {
    const index = pages.findIndex(p => p.id === pageId);
    if ((direction === "up" && index === 0) || (direction === "down" && index === pages.length - 1)) {
      return;
    }

    const updated = [...pages];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    setPages(updated);
    savePages(updated);
  };

  const savePages = (updatedPages) => {
    if (onUpdate) {
      onUpdate({
        pages: updatedPages,
        multi_step_enabled: enabled
      });
    }
  };

  const toggleEnabled = (checked) => {
    setEnabled(checked);
    if (onUpdate) {
      onUpdate({
        pages: pages,
        multi_step_enabled: checked
      });
    }
  };

  const sections = form.config?.sections || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Multi-Step Form
        </CardTitle>
        <p className="text-sm text-gray-600">
          Break your form into multiple pages with progress tracking
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable_multistep"
            checked={enabled}
            onCheckedChange={toggleEnabled}
          />
          <label htmlFor="enable_multistep" className="text-sm font-medium cursor-pointer">
            Enable multi-step form
          </label>
        </div>

        {enabled && (
          <>
            <div className="space-y-3">
              {pages.map((page, index) => (
                <Card key={page.id} className="border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="flex flex-col gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => movePage(page.id, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => movePage(page.id, "down")}
                          disabled={index === pages.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex-1">
                        <Label htmlFor={`page-title-${page.id}`}>Page Title</Label>
                        <Input
                          id={`page-title-${page.id}`}
                          value={page.title}
                          onChange={(e) => updatePageTitle(page.id, e.target.value)}
                          placeholder="Page title"
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePage(page.id)}
                        disabled={pages.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Sections on this page:</Label>
                      {sections.length === 0 ? (
                        <p className="text-xs text-gray-500">No sections available</p>
                      ) : (
                        <div className="space-y-1">
                          {sections.map(section => (
                            <div key={section.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`${page.id}-${section.id}`}
                                checked={page.section_ids.includes(section.id)}
                                onCheckedChange={() => toggleSection(page.id, section.id)}
                              />
                              <label
                                htmlFor={`${page.id}-${section.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {section.title}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2">
                      <Badge variant="outline">
                        {page.section_ids.length} section{page.section_ids.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={addPage}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Page
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}