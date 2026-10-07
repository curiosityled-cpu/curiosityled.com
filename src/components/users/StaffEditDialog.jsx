import React, { useState, useEffect } from "react";
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
import { Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

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

/**
 * StaffEditDialog — add or edit a non-user frontline staff member (ICRoster).
 * Staff are roster records: they check in via Teams or a private web link and
 * are never invited into the platform.
 */
export default function StaffEditDialog({
  open,
  onOpenChange,
  editingIC,
  clientId,
  createdByEmail,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (open) {
      setFormError(null);
      if (editingIC) {
        setForm({
          name: editingIC.name || "",
          email: editingIC.email || "",
          teams_user_id: editingIC.teams_user_id || "",
          team: editingIC.team || "",
          manager_email: editingIC.manager_email || "",
          hris_employee_id: editingIC.hris_employee_id || "",
          preferred_channel: editingIC.preferred_channel || "both",
          is_active: editingIC.is_active !== false,
          check_in_enabled: editingIC.check_in_enabled !== false,
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, editingIC]);

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
      if (editingIC) {
        await base44.entities.ICRoster.update(editingIC.id, payload);
        toast.success("Staff updated");
      } else {
        await base44.entities.ICRoster.create({
          ...payload,
          client_id: clientId,
          created_by_email: createdByEmail || "",
          source_system: "manual",
          web_access_token: crypto.randomUUID(),
        });
        toast.success("Staff added");
      }
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      setFormError(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingIC ? "Edit staff" : "Add staff"}</DialogTitle>
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
            <Label className="text-xs font-medium">Teams user ID (optional)</Label>
            <Input
              value={form.teams_user_id}
              onChange={(e) => setForm((f) => ({ ...f, teams_user_id: e.target.value }))}
              placeholder="AAD object ID or UPN"
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Fallback identity match if the Teams email differs. Usually left blank.
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
                Include this staff member in daily check-in sends
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
                Inactive staff are hidden from sends
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
            onClick={() => onOpenChange(false)}
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
            ) : editingIC ? (
              "Save changes"
            ) : (
              "Add staff"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}