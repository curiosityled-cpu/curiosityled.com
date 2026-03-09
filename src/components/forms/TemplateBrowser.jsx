import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Copy, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function TemplateBrowser({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await base44.entities.CustomFormTemplate.list();
      setTemplates(allTemplates);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCloneTemplate = async (template) => {
    try {
      const clonedForm = await base44.entities.CustomForm.create({
        title: `${template.title} (Copy)`,
        description: template.description,
        form_type: template.form_type,
        form_category: template.form_category,
        status: "draft",
        template_id: template.id,
        config: template.config
      });

      toast.success("Template cloned successfully");
      window.location.href = `${createPageUrl("FormBuilder")}?formId=${clonedForm.id}`;
    } catch (error) {
      console.error("Error cloning template:", error);
      toast.error("Failed to clone template");
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.form_category === categoryFilter;
    const matchesType = typeFilter === "all" || template.form_type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const formTypeLabels = {
    'request': 'Request Form',
    'enrollment': 'Enrollment',
    '360_assessment': '360 Assessment',
    'disc_assessment': 'DISC',
    'mbti_assessment': 'MBTI',
    'kirkpatrick_level_1': 'Kirkpatrick L1',
    'kirkpatrick_level_2': 'Kirkpatrick L2',
    'kirkpatrick_level_3': 'Kirkpatrick L3',
    'kirkpatrick_level_4': 'Kirkpatrick L4',
    'coaching_evaluation_1on1': 'Coaching 1:1',
    'coaching_evaluation_group': 'Coaching Group'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="evaluation">Evaluation</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(formTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No templates found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base mb-2">{template.title}</CardTitle>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {template.form_category}
                      </Badge>
                      {template.is_platform_default && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          Platform Default
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {template.description}
                </p>

                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {template.use_count > 0 && (
                  <p className="text-xs text-gray-500">
                    Used {template.use_count} times
                  </p>
                )}

                <Button
                  onClick={() => handleCloneTemplate(template)}
                  className="w-full"
                  size="sm"
                  style={{ backgroundColor: '#0202ff' }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Clone Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}