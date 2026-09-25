import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { SuccessionSection, SuccessionLoading, SuccessionEmpty } from "@/components/succession/SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Settings2, Plus, Send, CheckCircle2, Ban, Info, Shield } from "lucide-react";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  retired: "bg-gray-100 text-gray-500",
};

const LEADERSHIP_LEVELS = [
  "Level 1 (Leading Self)",
  "Level 2 (Leading Others)",
  "Level 3 (Leading Managers)",
  "Level 4 (Leading Functions)",
  "Level 5 (Leading Organizations)",
  "HiPo Individual Contributor",
];

/**
 * LeadershipIndexMappingRegistryView — administrator-only governance
 * configuration for Leadership Index competency-to-requirement mappings.
 * Embedded in the existing evidence/role-success configuration area.
 *
 * Mappings are governance configuration, NOT assessment results.
 */
export default function LeadershipIndexMappingRegistryView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [mappings, setMappings] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ framework_version: "", leadership_level: "", status: "" });
  const [formData, setFormData] = useState({
    assessment_definition_id: "",
    assessment_leadership_level: "",
    competency_id: "",
    competency_key: "",
    effective_blueprint_snapshot_id: "",
    effective_requirement_snapshot_id: "",
    mapping_rationale: "",
  });

  const canManage = hasPermission("succession.evidence.manage");
  const canView = hasPermission("succession.evidence.view") || canManage;

  const fetchMappings = useCallback(async () => {
    setDataLoading(true);
    try {
      const result = await base44.functions.invoke("successionListLeadershipIndexMappings", filters);
      setMappings(result?.mappings || []);
    } catch {
      setMappings([]);
    } finally {
      setDataLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchMappings(); }, [fetchMappings]);

  if (!canView) return null;

  const handleCreate = async () => {
    const opId = `li-mapping-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await invoke("successionSaveLeadershipIndexMappingDraft", {
      operation_id: opId,
      ...formData,
    });
    if (result) {
      setShowForm(false);
      setFormData({
        assessment_definition_id: "", assessment_leadership_level: "",
        competency_id: "", competency_key: "",
        effective_blueprint_snapshot_id: "", effective_requirement_snapshot_id: "",
        mapping_rationale: "",
      });
      fetchMappings();
    }
  };

  const handleSubmit = async (mappingId) => {
    const opId = `li-mapping-submit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await invoke("successionApproveLeadershipIndexMapping", {
      operation_id: opId,
      mapping_id: mappingId,
      submit: true,
      approve: false,
    });
    if (result) fetchMappings();
  };

  const handleApprove = async (mappingId) => {
    const opId = `li-mapping-approve-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await invoke("successionApproveLeadershipIndexMapping", {
      operation_id: opId,
      mapping_id: mappingId,
      submit: true,
      approve: true,
    });
    if (result) fetchMappings();
  };

  const handleRetire = async (mappingId) => {
    const reason = prompt("Enter retirement reason (required):");
    if (!reason || !reason.trim()) return;
    const opId = `li-mapping-retire-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await invoke("successionRetireLeadershipIndexMapping", {
      operation_id: opId,
      mapping_id: mappingId,
      retirement_reason: reason,
    });
    if (result) fetchMappings();
  };

  return (
    <SuccessionSection icon={Settings2} title="Leadership Index Mapping Registry"
      subtitle="Governance configuration mapping assessment competencies to frozen role requirements"
      action={canManage && (
        <Button size="sm" onClick={() => setShowForm(s => !s)} className="h-7 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Mapping
        </Button>
      )}>

      {/* Governance disclaimer */}
      <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <strong>Mappings are governance configuration, not assessment results.</strong>{" "}
          An approved mapping means only "this assessment competency may be considered as one source of evidence
          for this frozen competency requirement." It does not mean the scales are equivalent or the candidate is ready.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <select value={filters.framework_version} onChange={(e) => setFilters({ ...filters, framework_version: e.target.value })}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white">
          <option value="">All Framework Versions</option>
          <option value="leadership_index_v1">leadership_index_v1</option>
        </select>
        <select value={filters.leadership_level} onChange={(e) => setFilters({ ...filters, leadership_level: e.target.value })}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white">
          <option value="">All Levels</option>
          {LEADERSHIP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Create form */}
      {showForm && canManage && (
        <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-white">
          <h4 className="text-sm font-medium text-gray-700 mb-3">New Mapping Draft</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Assessment Definition ID *</Label><Input value={formData.assessment_definition_id} onChange={(e) => setFormData({ ...formData, assessment_definition_id: e.target.value })} /></div>
            <div><Label className="text-xs">Leadership Level *</Label>
              <select value={formData.assessment_leadership_level} onChange={(e) => setFormData({ ...formData, assessment_leadership_level: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                <option value="">Select...</option>
                {LEADERSHIP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Competency ID *</Label><Input value={formData.competency_id} onChange={(e) => setFormData({ ...formData, competency_id: e.target.value })} /></div>
            <div><Label className="text-xs">Competency Key *</Label><Input value={formData.competency_key} onChange={(e) => setFormData({ ...formData, competency_key: e.target.value })} placeholder="e.g. si, dm, comm" /></div>
            <div><Label className="text-xs">Effective Blueprint Snapshot ID *</Label><Input value={formData.effective_blueprint_snapshot_id} onChange={(e) => setFormData({ ...formData, effective_blueprint_snapshot_id: e.target.value })} /></div>
            <div><Label className="text-xs">Effective Requirement Snapshot ID *</Label><Input value={formData.effective_requirement_snapshot_id} onChange={(e) => setFormData({ ...formData, effective_requirement_snapshot_id: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Mapping Rationale *</Label><Textarea value={formData.mapping_rationale} onChange={(e) => setFormData({ ...formData, mapping_rationale: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleCreate} disabled={loading} className="bg-[#0202ff] hover:bg-[#0101dd]">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create Draft"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Mappings list */}
      {dataLoading ? (
        <SuccessionLoading />
      ) : mappings.length === 0 ? (
        <SuccessionEmpty icon={Settings2} title="No mappings found"
          subtitle="Create governance mappings to connect assessment competencies to frozen role requirements." />
      ) : (
        <div className="space-y-2">
          {mappings.map((m) => (
            <div key={m.mapping_id} className="p-3 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={STATUS_COLORS[m.status]}>{m.status}</Badge>
                    <Badge variant="outline">v{m.version_number}</Badge>
                    {m.is_current && m.status === "approved" && <Badge className="bg-blue-50 text-blue-700">current</Badge>}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{m.competency_name} ({m.competency_key})</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mt-1">
                    <div><span className="font-medium">Framework:</span> {m.assessment_framework_version}</div>
                    <div><span className="font-medium">Level:</span> {m.assessment_leadership_level}</div>
                    <div><span className="font-medium">Approved:</span> {m.approved_at?.split("T")[0] || "—"}</div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{m.mapping_rationale}</p>
                </div>
                {canManage && (
                  <div className="flex flex-col gap-1 ml-4">
                    {m.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => handleSubmit(m.mapping_id)}>
                        <Send className="w-3.5 h-3.5 mr-1" /> Submit
                      </Button>
                    )}
                    {m.status === "submitted" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(m.mapping_id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                    )}
                    {m.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => handleRetire(m.mapping_id)}>
                        <Ban className="w-3.5 h-3.5 mr-1" /> Retire
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </SuccessionSection>
  );
}