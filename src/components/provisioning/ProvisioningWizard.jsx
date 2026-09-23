import React, { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserPlus, Upload, Loader2, AlertCircle, CheckCircle, Users, Mail, ArrowRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  ROLE_GROUPS, FRIENDLY_ROLE_LABELS, canAssignRole, getRoleRank,
} from "@/lib/provisioningRoles";

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ProvisioningWizard({ open, onOpenChange, currentUser, onSuccess }) {
  const adminRole = currentUser?.app_role || currentUser?.data?.app_role || currentUser?.role;

  // ── Single-user form ──
  const [form, setForm] = useState({
    email: "", firstName: "", lastName: "",
    appRole: "User Level 1", managerEmail: "", department: "",
  });
  const [customRoleIds, setCustomRoleIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // ── Batch ──
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [applying, setApplying] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteProgress, setInviteProgress] = useState({ current: 0, total: 0, failures: [] });
  const [batchError, setBatchError] = useState(null);

  const resetAll = () => {
    setForm({ email: "", firstName: "", lastName: "", appRole: "User Level 1", managerEmail: "", department: "" });
    setCustomRoleIds([]);
    setFormError(null);
    setFile(null);
    setBatchResult(null);
    setBatchId(null);
    setBatchError(null);
    setInviteProgress({ current: 0, total: 0, failures: [] });
  };

  const handleClose = () => {
    resetAll();
    onOpenChange(false);
  };

  // ── Single-user submit: create one-row batch → apply → invite ──
  const handleSingleSubmit = async () => {
    setFormError(null);
    if (!form.email || !form.firstName || !form.lastName) {
      setFormError("Email, first name, and last name are required.");
      return;
    }
    if (!canAssignRole(adminRole, form.appRole)) {
      setFormError(`You cannot assign "${FRIENDLY_ROLE_LABELS[form.appRole] || form.appRole}" — it is above your role level.`);
      return;
    }
    try {
      setSubmitting(true);
      // 1. Create a one-row batch
      const createRes = await base44.functions.invoke("provisioningCreateBatch", {
        sourceSystem: "MANUAL",
        fileName: "single_user",
        records: [{
          email: form.email, firstName: form.firstName, lastName: form.lastName,
          appRole: form.appRole, managerEmail: form.managerEmail || undefined,
          department: form.department || undefined, customRoles: customRoleIds,
        }],
        strictRoles: false, requireDepartment: false, disallowPublicEmailDomains: false,
      });
      if (createRes.data?.totals?.invalid > 0) {
        const msgs = (createRes.data.invalidRecords || []).map((r) => r.errors?.map((e) => e.message).join("; ")).join(" ");
        setFormError(msgs || "Validation failed for this user.");
        return;
      }
      const bId = createRes.data.batchId;

      // 2. Apply the profile
      await base44.functions.invoke("provisioningApplyBatch", { batchId: bId, mode: "RESUME", dryRun: false });

      // 3. Invite with the correct role
      await base44.users.inviteUser(form.email.toLowerCase().trim(), form.appRole);

      // 4. Mark invite sent
      await base44.functions.invoke("provisioningMarkInvitesSent", { batchId: bId, emails: [form.email.toLowerCase().trim()] });

      toast.success(`${form.firstName} has been provisioned and invited as ${FRIENDLY_ROLE_LABELS[form.appRole] || form.appRole}.`);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Single provisioning error:", err);
      const msg = err?.message || err?.response?.data?.error || "Failed to provision user.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Batch: parse CSV client-side (same logic as CSVUploadModal) ──
  const parseCSV = (text) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) throw new Error("CSV must contain headers and at least one data row.");
    const headers = lines[0].split(",").map((h) => h.trim());
    const headerMap = {
      email: "email", firstName: "firstName", lastName: "lastName",
      first_name: "firstName", last_name: "lastName",
      app_role: "appRole", appRole: "appRole",
      department: "department", manager_email: "managerEmail", managerEmail: "managerEmail",
      customRoles: "customRoles", custom_roles: "customRoles",
    };
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.every((v) => !v)) continue;
      const record = {};
      headers.forEach((header, idx) => {
        const value = values[idx] || "";
        const mapped = headerMap[header] || header;
        if (header === "full_name" && value) {
          const parts = value.trim().split(/\s+/);
          record.firstName = parts[0];
          record.lastName = parts.slice(1).join(" ") || parts[0];
        } else if (mapped === "customRoles" && value) {
          record[mapped] = value.split(";").map((r) => r.trim()).filter(Boolean);
        } else if (value) {
          record[mapped] = value;
        }
      });
      if (record.email) { record.rowNumber = i; records.push(record); }
    }
    return records;
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type === "text/csv") { setFile(f); setBatchResult(null); setBatchError(null); }
    else toast.error("Please select a valid CSV file");
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      setBatchError(null);
      const text = await file.text();
      const records = parseCSV(text);
      const res = await base44.functions.invoke("provisioningCreateBatch", {
        sourceSystem: "MANUAL", fileName: file.name, records,
        strictRoles: false, requireDepartment: false, disallowPublicEmailDomains: true,
      });
      if (res.data) {
        setBatchResult(res.data);
        setBatchId(res.data.batchId);
        if (res.data.totals.invalid === 0) toast.success(`Batch validated: ${res.data.totals.valid} users ready.`);
        else toast.warning(`${res.data.totals.valid} valid, ${res.data.totals.invalid} invalid.`);
      }
    } catch (err) {
      setBatchError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleApply = async () => {
    if (!batchId) return;
    try {
      setApplying(true);
      const res = await base44.functions.invoke("provisioningApplyBatch", { batchId, mode: "RESUME", dryRun: false });
      const r = res.data?.results || {};
      toast.success(`Profiles applied: ${r.profileUpserted || 0} upserted${r.failed ? `, ${r.failed} failed` : ""}.`);
    } catch (err) {
      toast.error(`Apply failed: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  const handleInvite = async () => {
    if (!batchId) return;
    try {
      setInviting(true);
      // Fetch ready users from batch detail
      const detail = await base44.functions.invoke("provisioningGetBatchDetail", { batchId, includeUsers: true });
      const ready = (detail.data?.users || []).filter((u) => u.apply_status === "READY_TO_INVITE");
      if (ready.length === 0) { toast.info("No users ready to invite. Apply profiles first."); return; }
      setInviteProgress({ current: 0, total: ready.length, failures: [] });
      let ok = 0; const failures = [];
      for (let i = 0; i < ready.length; i++) {
        const u = ready[i];
        try {
          const role = u.profile_payload?.appRole || "User Level 1";
          await base44.users.inviteUser(u.email, role);
          await base44.functions.invoke("provisioningMarkInvitesSent", { batchId, emails: [u.email] });
          ok++;
        } catch (err) {
          failures.push({ email: u.email, error: err.message });
        }
        setInviteProgress({ current: i + 1, total: ready.length, failures });
        await SLEEP(250);
      }
      if (failures.length === 0) toast.success(`Invited ${ok} user${ok !== 1 ? "s" : ""}.`);
      else toast.warning(`Invited ${ok}, ${failures.length} failed.`);
      onSuccess?.();
    } catch (err) {
      toast.error(`Invite failed: ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  const busy = submitting || uploading || applying || inviting;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: "#0202ff" }} />
            Provision Users
          </DialogTitle>
          <DialogDescription>
            Add a single user or upload a CSV batch. Roles are scoped to your level ({FRIENDLY_ROLE_LABELS[adminRole] || adminRole}).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="single" disabled={busy}><UserPlus className="w-4 h-4 mr-2" /> Add a person</TabsTrigger>
            <TabsTrigger value="batch" disabled={busy}><Upload className="w-4 h-4 mr-2" /> Upload CSV</TabsTrigger>
          </TabsList>

          {/* ── Single user ── */}
          <TabsContent value="single" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email *</Label>
                <Input id="p-email" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@company.com" disabled={submitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-role">Role *</Label>
                <Select value={form.appRole} onValueChange={(v) => setForm({ ...form, appRole: v })} disabled={submitting}>
                  <SelectTrigger id="p-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_GROUPS.map((group) => {
                      const roles = group.roles.filter((r) => canAssignRole(adminRole, r));
                      if (roles.length === 0) return null;
                      return (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {roles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {FRIENDLY_ROLE_LABELS[r] || r}{r === adminRole ? " (you)" : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-first">First name *</Label>
                <Input id="p-first" value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  disabled={submitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-last">Last name *</Label>
                <Input id="p-last" value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  disabled={submitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-mgr">Manager email</Label>
                <Input id="p-mgr" type="email" value={form.managerEmail}
                  onChange={(e) => setForm({ ...form, managerEmail: e.target.value })}
                  placeholder="optional" disabled={submitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-dept">Department</Label>
                <Input id="p-dept" value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="optional" disabled={submitting} />
              </div>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* ── Batch ── */}
          <TabsContent value="batch" className="space-y-4">
            {!batchResult && (
              <div className="space-y-3">
                <Label htmlFor="p-csv">CSV File</Label>
                <Input id="p-csv" type="file" accept=".csv" onChange={handleFileChange} disabled={uploading} />
                {file && (
                  <Alert><CheckCircle className="w-4 h-4" /><AlertDescription>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </AlertDescription></Alert>
                )}
                <p className="text-xs text-muted-foreground">
                  Required columns: email, firstName, lastName, appRole. Optional: department, managerEmail, customRoles.
                  appRole accepts the full role enum (e.g. "User Level 2", "Analyst", "Admin Level 1").
                </p>
                {batchError && (
                  <Alert variant="destructive"><AlertCircle className="w-4 h-4" /><AlertDescription>{batchError}</AlertDescription></Alert>
                )}
                <Button onClick={handleUpload} disabled={!file || uploading} variant="outline">
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validating...</> : <><Upload className="w-4 h-4 mr-2" /> Validate CSV</>}
                </Button>
              </div>
            )}

            {batchResult && (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Validation Summary</div>
                    <div className="text-sm flex gap-4">
                      <span>Total: {batchResult.totals.total}</span>
                      <span className="text-green-600">Valid: {batchResult.totals.valid}</span>
                      <span className="text-red-600">Invalid: {batchResult.totals.invalid}</span>
                    </div>
                  </AlertDescription>
                </Alert>

                {batchResult.invalidRecords?.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Errors ({batchResult.invalidRecords.length})</div>
                      <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
                        {batchResult.invalidRecords.slice(0, 10).map((r, i) => (
                          <div key={i} className="border-l-2 border-red-300 pl-2">
                            <span className="font-medium">Row {r.rowNumber}: {r.email}</span>
                            {r.errors?.map((e, j) => <div key={j} className="text-xs">• {e.message}</div>)}
                          </div>
                        ))}
                        {batchResult.invalidRecords.length > 10 && <div className="text-xs italic">...and {batchResult.invalidRecords.length - 10} more</div>}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {batchResult.totals.valid > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button onClick={handleApply} disabled={applying || inviting} variant="outline">
                      {applying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying...</> : <>Apply Profiles</>}
                    </Button>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Button onClick={handleInvite} disabled={inviting || applying} style={{ backgroundColor: "#0202ff" }} className="hover:opacity-90">
                      {inviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inviting {inviteProgress.current}/{inviteProgress.total}...</> : <><Mail className="w-4 h-4 mr-2" /> Invite Ready Users</>}
                    </Button>
                  </div>
                )}

                {inviting && (
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${(inviteProgress.current / inviteProgress.total) * 100}%`, backgroundColor: "#0202ff" }} />
                  </div>
                )}

                <Button variant="ghost" size="sm" onClick={() => { setBatchResult(null); setBatchId(null); setFile(null); }} disabled={busy}>
                  Upload a different file
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Sticky footer — only shows CTA on single tab */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={handleClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSingleSubmit} disabled={submitting} style={{ backgroundColor: "#0202ff" }} className="hover:opacity-90">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Provisioning...</> : <><UserPlus className="w-4 h-4 mr-2" /> Provision & Invite</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}