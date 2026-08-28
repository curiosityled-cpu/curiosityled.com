import React, { useState, useEffect, useMemo } from "react";
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
import UserMultiSelect from "@/components/assignment/UserMultiSelect";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Building2,
  Users,
  Briefcase,
  Loader2,
  Check,
  UserRound,
  Layers,
  Globe,
} from "lucide-react";

const HR_ADMIN_ROLES = [
  "Admin Level 2",
  "Super Administrator",
  "Platform Admin",
  "Partner Business Administrator",
];

const SCOPE_TYPES = [
  {
    id: "explicit",
    label: "Individuals",
    description: "Pick specific managers by name",
    icon: UserRound,
  },
  {
    id: "business_unit",
    label: "Team or Business Unit",
    description: "Everyone in a department or team",
    icon: Layers,
  },
  {
    id: "client",
    label: "Whole Client Org",
    description: "All managers across an entire client",
    icon: Globe,
  },
];

const EMPTY_FORM = {
  hrbp_email: "",
  assignment_type: "explicit",
  label: "",
  business_unit: "",
  department: "",
  team: "",
  scope_client_id: "",
  manager_emails: [],
};

export default function PortfolioAssignmentManager() {
  const { user } = useAuth();
  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const isAdmin = HR_ADMIN_ROLES.includes(appRole);

  const [assignments, setAssignments] = useState([]);
  const [hrbps, setHrbps] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [assigns, users, clientList] = await Promise.all([
        base44.entities.HRBPPortfolio.list("-created_date", 200).catch(() => []),
        base44.entities.User.list(500).catch(() => []),
        base44.entities.Client.list(200).catch(() => []),
      ]);
      setAssignments(assigns);
      setAllUsers(users);
      setHrbps(users.filter((u) => (u.app_role || u.data?.app_role) === "HRBP"));
      setClients(clientList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  // Department suggestions derived from existing user profiles — gives the
  // admin a fast, typo-free way to scope a Team/BU assignment.
  const departmentOptions = useMemo(() => {
    const set = new Set(
      allUsers
        .map((u) => u.department || u.data?.department)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
    );
    return [...set];
  }, [allUsers]);

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
      if (form.manager_emails.length === 0)
        return toast.error("Select at least one manager");
      payload.manager_emails = form.manager_emails;
    } else if (form.assignment_type === "business_unit") {
      if (!form.department.trim()) return toast.error("Choose a department");
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

  const handleCreateBulk = async () => {
    if (!form.hrbp_email) return toast.error("Select an HRBP");
    if (selectedDepts.length === 0) return toast.error("Select at least one department");
    const hrbpName = hrbps.find((h) => h.email === form.hrbp_email)?.full_name || "";
    const payloads = selectedDepts.map((dept) => ({
      hrbp_email: form.hrbp_email,
      hrbp_name: hrbpName,
      assignment_type: "business_unit",
      label: form.label.trim() ? `${form.label.trim()} — ${dept}` : dept,
      business_unit: form.business_unit.trim(),
      department: dept,
      team: "",
      status: "active",
    }));
    setSaving(true);
    try {
      await base44.entities.HRBPPortfolio.bulkCreate(payloads);
      toast.success(`Created ${payloads.length} assignment${payloads.length !== 1 ? "s" : ""}`);
      setForm(EMPTY_FORM);
      setSelectedDepts([]);
      setBulkMode(false);
      fetchAll();
    } catch (e) {
      toast.error(e.message || "Failed to create assignments");
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
      return `${a.manager_emails?.length || 0} manager${(a.manager_emails?.length || 0) !== 1 ? "s" : ""}`;
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

  // Live scope summary for the chosen configuration
  const scopeSummary = () => {
    if (form.assignment_type === "explicit") {
      return `${form.manager_emails.length} manager${form.manager_emails.length !== 1 ? "s" : ""} selected`;
    }
    if (form.assignment_type === "business_unit") {
      if (bulkMode) return `${selectedDepts.length} department${selectedDepts.length !== 1 ? "s" : ""} selected`;
      return [form.business_unit, form.department, form.team].filter(Boolean).join(" · ") || "No department set";
    }
    if (form.assignment_type === "client") {
      const c = clients.find((c) => c.id === form.scope_client_id);
      return c ? `All managers in ${c.name}` : "No client selected";
    }
    return "—";
  };

  return (
    <div className="space-y-4">
      {/* Create form */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#0202ff]" />
            <h3 className="text-sm font-semibold text-gray-900">Assign Portfolio Scope</h3>
          </div>

          {/* Step 1 — HRBP + label */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Assign to HRBP</Label>
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
              {hrbps.length === 0 && (
                <p className="text-xs text-gray-400">No users with the HRBP role yet.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Assignment Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Operations Managers, Q3 Reorg Group"
                className="text-sm"
              />
            </div>
          </div>

          {/* Step 2 — Scope type chooser */}
          <div className="space-y-2">
            <Label className="text-xs">What should this HRBP cover?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SCOPE_TYPES.map((s) => {
                const Icon = s.icon;
                const active = form.assignment_type === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, assignment_type: s.id, manager_emails: [], department: "", team: "", business_unit: "", scope_client_id: "" });
                      setBulkMode(false);
                      setSelectedDepts([]);
                    }}
                    className={`text-left p-3 rounded-xl border transition-all select-none ${
                      active
                        ? "border-[#0202ff] bg-[#0202ff]/5 ring-1 ring-[#0202ff]/30"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? "bg-[#0202ff] text-white" : "bg-gray-100 text-gray-500"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900">{s.label}</p>
                          {active && <Check className="w-3.5 h-3.5 text-[#0202ff]" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{s.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3 — Configure the chosen scope */}
          {form.assignment_type === "explicit" && (
            <div className="space-y-2">
              <Label className="text-xs">Select Managers</Label>
              <UserMultiSelect
                users={allUsers}
                selectedEmails={form.manager_emails}
                onSelectionChange={(emails) => setForm({ ...form, manager_emails: emails })}
                maxHeight="320px"
              />
            </div>
          )}

          {form.assignment_type === "business_unit" && (
            <div className="space-y-3">
              {/* Bulk toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Assign multiple departments at once</p>
                  <p className="text-xs text-gray-500">Creates one assignment per checked department for this HRBP.</p>
                </div>
                <Switch checked={bulkMode} onCheckedChange={setBulkMode} />
              </div>

              {bulkMode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Select Departments ({selectedDepts.length})</Label>
                    <div className="flex gap-3 text-xs">
                      <button type="button" className="text-[#0202ff] hover:underline" onClick={() => setSelectedDepts(departmentOptions)}>
                        Select all
                      </button>
                      <button type="button" className="text-gray-500 hover:underline" onClick={() => setSelectedDepts([])}>
                        Clear
                      </button>
                    </div>
                  </div>
                  {departmentOptions.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">No departments found in user profiles yet.</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                      {departmentOptions.map((d) => {
                        const checked = selectedDepts.includes(d);
                        return (
                          <label key={d} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) =>
                                setSelectedDepts(c ? [...selectedDepts, d] : selectedDepts.filter((x) => x !== d))
                              }
                            />
                            <span className="text-sm text-gray-800">{d}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Business Unit (applies to all)</Label>
                    <Input
                      value={form.business_unit}
                      onChange={(e) => setForm({ ...form, business_unit: e.target.value })}
                      className="text-sm"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Department *</Label>
                    <Input
                      list="portfolio-dept-options"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="Type or pick a department"
                      className="text-sm"
                    />
                    <datalist id="portfolio-dept-options">
                      {departmentOptions.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Business Unit (optional)</Label>
                    <Input
                      value={form.business_unit}
                      onChange={(e) => setForm({ ...form, business_unit: e.target.value })}
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
                  <p className="text-xs text-gray-400 md:col-span-3">
                    All managers whose profile department matches will be auto-included.
                  </p>
                </div>
              )}
            </div>
          )}

          {form.assignment_type === "client" && (
            <div className="space-y-1.5">
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
              {clients.length === 0 && (
                <p className="text-xs text-gray-400">No clients configured yet.</p>
              )}
            </div>
          )}

          {/* Live summary + action */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Scope:</span> {scopeSummary()}
            </div>
            <Button
              onClick={bulkMode && form.assignment_type === "business_unit" ? handleCreateBulk : handleCreate}
              disabled={saving}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {bulkMode && form.assignment_type === "business_unit"
                ? `Create ${selectedDepts.length} Assignment${selectedDepts.length !== 1 ? "s" : ""}`
                : "Create Assignment"}
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