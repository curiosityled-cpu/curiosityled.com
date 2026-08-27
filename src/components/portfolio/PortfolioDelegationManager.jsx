import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserCheck, Trash2, Loader2, ArrowRight } from "lucide-react";

const HR_ADMIN_ROLES = [
  "Admin Level 2",
  "Super Administrator",
  "Platform Admin",
  "Partner Business Administrator",
];

const REASON_LABELS = {
  leave: "Leave",
  vacation: "Vacation",
  termination: "Termination",
  other: "Other",
};

const EMPTY_FORM = {
  from_hrbp_email: "",
  to_hrbp_email: "",
  scope: "all",
  assignment_id: "",
  start_date: "",
  end_date: "",
  reason: "leave",
  notes: "",
};

export default function PortfolioDelegationManager() {
  const { user } = useAuth();
  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const isAdmin = HR_ADMIN_ROLES.includes(appRole);

  const [delegations, setDelegations] = useState([]);
  const [hrbps, setHrbps] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const effectiveFrom = isAdmin ? form.from_hrbp_email : user?.email;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const dels = isAdmin
        ? await base44.entities.HRBPDelegation.list("-created_date", 200).catch(() => [])
        : await base44.entities.HRBPDelegation
            .filter({ from_hrbp_email: user.email })
            .catch(() => []);
      setDelegations(dels);
      const allUsers = await base44.entities.User.list(500).catch(() => []);
      setHrbps(allUsers.filter((u) => (u.app_role || u.data?.app_role) === "HRBP"));
    } finally {
      setLoading(false);
    }
  };

  // Fetch the from-HRBP's assignments when scope === 'assignment'
  useEffect(() => {
    if (form.scope !== "assignment" || !effectiveFrom) {
      setAssignments([]);
      return;
    }
    base44.entities.HRBPPortfolio
      .filter({ hrbp_email: effectiveFrom, status: "active" })
      .then(setAssignments)
      .catch(() => setAssignments([]));
  }, [form.scope, effectiveFrom]);

  useEffect(() => {
    fetchAll();
  }, [isAdmin]);

  const handleCreate = async () => {
    if (!effectiveFrom) return toast.error("Select the HRBP delegating");
    if (!form.to_hrbp_email) return toast.error("Select a backup HRBP");
    if (form.to_hrbp_email === effectiveFrom)
      return toast.error("Backup HRBP must be different from the delegating HRBP");
    if (form.scope === "assignment" && !form.assignment_id)
      return toast.error("Select a portfolio assignment to delegate");

    const payload = {
      from_hrbp_email: effectiveFrom,
      to_hrbp_email: form.to_hrbp_email,
      scope: form.scope,
      assignment_id: form.scope === "assignment" ? form.assignment_id : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      reason: form.reason,
      status: "active",
      created_by_email: user?.email,
      notes: form.notes || null,
    };

    setSaving(true);
    try {
      await base44.entities.HRBPDelegation.create(payload);
      toast.success("Delegation created");
      setForm({ ...EMPTY_FORM, from_hrbp_email: isAdmin ? "" : "" });
      fetchAll();
    } catch (e) {
      toast.error(e.message || "Failed to create delegation");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm("Revoke this delegation? The backup HRBP will lose access.")) return;
    try {
      await base44.entities.HRBPDelegation.update(id, { status: "revoked" });
      toast.success("Delegation revoked");
      fetchAll();
    } catch (e) {
      toast.error(e.message || "Failed to revoke");
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#0202ff]" />
            <h3 className="text-sm font-semibold text-gray-900">
              {isAdmin ? "Delegate Portfolio (on behalf of HRBP)" : "Delegate My Portfolio"}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isAdmin && (
              <div className="space-y-1.5">
                <Label className="text-xs">Delegating HRBP</Label>
                <Select
                  value={form.from_hrbp_email}
                  onValueChange={(v) => setForm({ ...form, from_hrbp_email: v })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select HRBP" />
                  </SelectTrigger>
                  <SelectContent>
                    {hrbps.map((h) => (
                      <SelectItem key={h.email} value={h.email}>
                        {h.full_name || h.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Backup HRBP</Label>
              <Select
                value={form.to_hrbp_email}
                onValueChange={(v) => setForm({ ...form, to_hrbp_email: v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select backup HRBP" />
                </SelectTrigger>
                <SelectContent>
                  {hrbps
                    .filter((h) => h.email !== effectiveFrom)
                    .map((h) => (
                      <SelectItem key={h.email} value={h.email}>
                        {h.full_name || h.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => setForm({ ...form, scope: v, assignment_id: "" })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entire Portfolio</SelectItem>
                  <SelectItem value="assignment">Single Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Select
                value={form.reason}
                onValueChange={(v) => setForm({ ...form, reason: v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REASON_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.scope === "assignment" && (
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Portfolio Assignment</Label>
                <Select
                  value={form.assignment_id}
                  onValueChange={(v) => setForm({ ...form, assignment_id: v })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label} ({a.assignment_type.replace("_", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignments.length === 0 && (
                  <p className="text-xs text-gray-400">
                    {effectiveFrom ? "No active assignments for this HRBP." : "Select a delegating HRBP first."}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Start Date (optional)</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date (optional — open-ended if blank)</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Out for 2-week vacation"
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Create Delegation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Active Delegations {delegations.length > 0 && `(${delegations.length})`}
          </h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : delegations.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No delegations yet.</p>
          ) : (
            <div className="space-y-2">
              {delegations.map((d) => {
                const fromName = hrbps.find((h) => h.email === d.from_hrbp_email)?.full_name || d.from_hrbp_email;
                const toName = hrbps.find((h) => h.email === d.to_hrbp_email)?.full_name || d.to_hrbp_email;
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="font-medium text-gray-900 truncate">{fromName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium text-gray-900 truncate">{toName}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {d.scope === "all" ? "All" : "Single"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {REASON_LABELS[d.reason] || d.reason}
                        </Badge>
                        {d.status === "revoked" && (
                          <Badge variant="outline" className="text-[10px] text-gray-400">
                            revoked
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {fmtDate(d.start_date)} → {fmtDate(d.end_date)}
                        {d.notes ? ` · ${d.notes}` : ""}
                      </p>
                    </div>
                    {d.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(d.id)}
                        className="text-gray-500 hover:text-red-600 flex-shrink-0"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}