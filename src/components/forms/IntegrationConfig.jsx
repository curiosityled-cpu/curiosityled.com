import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link2, Save, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function IntegrationConfig({ form, onUpdate }) {
  const [config, setConfig] = useState({
    enabled: false,
    target_entity: "",
    field_mapping: {},
    auto_create_on_submit: true
  });
  const [saving, setSaving] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [selectedField, setSelectedField] = useState("");

  useEffect(() => {
    if (form?.integration_config) {
      setConfig(prev => ({ ...prev, ...form.integration_config }));
    }
  }, [form?.id]);

  const entityOptions = [
    { value: "DevelopmentRequest", label: "Development Request", fields: ["request_type", "priority", "description", "competencies"] },
    { value: "JourneyEnrollment", label: "Journey Enrollment", fields: ["journey_id", "user_email", "start_date", "notes"] }
  ];

  const getFormQuestions = () => {
    if (!form?.config?.sections) return [];
    
    const questions = [];
    form.config.sections.forEach(section => {
      if (section.questions) {
        section.questions.forEach(q => {
          questions.push({
            id: q.id,
            text: q.question_text || q.label || "Unnamed Question"
          });
        });
      }
    });
    return questions;
  };

  const getEntityFields = () => {
    const selected = entityOptions.find(e => e.value === config.target_entity);
    return selected?.fields || [];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        integration_config: config
      });

      toast.success("Integration configuration saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving integration:", error);
      toast.error("Failed to save integration configuration");
    } finally {
      setSaving(false);
    }
  };

  const addFieldMapping = () => {
    if (!selectedQuestion || !selectedField) return;

    setConfig({
      ...config,
      field_mapping: {
        ...config.field_mapping,
        [selectedQuestion]: selectedField
      }
    });

    setSelectedQuestion("");
    setSelectedField("");
  };

  const removeMapping = (questionId) => {
    const newMapping = { ...config.field_mapping };
    delete newMapping[questionId];
    setConfig({ ...config, field_mapping: newMapping });
  };

  const questions = getFormQuestions();
  const fields = getEntityFields();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Entity Integration
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Automatically create records in other entities when this form is submitted
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Integration */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Enable Integration</Label>
            <p className="text-xs text-gray-500">Create entity records on submission</p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        {config.enabled && (
          <>
            {/* Target Entity */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Entity</Label>
              <Select
                value={config.target_entity}
                onValueChange={(value) => setConfig({ ...config, target_entity: value, field_mapping: {} })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-create */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-create on Submit</Label>
                <p className="text-xs text-gray-500">Automatically create entity when form submitted</p>
              </div>
              <Switch
                checked={config.auto_create_on_submit}
                onCheckedChange={(checked) => setConfig({ ...config, auto_create_on_submit: checked })}
              />
            </div>

            {/* Field Mapping */}
            {config.target_entity && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Field Mapping</Label>
                
                {questions.length === 0 ? (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-xs text-yellow-800">
                        Add questions to the form first before configuring field mapping
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Select
                        value={selectedQuestion}
                        onValueChange={setSelectedQuestion}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Form question..." />
                        </SelectTrigger>
                        <SelectContent>
                          {questions.map(q => (
                            <SelectItem key={q.id} value={q.id}>
                              {q.text}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedField}
                        onValueChange={setSelectedField}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Entity field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(field => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button onClick={addFieldMapping} size="sm">
                        Add
                      </Button>
                    </div>

                    {/* Display mappings */}
                    {Object.keys(config.field_mapping).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(config.field_mapping).map(([qId, field]) => {
                          const question = questions.find(q => q.id === qId);
                          return (
                            <Card key={qId} className="border">
                              <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline">{question?.text || qId}</Badge>
                                  <span className="text-gray-500">→</span>
                                  <Badge className="bg-blue-100 text-blue-700">{field}</Badge>
                                </div>
                                <Button
                                  onClick={() => removeMapping(qId)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                >
                                  Remove
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Integration Config
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}