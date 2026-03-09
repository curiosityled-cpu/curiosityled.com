import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { 
  Plus, 
  FileText, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Loader2,
  Save
} from "lucide-react";
import TemplateBrowser from "@/components/forms/TemplateBrowser";
import SaveAsTemplateModal from "@/components/forms/SaveAsTemplateModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import FailedIntegrationDashboard from "@/components/forms/FailedIntegrationDashboard";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Breadcrumbs from "@/components/common/Breadcrumbs";

function FormBuilderDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveTemplateModal, setSaveTemplateModal] = useState({ open: false, form: null });
  const [activeTab, setActiveTab] = useState("forms");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [formsData, templatesData] = await Promise.all([
        base44.entities.CustomForm.filter({ client_id: user.client_id }),
        base44.entities.CustomFormTemplate.filter({})
      ]);
      setForms(formsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!confirm("Are you sure you want to delete this form?")) return;

    try {
      await base44.entities.CustomForm.delete(formId);
      setForms(forms.filter(f => f.id !== formId));
      toast.success("Form deleted");
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    }
  };

  const handleDuplicateForm = async (form) => {
    try {
      const duplicate = {
        ...form,
        id: undefined,
        title: `${form.title} (Copy)`,
        status: "draft",
        created_date: undefined,
        updated_date: undefined,
        submission_count: 0,
        public_access_enabled: false,
        public_access_config: null,
        assigned_to_emails: []
      };
      
      const created = await base44.entities.CustomForm.create(duplicate);
      setForms([created, ...forms]);
      toast.success("Form duplicated");
    } catch (error) {
      console.error("Error duplicating form:", error);
      toast.error("Failed to duplicate form");
    }
  };

  const handleSaveAsTemplate = (form) => {
    setSaveTemplateModal({ open: true, form });
  };

  const filteredForms = forms.filter(form =>
    form.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800";
      case "draft": return "bg-gray-100 text-gray-800";
      case "archived": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Breadcrumbs */}
        <Breadcrumbs items={[
          { label: 'Experience Management', href: createPageUrl("ExperienceManagement") + "#builders" },
          { label: 'Custom Forms' }
        ]} />
        <Link to={createPageUrl("ExperienceManagement") + "#builders"}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Builders
          </Button>
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Forms</h1>
            <p className="text-gray-600 mt-1">Design custom forms, surveys, and data collection tools</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.href = createPageUrl("FormSystemTest")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Run Tests
            </Button>
            <Button
              onClick={() => window.location.href = createPageUrl("FormBuilder")}
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Form
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="forms">My Forms ({forms.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
            <TabsTrigger value="failed">Failed Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="forms" className="mt-6">
            {filteredForms.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    {searchQuery ? "No forms found matching your search" : "No forms yet. Create your first form to get started."}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => window.location.href = createPageUrl("FormBuilder")}
                      style={{ backgroundColor: '#0202ff' }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Form
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredForms.map((form) => (
                  <Card key={form.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{form.title}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {form.form_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => window.location.href = `${createPageUrl("FormBuilder")}?formId=${form.id}`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {form.status === 'published' && (
                             <DropdownMenuItem
                               onClick={() => window.location.href = `${createPageUrl("FormSubmissions")}?formId=${form.id}`}
                             >
                               <Eye className="w-4 h-4 mr-2" />
                               View Submissions
                             </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicateForm(form)}>
                             <Copy className="w-4 h-4 mr-2" />
                             Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSaveAsTemplate(form)}>
                             <Save className="w-4 h-4 mr-2" />
                             Save as Template
                            </DropdownMenuItem>
                            <DropdownMenuItem
                             onClick={() => handleDeleteForm(form.id)}
                             className="text-red-600"
                            >
                             <Trash2 className="w-4 h-4 mr-2" />
                             Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        <Badge className={getStatusColor(form.status)}>
                          {form.status}
                        </Badge>
                        
                        {form.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {form.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{form.config?.sections?.length || 0} sections</span>
                          <span>{form.submission_count || 0} responses</span>
                        </div>
                        
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.location.href = `${createPageUrl("FormBuilder")}?formId=${form.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Form
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <TemplateBrowser />
          </TabsContent>

          <TabsContent value="failed" className="mt-6">
            <FailedIntegrationDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {saveTemplateModal.open && (
        <SaveAsTemplateModal
          form={saveTemplateModal.form}
          open={saveTemplateModal.open}
          onClose={() => setSaveTemplateModal({ open: false, form: null })}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

export default withAuthProtection(FormBuilderDashboard, {
  allowedRoles: ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin']
});