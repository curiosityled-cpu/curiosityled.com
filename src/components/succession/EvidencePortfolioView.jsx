import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, Send, Ban, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, RotateCcw, Lock, Eye,
} from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection, SuccessionLoading, SuccessionError, SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EvidenceDetailDrawer from "./EvidenceDetailDrawer";
import AssessmentEvidenceView from "./AssessmentEvidenceView";

const EVIDENCE_TYPES = [
  { value: "performance_outcome", label: "Performance Outcome" },
  { value: "competency_behavior", label: "Competency Behavior" },
  { value: "critical_experience", label: "Critical Experience" },
  { value: "stretch_assignment", label: "Stretch Assignment" },
  { value: "coaching_milestone", label: "Coaching Milestone" },
  { value: "development_completion", label: "Development Completion" },
  { value: "business_outcome", label: "Business Outcome" },
  { value: "credential", label: "Credential" },
  { value: "manager_observation", label: "Manager Observation" },
  { value: "manual_other", label: "Manual / Other" },
];

const SOURCE_SYSTEMS = [
  { value: "manual", label: "Manual" },
  { value: "curiosity_led", label: "Curiosity Led" },
];

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  accepted: "bg-green-50 text-green-700",
  accepted_with_limitations: "bg-yellow-50 text-yellow-700",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  superseded: "bg-gray-100 text-gray-500",
  withdrawn: "bg-gray-100 text-gray-500",
};

