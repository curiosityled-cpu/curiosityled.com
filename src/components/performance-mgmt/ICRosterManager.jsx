/**
 * ICRosterManager — admin surface for the non-user frontline IC roster.
 * Lets admins add/edit/remove frontline staff who submit daily check-ins via
 * Teams, toggle who receives check-in cards, and trigger a manual send of
 * today's check-in cards.
 *
 * Lives in Performance Manager as the "Frontline ICs" tab.
 */
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Send,
  Users,
  AlertCircle,
  MessageSquare,
  Upload,
  Link2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import ICRosterCSVUpload from "@/components/users/ICRosterCSVUpload";

const APP_URL = "https://curiosityled.ai";

const emptyForm = {
  name: "",
  email: "",
  teams_user_id: "",
  team: "",
  manager_email: "",
  hris_employee_id: "",
  preferred_channel: "both",
  is_active: true,
  check_in_enabled: true,
};

export default function ICRosterManager({ user }) {
  const { user: authUser } = useAuth();
  const currentUser = user || authUser;
  const clientId = currentUser?.data?.client_id || currentUser?.client_id;

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [sending, setSending] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);

  const loadRoster = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await base44.entities.ICRoster.list("-created_date", 200);
      setRoster(rows || []);
    } catch (e) {
      setError(e.message || "Could not load roster");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (ic) => {
    setEditingId(ic.id);
    setForm({
      name: ic.name || "",
      email: ic.email || "",
      teams_user_id: ic.teams_user_id || "",
      team: ic.team || "",
      manager_email: ic.manager_email || "",
      hris_employee_id: ic.hris_employee_id || "",
      preferred_channel: ic.preferred_channel || "both",
      is_active: ic.is_active !== false,
      check_in_enabled: ic.check_in_enabled !== false,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      teams_user_id: form.teams_user_id.trim(),
      team: form.team.trim(),
      manager_email: form.manager_email.trim().toLowerCase(),
      hris_employee_id: form.hris_employee_id.trim(),
      preferred_channel: form.preferred_channel,
      is_active: form.is_active,
      check_in_enabled: form.check_in_enabled,
    };
    try {
      if (editingId) {
        await base44.entities.ICRoster.update(editingId, payload);
      } else {
        await base44.entities.ICRoster.create({
          ...payload,
          client_id: clientId,
          created_by_email: currentUser?.email || "",
          source_system: "manual",
          web_access_token: crypto.randomUUID(),
        });
      }
      setDialogOpen(false);
      await loadRoster();
    } catch (e) {
      setFormError(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ic) => {
    if (!window.confirm(`Remove ${ic.name} from the roster?`)) return;
    try {
      await base44.entities.ICRoster.delete(ic.id);
      await loadRoster();
    } catch (e) {
      setError(e.message || "Could not delete");
    }
  };

  const toggleField = async (ic, field) => {
    try {
      await base44.entities.ICRoster.update(ic.id, { [field]: !ic[field] });
      setRoster((prev) =>
        prev.map((x) => (x.id === ic.id ? { ...x, [field]: !x[field] } : x))
      );
    } catch (e) {
      setError(e.message || "Could not update");
    }
  };

  const handleSendCards = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendICCheckInCards", {
        client_id: clientId,
        check_in_type: "morning",
      });
      const d = res?.data || res;
      toast.success(
        `Sent ${d.sent || 0} check-in card(s)` +
          (d.skipped_no_conversation ? ` · ${d.skipped_no_conversation} not yet connected to Teams` : "") +
          (d.failed ? ` · ${d.failed} failed` : "")
      );
    } catch (e) {
      toast.error("Send failed: " + (e.message || ""));
    } finally {
      setSending(false);
    }
  };

  const copyWebLink = (ic) => {
    if (!ic.web_access_token) {
      toast.error("No web link yet — re-save this IC to generate one.");
      return;
    }
    const link = `${APP_URL}/ic-checkin?token=${ic.web_access_token}`;
    navigator.clipboard?.writeText(link).then(
      () => toast.success("Web check-in link copied"),
      () => toast.error("Could not copy link")
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Frontline IC roster is scoped to your organization. No client is
          associated with your account.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Frontline IC roster
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Non-user frontline staff who submit daily check-ins via Microsoft
            Teams. Add them here, then send check-in cards. Each IC must message
            the bot once to connect their Teams chat.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSendCards}
            disabled={sending || roster.length === 0}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-1" />
            )}
            Send today's check-ins
          </Button>
          <Button
            onClick={() => setShowCsvUpload(true)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload CSV
          </Button>
          <Button
            onClick={openAdd}
            className="bg-[#0202ff] hover:bg-[#0101dd] text-xs"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add IC
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {roster.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No frontline ICs yet
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Add your frontline staff so they can complete daily check-ins
              right from Teams.
            </p>
            <Button
              onClick={openAdd}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-xs mt-4"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add your first IC
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {roster.map((ic) => (
            <Card key={ic.id} className={!ic.is_active ? "opacity-60" : ""}>
              <CardContent className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">
                        {ic.name}
                      </p>
                      {!ic.is_active && (
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                          Inactive
                        </span>
                      )}
                      {ic.teams_conversation_id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                          <MessageSquare className="w-3 h-3" /> Teams connected
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          Awaiting Teams connect
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-xs text-muted-foreground">
                        {ic.email}
                      </span>
                      {ic.team && (
                        <span className="text-[10px] text-gray-500">
                          · {ic.team}
                        </span>
                      )}
                      {ic.manager_email && (
                        <span className="text-[10px] text-gray-500">
                          · mgr: {ic.manager_email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => copyWebLink(ic)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                      title="Copy web check-in link"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleField(ic, "check_in_enabled")}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                      title={ic.check_in_enabled ? "Pause check-ins" : "Enable check-ins"}
                    >
                      <Send
                        className={`w-4 h-4 ${ic.check_in_enabled ? "text-[#0202ff]" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => openEdit(ic)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ic)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit frontline IC" : "Add a frontline IC"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jordan Rivera"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email (Teams account)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jordan@company.com"
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Must match the Teams account email so the bot can identify them.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Team / shift</Label>
                <Input
                  value={form.team}
                  onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
                  placeholder="Warehouse - Shift A"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Manager email</Label>
                <Input
                  type="email"
                  value={form.manager_email}
                  onChange={(e) => setForm((f) => ({ ...f, manager_email: e.target.value }))}
                  placeholder="manager@company.com"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Teams user ID (optional)
              </Label>
              <Input
                value={form.teams_user_id}
                onChange={(e) => setForm((f) => ({ ...f, teams_user_id: e.target.value }))}
                placeholder="AAD object ID or UPN"
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Fallback identity match if the Teams email differs. Usually
                left blank.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">HRIS employee ID</Label>
                <Input
                  value={form.hris_employee_id}
                  onChange={(e) => setForm((f) => ({ ...f, hris_employee_id: e.target.value }))}
                  placeholder="Reconcile with HRIS"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notify via</Label>
                <Select
                  value={form.preferred_channel}
                  onValueChange={(v) => setForm((f) => ({ ...f, preferred_channel: v }))}
                >
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Teams + Email</SelectItem>
                    <SelectItem value="teams">Teams only</SelectItem>
                    <SelectItem value="email">Email only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Receives check-in cards</p>
                <p className="text-[11px] text-muted-foreground">
                  Include this IC in daily Teams check-in sends
                </p>
              </div>
              <Switch
                checked={form.check_in_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, check_in_enabled: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-[11px] text-muted-foreground">
                  Inactive ICs are hidden from sends
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
            {formError && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0202ff] hover:bg-[#0101dd]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? (
                "Save changes"
              ) : (
                "Add IC"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ICRosterCSVUpload
        open={showCsvUpload}
        onClose={() => setShowCsvUpload(false)}
        onDone={loadRoster}
        clientId={clientId}
        createdByEmail={currentUser?.email}
      />
    </div>
  );
}