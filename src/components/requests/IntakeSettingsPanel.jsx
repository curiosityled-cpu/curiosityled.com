import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function IntakeSettingsPanel({ clientId, onSaved }) {
  const [client, setClient] = useState(null);
  const [intakeToggle, setIntakeToggle] = useState(true);
  const [bypassToggle, setBypassToggle] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      setLoading(true);
      try {
        const clients = await base44.entities.Client.filter({ id: clientId });
        if (clients.length > 0) {
          setClient(clients[0]);
          setIntakeToggle(clients[0].settings?.require_intake_conversation ?? true);
          setBypassToggle(clients[0].settings?.intake_bypass_allowed ?? true);
        }
      } catch (e) {
        console.error("Failed to load intake settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Client.update(clientId, {
        settings: {
          ...(client.settings || {}),
          require_intake_conversation: intakeToggle,
          intake_bypass_allowed: bypassToggle,
        },
      });
      toast.success("Intake settings saved");
      onSaved?.();
    } catch (e) {
      toast.error("Failed to save intake settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-medium">Require Intake Conversation</Label>
          <p className="text-xs text-muted-foreground mt-0.5">When on, every request needs an intake conversation before approval.</p>
        </div>
        <Switch checked={intakeToggle} onCheckedChange={setIntakeToggle} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-medium">Allow Per-Request Bypass</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Let Program Admins skip intake on individual requests.</p>
        </div>
        <Switch checked={bypassToggle} onCheckedChange={setBypassToggle} />
      </div>
      <div className="flex justify-end pt-2 border-t">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}