export default function EvidencePortfolioView({ candidacy }) {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission, user } = useAuth();
  const [evidence, setEvidence] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [detailEvidence, setDetailEvidence] = useState(null);
  const [supersedeTarget, setSupersedeTarget] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState("");

  const canManage = hasPermission("succession.evidence.manage");
  const canView = hasPermission("succession.evidence.view") || canManage;

  const fetchEvidence = useCallback(async () => {
    if (!candidacy?.id) return;
    try {
      const data = await invoke("successionListCandidacyEvidence", { candidacy_id: candidacy.id });
      setEvidence(data?.evidence || []);
    } catch { setEvidence([]); }
  }, [invoke, candidacy?.id]);

  const fetchRequirements = useCallback(async () => {
    if (!candidacy?.effective_blueprint_snapshot_id) { setRequirements([]); return; }
    try {
      const data = await invoke("successionGetSnapshot", {
        snapshot_id: candidacy.effective_blueprint_snapshot_id,
      });
      // The snapshot may include requirements_snapshot array or we fetch children
      if (data?.snapshot?.requirements_snapshot) {
        setRequirements(data.snapshot.requirements_snapshot);
      } else if (data?.requirements) {
        setRequirements(data.requirements);
      } else {
        setRequirements([]);
      }
    } catch { setRequirements([]); }
  }, [invoke, candidacy?.effective_blueprint_snapshot_id]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);
  useEffect(() => { fetchRequirements(); }, [fetchRequirements]);

  if (!canView) return null;

  const handleSubmit = async (formData) => {
    const opId = `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateEvidenceDraft", {
        operation_id: opId,
        candidacy_id: candidacy.id,
        effective_blueprint_snapshot_id: candidacy.effective_blueprint_snapshot_id,
        effective_requirement_snapshot_id: formData.effective_requirement_snapshot_id,
        evidence_type: formData.evidence_type,
        source_system: formData.source_system,
        source_record_id: formData.source_record_id || null,
        source_date: formData.source_date,
        title: formData.title,
        description: formData.description,
        expiration_date: formData.expiration_date || null,
      });
      setShowCreateForm(false);
      await fetchEvidence();
    } catch { /* handled by hook */ }
  };

  const handleUpdateDraft = async (evidenceId, formData) => {
    const opId = `evidence-update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionUpdateEvidenceDraft", {
        operation_id: opId,
        evidence_id: evidenceId,
        evidence_type: formData.evidence_type,
        source_system: formData.source_system,
        source_record_id: formData.source_record_id || null,
        source_date: formData.source_date,
        title: formData.title,
        description: formData.description,
        expiration_date: formData.expiration_date || null,
      });
      setEditingDraft(null);
      await fetchEvidence();
    } catch { /* handled by hook */ }
  };

  const handleSubmitEvidence = async (evidenceId) => {
    const opId = `evidence-submit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionSubmitEvidence", {
        operation_id: opId,
        evidence_id: evidenceId,
      });
      await fetchEvidence();
    } catch { /* handled by hook */ }
  };

  const handleWithdraw = async (evidenceId) => {
    const opId = `evidence-withdraw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionWithdrawOrSupersedeEvidence", {
        operation_id: opId,
        evidence_id: evidenceId,
        mode: "withdraw",
        withdrawal_reason: withdrawReason,
      });
      setWithdrawTarget(null);
      setWithdrawReason("");
      await fetchEvidence();
    } catch { /* handled by hook */ }
  };

  const handleSupersede = async (evidenceId, formData) => {
    const opId = `evidence-supersede-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionWithdrawOrSupersedeEvidence", {
        operation_id: opId,
        evidence_id: evidenceId,
        mode: "supersede",
        evidence_type: formData.evidence_type,
        source_system: formData.source_system,
        source_record_id: formData.source_record_id || null,
        source_date: formData.source_date,
        title: formData.title,
        description: formData.description,
        expiration_date: formData.expiration_date || null,
      });
      setSupersedeTarget(null);
      await fetchEvidence();
    } catch { /* handled by hook */ }
  };

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={FileText} title="Evidence Portfolio"
        action={canManage && candidacy?.status === "active" && (
          <Button size="sm" onClick={() => setShowCreateForm(s => !s)} className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Evidence
          </Button>
        )}>

        {canManage && candidacy?.status !== "active" && (
          <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
            <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">Evidence can only be added to active candidacies.</span>
          </div>
        )}

        {showCreateForm && canManage && (
          <EvidenceForm
            requirements={requirements}
            onSubmit={handleSubmit}
            loading={loading}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {loading && evidence.length === 0 ? <SuccessionLoading /> :
         evidence.length === 0 ? (
          <SuccessionEmpty icon={FileText} title="No evidence yet"
            subtitle="Create evidence linked to a specific frozen requirement from the blueprint snapshot." />
         ) : (
          <div className="space-y-2">
            {evidence.map(e => (
              <EvidenceRow
                key={e.id} evidence={e}
                canManage={canManage}
                currentUserId={user?.id}
                onEdit={() => setEditingDraft(e)}
                onSubmit={() => handleSubmitEvidence(e.id)}
                onWithdraw={() => { setWithdrawTarget(e); setWithdrawReason(""); }}
                onSupersede={() => setSupersedeTarget(e)}
                onDetail={() => setDetailEvidence(e)}
              />
            ))}
          </div>
        )}
      </SuccessionSection>

      {/* Leadership Index Assessment Evidence Bridge */}
      {candidacy?.status === "active" && (
        <AssessmentEvidenceView candidacy={candidacy} />
      )}

      {editingDraft && (
        <SuccessionSection icon={FileText} title="Edit Draft Evidence">
          <EvidenceForm
            requirements={requirements}
            initialData={editingDraft}
            onSubmit={(formData) => handleUpdateDraft(editingDraft.id, formData)}
            loading={loading}
            onCancel={() => setEditingDraft(null)}
          />
        </SuccessionSection>
      )}

      {supersedeTarget && (
        <SuccessionSection icon={RefreshCw} title={`Create Corrected Evidence (supersedes "${supersedeTarget.title}")`}>
          <EvidenceForm
            requirements={requirements}
            initialData={supersedeTarget}
            isSupersede={true}
            onSubmit={(formData) => handleSupersede(supersedeTarget.id, formData)}
            loading={loading}
            onCancel={() => setSupersedeTarget(null)}
          />
        </SuccessionSection>
      )}

      {withdrawTarget && (
        <SuccessionSection icon={Ban} title={`Withdraw Evidence: ${withdrawTarget.title}`}>
          <div className="space-y-3">
            <div>
              <Label htmlFor="withdraw-evidence-reason" className="text-xs text-gray-600">Withdrawal Reason *</Label>
              <textarea id="withdraw-evidence-reason" className="mt-1 w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 min-h-[60px]"
                placeholder="Explain why this evidence is being withdrawn..."
                value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleWithdraw(withdrawTarget.id)} disabled={loading || !withdrawReason.trim()}>
                Confirm Withdraw
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setWithdrawTarget(null); setWithdrawReason(""); }}>Cancel</Button>
            </div>
          </div>
        </SuccessionSection>
      )}

      {detailEvidence && (
        <EvidenceDetailDrawer
          evidenceId={detailEvidence.id}
          onClose={() => setDetailEvidence(null)}
        />
      )}
    </div>
  );
}

function EvidenceRow({ evidence, canManage, currentUserId, onEdit, onSubmit, onWithdraw, onSupersede, onDetail }) {
  const isMyDraft = evidence.submitted_by_profile_id === currentUserId;
  const isDraft = evidence.status === "draft";
  const isTerminal = ["withdrawn", "superseded", "expired"].includes(evidence.status);
  const review = evidence.latest_review;

  const isFresh = () => {
    if (!evidence.freshness_review_date) return null;
    const reviewDate = new Date(evidence.freshness_review_date);
    const now = new Date();
    const daysUntilReview = Math.floor((reviewDate - now) / (1000 * 60 * 60 * 24));
    if (daysUntilReview < 0) return { label: "Review overdue", style: "text-red-600" };
    if (daysUntilReview < 30) return { label: `Review in ${daysUntilReview}d`, style: "text-amber-600" };
    return { label: "Fresh", style: "text-green-600" };
  };

  const freshness = isFresh();

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 cursor-pointer" role="button" tabIndex={0}
          aria-label={`View evidence details: ${evidence.title}`}
          onClick={onDetail}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDetail(); } }}>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">{evidence.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[evidence.status] || STATUS_STYLES.draft}`}>
              {evidence.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {EVIDENCE_TYPES.find(t => t.value === evidence.evidence_type)?.label || evidence.evidence_type}
            {" · "}{new Date(evidence.source_date).toLocaleDateString()}
          </p>
          {review && (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                review.decision === "accepted" ? "bg-green-50 text-green-700" :
                review.decision === "accepted_with_limitations" ? "bg-yellow-50 text-yellow-700" :
                review.decision === "rejected" ? "bg-red-50 text-red-700" :
                "bg-amber-50 text-amber-700"
              }`}>
                {review.decision.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-gray-500">Strength: {review.evidence_strength}</span>
              <span className="text-xs text-gray-500">Confidence: {review.confidence}</span>
              <span className="text-xs text-gray-500">Relevance: {review.relevance}</span>
              {review.contrary_evidence_indicator && (
                <span className="text-xs text-red-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Contrary evidence
                </span>
              )}
            </div>
          )}
          {freshness && (
            <p className={`text-xs mt-1 ${freshness.style}`}>{freshness.label}</p>
          )}
          {evidence.expiration_date && (
            <p className="text-xs text-gray-400 mt-0.5">Expires: {new Date(evidence.expiration_date).toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDetail}>
            <Eye className="w-3.5 h-3.5" /> Detail
          </Button>
          {canManage && isMyDraft && isDraft && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
                Edit
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={onSubmit}>
                <Send className="w-3 h-3 mr-1" /> Submit
              </Button>
            </>
          )}
          {canManage && isMyDraft && !isTerminal && !isDraft && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onWithdraw}>
                <Ban className="w-3 h-3 mr-1" /> Withdraw
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSupersede}>
                <RefreshCw className="w-3 h-3 mr-1" /> Correct
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceForm({ requirements, initialData, isSupersede, onSubmit, loading, onCancel }) {
  const [formData, setFormData] = useState({
    effective_requirement_snapshot_id: initialData?.effective_requirement_snapshot_id || "",
    evidence_type: initialData?.evidence_type || "manager_observation",
    source_system: initialData?.source_system || "manual",
    source_record_id: initialData?.source_record_id || "",
    source_date: initialData?.source_date || new Date().toISOString().split("T")[0],
    title: initialData?.title || "",
    description: initialData?.description || "",
    expiration_date: initialData?.expiration_date || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.effective_requirement_snapshot_id || !formData.source_date || !formData.title || !formData.description) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
      {isSupersede && (
        <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-xs text-blue-700">This creates a new draft that supersedes the original record. The original will be marked as superseded.</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label htmlFor="evidence-requirement" className="text-xs text-gray-600">Linked Frozen Requirement *</Label>
          <select id="evidence-requirement" className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.effective_requirement_snapshot_id}
            onChange={e => setFormData(d => ({ ...d, effective_requirement_snapshot_id: e.target.value }))}
            required disabled={!!initialData?.effective_requirement_snapshot_id && !isSupersede}>
            <option value="">— Select requirement —</option>
            {requirements.map(r => (
              <option key={r.id || r.requirement_key} value={r.id}>
                {r.frozen_title || r.effective_language || r.requirement_key || "Requirement"}
              </option>
            ))}
          </select>
          {requirements.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No requirements available. Ensure the snapshot is generated and active.</p>
          )}
        </div>
        <div>
          <Label htmlFor="evidence-type" className="text-xs text-gray-600">Evidence Type *</Label>
          <select id="evidence-type" className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.evidence_type} onChange={e => setFormData(d => ({ ...d, evidence_type: e.target.value }))} required>
            {EVIDENCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="evidence-source-system" className="text-xs text-gray-600">Source System *</Label>
          <select id="evidence-source-system" className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.source_system} onChange={e => setFormData(d => ({ ...d, source_system: e.target.value }))} required>
            {SOURCE_SYSTEMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Source Date *</Label>
          <Input type="date" className="mt-1 h-9 text-sm"
            value={formData.source_date} onChange={e => setFormData(d => ({ ...d, source_date: e.target.value }))} required />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Source Record ID (optional)</Label>
          <Input className="mt-1 h-9 text-sm" placeholder="Optional"
            value={formData.source_record_id} onChange={e => setFormData(d => ({ ...d, source_record_id: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-gray-600">Title *</Label>
          <Input className="mt-1 h-9 text-sm" placeholder="Brief title"
            value={formData.title} onChange={e => setFormData(d => ({ ...d, title: e.target.value }))} required />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-gray-600">Description *</Label>
          <textarea className="mt-1 w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 min-h-[80px]"
            placeholder="Describe the evidence..."
            value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} required />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Expiration Date (optional)</Label>
          <Input type="date" className="mt-1 h-9 text-sm"
            value={formData.expiration_date} onChange={e => setFormData(d => ({ ...d, expiration_date: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !formData.effective_requirement_snapshot_id || !formData.title || !formData.description}>
          {isSupersede ? "Create Corrected Draft" : "Create Draft"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}