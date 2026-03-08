import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save } from "lucide-react";

const TRIGGER_TYPES = [
  { value: "entity_created", label: "Entity Created" },
  { value: "entity_updated", label: "Entity Updated" },
  { value: "entity_deleted", label: "Entity Deleted" },
  { value: "field_value_changed", label: "Field Value Changed" },
  { value: "scheduled", label: "Scheduled (Time-based)" },
  { value: "manual", label: "Manual Trigger" }
];

const ACTION_TYPES = [
  { value: "update_entity", label: "Update Entity" },
  { value: "create_entity", label: "Create Entity" },
  { value: "send_notification", label: "Send Notification" },
  { value: "send_email", label: "Send Email" },
  { value: "assign_learning", label: "Assign Learning" },
  { value: "create_goal", label: "Create Goal" },
  { value: "update_user_field", label: "Update User Field" }
];

const ENTITIES = [
  "Assessment", "Goal", "AssignedLearning", "OnboardingPlan", 
  "User", "Program", "Cohort", "CustomAssessment", "DevelopmentRequest"
];

export default function ManualAutomationEditor({ automation, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "entity_created",
    trigger_config: {
      entity_type: "",
      conditions: []
    },
    actions: []
  });

  useEffect(() => {
    if (automation) {
      setFormData({
        name: automation.name || "",
        description: automation.description || "",
        trigger_type: automation.trigger_type || "entity_created",
        trigger_config: automation.trigger_config || { entity_type: "", conditions: [] },
        actions: automation.actions || []
      });
    }
  }, [automation]);

  const handleAddAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        {
          action_type: "send_notification",
          config: {}
        }
      ]
    });
  };

  const handleRemoveAction = (index) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const handleActionChange = (index, field, value) => {
    const newActions = [...formData.actions];
    if (field === "action_type") {
      newActions[index] = { action_type: value, config: {} };
    } else {
      newActions[index].config = {
        ...(newActions[index].config || {}),
        [field]: value
      };
    }
    setFormData({ ...formData, actions: newActions });
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label>Automation Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Low Score Follow-up"
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what this automation does"
            className="min-h-20"
          />
        </div>
      </div>

      {/* Trigger Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trigger Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Trigger Type</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.trigger_type.includes("entity") || formData.trigger_type.includes("field")) && (
            <div>
              <Label>Entity Type</Label>
              <Select
                value={formData.trigger_config.entity_type}
                onValueChange={(value) => setFormData({
                  ...formData,
                  trigger_config: { ...formData.trigger_config, entity_type: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {ENTITIES.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.trigger_type === "field_value_changed" && (
            <div>
              <Label>Field Name</Label>
              <Input
                value={formData.trigger_config.field_name || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  trigger_config: { ...formData.trigger_config, field_name: e.target.value }
                })}
                placeholder="e.g., status, score, completion_date"
              />
            </div>
          )}

          {formData.trigger_type === "scheduled" && (
            <div>
              <Label>Schedule (Cron Expression)</Label>
              <Input
                value={formData.trigger_config.cron_expression || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  trigger_config: { ...formData.trigger_config, cron_expression: e.target.value }
                })}
                placeholder="e.g., 0 9 * * * (daily at 9am)"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Actions</CardTitle>
            <Button size="sm" variant="outline" onClick={handleAddAction}>
              <Plus className="w-4 h-4 mr-1" />
              Add Action
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.actions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No actions yet. Click "Add Action" to create one.
            </p>
          ) : (
            formData.actions.map((action, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label>Action Type</Label>
                        <Select
                          value={action.action_type}
                          onValueChange={(value) => handleActionChange(index, "action_type", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Action-specific fields */}
                      {action.action_type === "send_notification" && (
                        <>
                          <div>
                            <Label>Title</Label>
                            <Input
                              value={action.config?.title || ""}
                              onChange={(e) => handleActionChange(index, "title", e.target.value)}
                              placeholder="Notification title"
                            />
                          </div>
                          <div>
                            <Label>Message</Label>
                            <Textarea
                              value={action.config?.message || ""}
                              onChange={(e) => handleActionChange(index, "message", e.target.value)}
                              placeholder="Notification message"
                            />
                          </div>
                        </>
                      )}

                      {action.action_type === "send_email" && (
                        <>
                          <div>
                            <Label>Subject</Label>
                            <Input
                              value={action.config?.subject || ""}
                              onChange={(e) => handleActionChange(index, "subject", e.target.value)}
                              placeholder="Email subject"
                            />
                          </div>
                          <div>
                            <Label>Body</Label>
                            <Textarea
                              value={action.config?.body || ""}
                              onChange={(e) => handleActionChange(index, "body", e.target.value)}
                              placeholder="Email body"
                            />
                          </div>
                        </>
                      )}

                      {(action.action_type === "update_entity" || action.action_type === "create_entity") && (
                        <>
                          <div>
                            <Label>Entity Type</Label>
                            <Select
                              value={action.config?.entity_type || ""}
                              onValueChange={(value) => handleActionChange(index, "entity_type", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select entity..." />
                              </SelectTrigger>
                              <SelectContent>
                                {ENTITIES.map((entity) => (
                                  <SelectItem key={entity} value={entity}>
                                    {entity}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Field Updates (JSON)</Label>
                            <Textarea
                              value={action.config?.field_updates || "{}"}
                              onChange={(e) => handleActionChange(index, "field_updates", e.target.value)}
                              placeholder='{"field_name": "value"}'
                              className="font-mono text-xs"
                            />
                          </div>
                        </>
                      )}

                      {action.action_type === "assign_learning" && (
                        <div>
                          <Label>Learning Resource ID</Label>
                          <Input
                            value={action.config?.resource_id || ""}
                            onChange={(e) => handleActionChange(index, "resource_id", e.target.value)}
                            placeholder="Resource ID"
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveAction(index)}
                      className="text-red-600 hover:text-red-700 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Save Automation
        </Button>
      </div>
    </div>
  );
}