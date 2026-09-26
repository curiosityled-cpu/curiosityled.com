import React, { useState, useEffect, useCallback } from "react";
import { FileText, AlertTriangle, History, Lock } from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import { SuccessionSection, SuccessionLoading, SuccessionEmpty } from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EvidencePortfolioView from "./EvidencePortfolioView";

const ASPIRATION_LABELS = {
  interested: "Interested",
  undecided: "Undecided",
  not_interested: "Not Interested",
};
const MOBILITY_LABELS = {
  local_only: "Local Only",
  relocatable: "Relocatable",
  remote_only: "Remote Only",
  open: "Open",
};
const HORIZON_LABELS = {
  immediate: "Immediate",
  "0_6_months": "0–6 Months",
  "6_12_months": "6–12 Months",
  "12_24_months": "12–24 Months",
  "24_plus_months": "24+ Months",
};

export default function CandidateDetailView({ candidacy, canManage, onWithdraw }) {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { user, hasPermission } = useAuth();
  const [adminDetail, setAdminDetail] = useState(null);
  const [showDisclosureForm, setShowDisclosureForm] = useState(false);
  const [disclosureContext, setDisclosureContext] = useState(null);
  const [ctxLoading, setCtxLoading] = useState(false);

  const isOwnCandidacy = candidacy.user_profile_id === user?.id;
  const canDisclose = hasPermission("succession.discovery.disclose");
  const canSubmitDisclosure = isOwnCandidacy && canDisclose && candidacy.status === "active";

  // ── Candidate self-service: use secure backend function ──
  const fetchMyDisclosureContext = useCallback(async () => {
    if (!isOwnCandidacy) return;
    setCtxLoading(true);
    try {
      const ctx = await invoke("successionGetMyDisclosureContext", { candidacy_id: candidacy.id });
      setDisclosureContext(ctx);
    } catch {
      setDisclosureContext(null);
    } finally {
      setCtxLoading(false);
    }
  }, [isOwnCandidacy, candidacy.id, invoke]);

  // ── Admin read-only: fetch candidate detail via secure backend function ──
  const fetchAdminDetail = useCallback(async () => {
    if (isOwnCandidacy) return;
    try {
      const data = await invoke("successionGetCandidateAdminDetail", { candidacy_id: candidacy.id });
      setAdminDetail(data);
    } catch { setAdminDetail(null); }
  }, [invoke, isOwnCandidacy, candidacy.id]);

  useEffect(() => {
    if (isOwnCandidacy) {
      fetchMyDisclosureContext();
    } else {
      fetchAdminDetail();
    }
  }, [isOwnCandidacy, fetchMyDisclosureContext, fetchAdminDetail]);

  const handleSubmitDisclosure = async (formData) => {
    const opId = `disclosure-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionSubmitSelfDisclosure", {
        operation_id: opId,
        candidacy_id: candidacy.id,
        aspiration_status: formData.aspiration_status,
        aspiration_statement: formData.aspiration_statement || null,
        mobility: formData.mobility,
        availability_horizon: formData.availability_horizon,
        conflict_of_interest_disclosed: formData.conflict_of_interest_disclosed,
      });
      setShowDisclosureForm(false);
      await fetchMyDisclosureContext();
    } catch { /* handled by hook */ }
  };

  // ── Candidate self-service view (minimal, no HR notes or deliberations) ──
  if (isOwnCandidacy) {
    const ctx = disclosureContext;
    const current = ctx?.current_disclosure;
    const canSubmit = ctx?.permitted_actions?.can_submit_disclosure ?? false;

    return (
      <div className="space-y-4">
        <SuccessionSection icon={FileText} title="My Candidacy">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailField label="Role" value={ctx?.role_label || "—"} />
            <DetailField label="Candidacy Status" value={ctx?.candidacy_status || candidacy.status} />
          </div>
          {!canSubmit && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-500">Disclosure submission is unavailable for this candidacy.</span>
            </div>
          )}
        </SuccessionSection>

        {current && (
          <SuccessionSection icon={FileText} title="My Current Self-Disclosure">
            {current.conflict_of_interest_disclosed && (
              <div className="mb-3 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-800">HR follow-up required — conflict of interest disclosed.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailField label="Version" value={`v${current.version}`} />
              <DetailField label="Aspiration" value={ASPIRATION_LABELS[current.aspiration_status] || current.aspiration_status} />
              <DetailField label="Mobility" value={MOBILITY_LABELS[current.mobility] || current.mobility} />
              <DetailField label="Availability" value={HORIZON_LABELS[current.availability_horizon] || current.availability_horizon} />
              <DetailField label="COI Disclosed" value={current.conflict_of_interest_disclosed ? "Yes" : "No"} />
              <DetailField label="Submitted" value={current.submitted_at ? new Date(current.submitted_at).toLocaleDateString() : "—"} />
            </div>
            {current.aspiration_statement && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Aspiration Statement</p>
                <p className="text-sm text-gray-900 mt-1">{current.aspiration_statement}</p>
              </div>
            )}
          </SuccessionSection>
        )}

        {canSubmit && (
          <SuccessionSection icon={FileText} title="Submit Self-Disclosure"
            action={<Button size="sm" onClick={() => setShowDisclosureForm(s => !s)} className="h-7 text-xs">New Disclosure</Button>}>
            {showDisclosureForm && (
              <DisclosureForm onSubmit={handleSubmitDisclosure} loading={loading} onCancel={() => setShowDisclosureForm(false)} />
            )}
            {!showDisclosureForm && !current && (
              <SuccessionEmpty icon={FileText} title="No disclosure submitted" subtitle="Submit your self-disclosure to share your aspiration, mobility, and availability." />
            )}
          </SuccessionSection>
        )}

        {ctxLoading && !ctx && <SuccessionLoading />}
      </div>
    );
  }

  // ── Admin read-only view (no edit, no form, no scores, no readiness) ──
  const currentDisclosure = adminDetail?.current_disclosure || null;
  const historyDisclosures = adminDetail?.disclosure_history || [];

  return (
    <div className="space-y-4">
      <SuccessionSection icon={FileText} title="Candidate Detail (Read-Only)">
        <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-xs text-blue-700 font-medium">Read-only — administrators cannot author or overwrite candidate self-disclosures.</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <DetailField label="Candidate" value={candidacy.user_profile_id} />
          <DetailField label="Critical Role" value={candidacy.critical_role_id} />
          <DetailField label="Discovery Source" value={candidacy.discovery_source?.replace(/_/g, " ")} />
          <DetailField label="Nominated By" value={candidacy.nominated_by_profile_id} />
          <DetailField label="Status" value={candidacy.status} />
          <DetailField label="Nominated At" value={candidacy.nominated_at ? new Date(candidacy.nominated_at).toLocaleDateString() : "—"} />
        </div>
      </SuccessionSection>

      {currentDisclosure && (
        <SuccessionSection icon={FileText} title="Current Self-Disclosure">
          {currentDisclosure.conflict_of_interest_disclosed && (
            <div className="mb-3 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-800">HR follow-up required — conflict of interest disclosed.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailField label="Version" value={`v${currentDisclosure.version}`} />
            <DetailField label="Aspiration" value={ASPIRATION_LABELS[currentDisclosure.aspiration_status] || currentDisclosure.aspiration_status} />
            <DetailField label="Mobility" value={MOBILITY_LABELS[currentDisclosure.mobility] || currentDisclosure.mobility} />
            <DetailField label="Availability" value={HORIZON_LABELS[currentDisclosure.availability_horizon] || currentDisclosure.availability_horizon} />
            <DetailField label="COI Disclosed" value={currentDisclosure.conflict_of_interest_disclosed ? "Yes" : "No"} />
            <DetailField label="Submitted" value={currentDisclosure.submitted_at ? new Date(currentDisclosure.submitted_at).toLocaleDateString() : "—"} />
          </div>
          {currentDisclosure.aspiration_statement && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Aspiration Statement</p>
              <p className="text-sm text-gray-900 mt-1">{currentDisclosure.aspiration_statement}</p>
            </div>
          )}
        </SuccessionSection>
      )}

      {historyDisclosures.length > 0 && (
        <SuccessionSection icon={History} title="Disclosure History">
          <div className="space-y-2">
            {historyDisclosures.map(d => (
              <div key={d.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">v{d.version}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === "current" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {d.status}
                    </span>
                    {d.conflict_of_interest_disclosed && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> COI
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{d.submitted_at ? new Date(d.submitted_at).toLocaleDateString() : "—"}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <span>Aspiration: {ASPIRATION_LABELS[d.aspiration_status] || d.aspiration_status}</span>
                  <span>Mobility: {MOBILITY_LABELS[d.mobility] || d.mobility}</span>
                  <span>Availability: {HORIZON_LABELS[d.availability_horizon] || d.availability_horizon}</span>
                </div>
              </div>
            ))}
          </div>
        </SuccessionSection>
      )}

      {/* Evidence Portfolio — admin-only; candidates have no evidence access in MVP */}
      <EvidencePortfolioView candidacy={candidacy} />
    </div>
  );
}

function DisclosureForm({ onSubmit, loading, onCancel }) {
  const [formData, setFormData] = useState({
    aspiration_status: "interested",
    aspiration_statement: "",
    mobility: "open",
    availability_horizon: "immediate",
    conflict_of_interest_disclosed: false,
  });
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-600">Aspiration Status *</Label>
          <select aria-label="Aspiration Status" className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.aspiration_status} onChange={e => setFormData(d => ({ ...d, aspiration_status: e.target.value }))} required>
            <option value="interested">Interested</option>
            <option value="undecided">Undecided</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Mobility *</Label>
          <select aria-label="Mobility" className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.mobility} onChange={e => setFormData(d => ({ ...d, mobility: e.target.value }))} required>
            <option value="local_only">Local Only</option>
            <option value="relocatable">Relocatable</option>
            <option value="remote_only">Remote Only</option>
            <option value="open">Open</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Availability Horizon *</Label>
          <select aria-label="Availability Horizon" className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.availability_horizon} onChange={e => setFormData(d => ({ ...d, availability_horizon: e.target.value }))} required>
            <option value="immediate">Immediate</option>
            <option value="0_6_months">0–6 Months</option>
            <option value="6_12_months">6–12 Months</option>
            <option value="12_24_months">12–24 Months</option>
            <option value="24_plus_months">24+ Months</option>
          </select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4"
              checked={formData.conflict_of_interest_disclosed}
              onChange={e => setFormData(d => ({ ...d, conflict_of_interest_disclosed: e.target.checked }))} />
            Conflict of Interest Disclosed
          </label>
        </div>
      </div>
      <div className="mt-3">
        <Label className="text-xs text-gray-600">Aspiration Statement (optional)</Label>
        <textarea aria-label="Aspiration Statement" className="mt-1 w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 min-h-[60px]"
          placeholder="Optional statement about your aspirations..."
          value={formData.aspiration_statement} onChange={e => setFormData(d => ({ ...d, aspiration_statement: e.target.value }))} />
      </div>
      {formData.conflict_of_interest_disclosed && (
        <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs text-amber-800">HR follow-up will be required. No free-text COI narrative is stored.</span>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading}>Submit Disclosure</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || "—"}</p>
    </div>
  );
}