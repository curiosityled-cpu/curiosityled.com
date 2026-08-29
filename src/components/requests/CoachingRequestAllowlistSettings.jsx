import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Shield, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  "User Level 1", "User Level 2", "HRBP", "Analyst", "Executive",
  "Admin Level 1", "Leadership Coach", "Consultant"
];

export default function CoachingRequestAllowlistSettings({ clientId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [allowedTitles, setAllowedTitles] = useState([]);
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [titleInput, setTitleInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    if (!clientId) return;
    loadSettings();
  }, [clientId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const clients = await base44.entities.Client.filter({ id: clientId });
      if (clients.length > 0) {
        const settings = clients[0].settings || {};
        setEnabled(settings.coaching_request_allowlist_enabled || false);
        setAllowedRoles(settings.coaching_request_allowed_roles || []);
        setAllowedTitles(settings.coaching_request_allowed_titles || []);
        setAllowedEmails(settings.coaching_request_allowed_emails || []);
      }
    } catch (error) {
      console.error("Error loading allowlist settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const clients = await base44.entities.Client.filter({ id: clientId });
      if (clients.length === 0) {
        toast.error("Client not found");
        return;
      }
      const client = clients[0];
      const updatedSettings = {
        ...(client.settings || {}),
        coaching_request_allowlist_enabled: enabled,
        coaching_request_allowed_roles: allowedRoles,
        coaching_request_allowed_titles: allowedTitles,
        coaching_request_allowed_emails: allowedEmails
      };
      await base44.entities.Client.update(clientId, { settings: updatedSettings });
      toast.success("Coaching request allowlist saved");
    } catch (error) {
      console.error("Error saving allowlist:", error);
      toast.error("Failed to save allowlist settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role) => {
    setAllowedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const addTitle = () => {
    if (titleInput.trim() && !allowedTitles.includes(titleInput.trim())) {
      setAllowedTitles(prev => [...prev, titleInput.trim()]);
      setTitleInput("");
    }
  };

  const addEmail = () => {
    if (emailInput.trim() && !allowedEmails.includes(emailInput.trim())) {
      setAllowedEmails(prev => [...prev, emailInput.trim()]);
      setEmailInput("");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Coaching Request Allowlist
        </CardTitle>
        <CardDescription>Control who can submit leadership coaching requests for this organization.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable submission allowlist</Label>
            <p className="text-xs text-muted-foreground mt-1">When enabled, only users matching the criteria below can submit coaching requests.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            <div>
              <Label>Allowed Roles</Label>
              <p className="text-xs text-muted-foreground mb-3">Users with any of these app roles can submit coaching requests.</p>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map(role => (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      allowedRoles.includes(role)
                        ? "bg-[#0202ff] text-white border-[#0202ff]"
                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Allowed Job Titles</Label>
              <p className="text-xs text-muted-foreground mb-3">Users whose current job title matches can submit coaching requests.</p>
              <div className="flex gap-2">
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTitle(); } }}
                  placeholder="e.g. Director, VP, Manager"
                />
                <Button type="button" variant="outline" onClick={addTitle}>Add</Button>
              </div>
              {allowedTitles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {allowedTitles.map((t, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {t}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setAllowedTitles(prev => prev.filter((_, idx) => idx !== i))} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Allowed Individuals (Email)</Label>
              <p className="text-xs text-muted-foreground mb-3">Specific email addresses permitted to submit coaching requests.</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                  placeholder="name@company.com"
                />
                <Button type="button" variant="outline" onClick={addEmail}>Add</Button>
              </div>
              {allowedEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {allowedEmails.map((em, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {em}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setAllowedEmails(prev => prev.filter((_, idx) => idx !== i))} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              A user is allowed if they match <strong>any</strong> one of the criteria above (role, title, or email).
            </p>
          </>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}