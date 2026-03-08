import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Webhook, Plus, Trash2, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function WebhookConfigManager({ form, onUpdate }) {
  const [webhooks, setWebhooks] = useState(form.config?.webhooks || []);
  const [newWebhook, setNewWebhook] = useState({
    url: "",
    events: [],
    enabled: true
  });
  const [testing, setTesting] = useState(null);

  const availableEvents = [
    { id: "form.submission.created", label: "New Submission" },
    { id: "form.submission.approved", label: "Submission Approved" },
    { id: "form.submission.rejected", label: "Submission Rejected" },
    { id: "form.scoring.completed", label: "Scoring Completed" },
    { id: "form.published", label: "Form Published" },
    { id: "form.closed", label: "Form Closed" }
  ];

  const addWebhook = () => {
    if (!newWebhook.url) {
      toast.error("Please enter a webhook URL");
      return;
    }

    if (newWebhook.events.length === 0) {
      toast.error("Please select at least one event");
      return;
    }

    const webhook = {
      id: `webhook_${Date.now()}`,
      ...newWebhook,
      created_at: new Date().toISOString()
    };

    const updated = [...webhooks, webhook];
    setWebhooks(updated);
    saveWebhooks(updated);

    setNewWebhook({ url: "", events: [], enabled: true });
    toast.success("Webhook added");
  };

  const removeWebhook = (webhookId) => {
    const updated = webhooks.filter(w => w.id !== webhookId);
    setWebhooks(updated);
    saveWebhooks(updated);
    toast.success("Webhook removed");
  };

  const toggleWebhook = (webhookId) => {
    const updated = webhooks.map(w => 
      w.id === webhookId ? { ...w, enabled: !w.enabled } : w
    );
    setWebhooks(updated);
    saveWebhooks(updated);
  };

  const saveWebhooks = async (updatedWebhooks) => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...(form.config || {}),
          webhooks: updatedWebhooks
        }
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving webhooks:", error);
      toast.error("Failed to save webhooks");
    }
  };

  const testWebhook = async (webhook) => {
    setTesting(webhook.id);
    try {
      const testPayload = {
        event: "webhook.test",
        form_id: form.id,
        form_title: form.title,
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook from Curiosity Led Form Builder"
        }
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        toast.success("Webhook test successful");
      } else {
        toast.error(`Webhook returned ${response.status}`);
      }
    } catch (error) {
      console.error("Webhook test error:", error);
      toast.error("Webhook test failed");
    } finally {
      setTesting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="w-5 h-5" />
          Webhook Configuration
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Send real-time notifications to external systems
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Webhook */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <Label>Add New Webhook</Label>
          
          <div>
            <Input
              placeholder="https://your-endpoint.com/webhook"
              value={newWebhook.url}
              onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-sm mb-2 block">Events to Subscribe</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-2">
                  <Checkbox
                    id={event.id}
                    checked={newWebhook.events.includes(event.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setNewWebhook({
                          ...newWebhook,
                          events: [...newWebhook.events, event.id]
                        });
                      } else {
                        setNewWebhook({
                          ...newWebhook,
                          events: newWebhook.events.filter(e => e !== event.id)
                        });
                      }
                    }}
                  />
                  <label htmlFor={event.id} className="text-xs cursor-pointer">
                    {event.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={addWebhook}
            size="sm"
            className="w-full"
            style={{ backgroundColor: '#0202ff' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>
        </div>

        {/* Existing Webhooks */}
        {webhooks.length > 0 ? (
          <div className="space-y-3">
            <Label>Configured Webhooks</Label>
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {webhook.url}
                        </code>
                        {webhook.enabled ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map((eventId) => {
                          const event = availableEvents.find(e => e.id === eventId);
                          return (
                            <Badge key={eventId} variant="outline" className="text-xs">
                              {event?.label || eventId}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => testWebhook(webhook)}
                        disabled={testing === webhook.id}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleWebhook(webhook.id)}
                      >
                        <CheckCircle className={webhook.enabled ? "w-4 h-4 text-green-600" : "w-4 h-4 text-gray-400"} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWebhook(webhook.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No webhooks configured
          </p>
        )}
      </CardContent>
    </Card>
  );
}