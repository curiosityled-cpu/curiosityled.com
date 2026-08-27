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
import { Plus, Trash2, Building2, Users, Briefcase, Loader2 } from "lucide-react";

const HR_ADMIN_ROLES = [
  "Admin Level 2",
  "Super Administrator",
  "Platform Admin",
  "Partner Business Administrator",
];

const EMPTY_FORM = {
  hrbp_email: "",
  assignment_type: "business_unit",
  label: "",
  business_unit: "",
  department: "",
  team: "",
  scope_client_id: "",
  manager_emails: "",
};

export default function PortfolioAssignmentManager() {
  const { user } = useAuth();
  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const isAdmin = HR_ADMIN_ROLES.includes(appRole);

  const [assignments, setAssignments] = useState([]);
  const [hrbps, setHrbps] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [assigns, allUsers, clientList] = await Promise.all([
        base44.entities.HRBPPortfolio.list("-created_date", 200).catch(() => []),
        base44.entities.User.list(500).catch(() => []),
        base44.entities.Client.list(200).catch(() => []),
      ]);
      setAssignments(assigns);
      setHrbps(allUsers.filter((u) => (u.app_role || u.data?.app_role) === "HRBP"));
      setClients(clientList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const handleCreate = async () => {
    if (!form.hrbp_email) return toast.error("Select an HRBP");
    if (!form.label.trim()) return toast.error("Add a label");

    const payload = {
      hrbp_email: form.hrbp_email,
      hrbp_name: hrbps.find((h) => h.email === form.hrbp_email)?.full_name || "",
      assignment_type: form.assignment_type,
      label: form.label.trim(),
      status: "active",
    };

    if (form.assignment_type === "explicit") {
      const emails = form.manager_emails
        .split(/[\s,]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      if (emails.length === 0) return toast.error("Add at least one manager email");
      payload.manager_emails = emails;
    } else if (form.assignment_type === "business_unit") {
      if (!form.department.trim()) return toast.error("Add a department");
      payload.business_unit = form.business_unit.trim();
      payload.department = form.department.trim();
      payload.team = form.team.trim();
    } else if (form.assignment_type === "client") {
      if (!form.scope_client_id) return toast.error("Select a client");
      payload.scope_client_id = form.scope_client_id;
    }

    setSaving(true);
    try {
      await base44.entities.HRBPPortfolio.create(payload);
      toast.success("Portfolio assignment created");
      setForm(EMPTY_FORM);
      fetchAll();
    } catch (e) {
      toast.error(e.message || "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this portfolio assignment?")) return;
    try {
      await base44.entities.HRBPPortfolio.delete(id);
      toast.success("Assignment deleted");
      fetchAll();
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    }
  };

  if (!isAdmin) return null;

  const scopeDetail = (a) => {
    if (a.assignment_type === "explicit")
      return `${a.manager_emails?.length || 0} explicit manager${(a.manager_emails?.length || 0) !== 1 ? "s" : ""}`;
    if (a.assignment_type === "business_unit")
      return [a.business_unit, a.department, a.team].filter(Boolean).join(" · ") || "BU scope";
    if (a.assignment_type === "client") {
      const c = clients.find((c) => c.id === a.scope_client_id);
      return `Client: ${c?.name || a.scope_client_id || "—"}`;
    }
    return "—";
  };

  const TypeIcon = ({ type }) =>
    type === "client" ? (
      <Briefcase className="w-4 h-4" />
    ) : type === "explicit" ? (
      <Users className="w-4 h-4" />
    ) : (
      <Building2 className="w-4 h-4" />
    );

  return (
    <div className="space-y-4">
      {/* Create form */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#0202ff]" />
            <h3 className="text-sm font-semibold text-gray-900">Assign Portfolio Scope</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">HRBP</Label>
              <Select
                value={form.hrbp_email}
                onValueChange={(v) => setForm({ ...form, hrbp_email: v })}
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

            <div className="space-y-1.5">
              <Label className="text-xs">Assignment Type</Label>
              <Select
                value={form.assignment_type}
                onValueChange={(v) => setForm({ ...form, assignment_type: v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_unit">Business Unit / Team</SelectItem>
                  <SelectItem value="client">Whole Client Org</SelectItem>
                  <SelectItem value="explicit">Explicit Managers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Operations Managers, Q3 Reorg Group"
                className="text-sm"
              />
            </div>

            {form.assignment_type === "business_unit" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Business Unit</Label>
                  <Input
                    value={form.business_unit}
                    onChange={(e) => setForm({ ...form, business_unit: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Department</Label>
                  <Input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Team (optional)</Label>
                  <Input
                    value={form.team}
                    onChange={(e) => setForm({ ...form, team: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </>
            )}

            {form.assignment_type === "client" && (
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Client Organization</Label>
                <Select
                  value={form.scope_client_id}
                  onValueChange={(v) => setForm({ ...form, scope_client_id: v })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || c.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.assignment_type === "explicit" && (
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Manager Emails (comma or newline separated)</Label>
                <textarea
                  value={form.manager_emails}
                  onChange={(e) => setForm({ ...form, manager_emails: e.target.value })}
                  placeholder="manager1@org.com, manager2@org.com"
                  className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 min-h-[72px] focus:outline-none focus:ring-2 focus:ring-[#0202ff]/20"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignments list */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Current Assignments {assignments.length > 0 && `(${assignments.length})`}
          </h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No portfolio assignments yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0202ff]/10 flex items-center justify-center text-[#0202ff] flex-shrink-0">
                    <TypeIcon type={a.assignment_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.label}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {a.assignment_type.replace("_", " ")}
                      </Badge>
                      {a.status === "inactive" && (
                        <Badge variant="outline" className="text-[10px] text-gray-400">
                          inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      <span className="font-medium">{a.hrbp_name || a.hrbp_email}</span> ·{" "}
                      {scopeDetail(a)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(a.id)}
                    className="text-gray-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}