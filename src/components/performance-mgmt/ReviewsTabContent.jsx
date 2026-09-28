import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Plus, ClipboardList, Users, Star, CheckCircle2, Clock, FileText, Eye, Scale,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReviewCyclesTab from "./ReviewCyclesTab";
import ReviewFormRenderer, { DEFAULT_REVIEW_FORM_CONFIG } from "./ReviewFormRenderer";
import GuidedReviewFlow from "./GuidedReviewFlow";
import ManagerConsolidationView from "./ManagerConsolidationView";
import CalibrationView from "./CalibrationView";
import AcknowledgeDialog from "./AcknowledgeDialog";

const SUB_ROLE_LABELS = {
  self: "Self-Assessment",
  manager: "Manager Review",
  peer: "Peer Feedback",
  hr: "Skip-Level / HR Review",
};

const SUB_STATUS_STYLES = {
  in_progress: "bg-gray-50 text-gray-600 border-gray-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  acknowledged: "bg-purple-50 text-purple-700 border-purple-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function ReviewSubmissionModal({ isOpen, onClose, cycle, user, onSaved }) {
  const [role, setRole] = useState("self");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [responses, setResponses] = useState({});
  const [reviewForm, setReviewForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRole("self");
      setEmployeeEmail(user.email);
      setResponses({});
      // Find or create review form
      const loadForm = async () => {
        try {
          let forms = await base44.entities.CustomForm.filter({
            form_type: "review_form",
            client_id: user.client_id || user.data?.client_id,
          });
          let form = forms[0];
          if (!form) {
            form = await base44.entities.CustomForm.create({
              title: "Performance Review Form",
              form_type: "review_form",
              form_category: "evaluation",
              client_id: user.client_id || user.data?.client_id,
              status: "published",
              config: DEFAULT_REVIEW_FORM_CONFIG,
            });
          }
          setReviewForm(form);
        } catch (e) {
          console.error(e);
        }
      };
      loadForm();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!employeeEmail.trim()) return;
    setSubmitting(true);
    try {
      // Check if a submission already exists for this cycle + employee + role
      const existing = await base44.entities.CustomFormSubmission.filter({
        form_id: reviewForm.id,
        review_cycle_id: cycle.id,
        linked_employee_email: employeeEmail.trim().toLowerCase(),
        submitter_role: role,
      });

      if (existing.length > 0) {
        await base44.entities.CustomFormSubmission.update(existing[0].id, {
          responses,
          submitted_at: new Date().toISOString(),
          status: "submitted",
        });
        toast.success("Review updated");
      } else {
        await base44.entities.CustomFormSubmission.create({
          form_id: reviewForm.id,
          client_id: user.client_id || user.data?.client_id,
          submitter_email: user.email,
          submitter_name: user.full_name || user.email,
          submitter_role: role,
          linked_employee_email: employeeEmail.trim().toLowerCase(),
          review_cycle_id: cycle.id,
          responses,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submission_source: "direct",
        });
        toast.success("Review submitted");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Failed to submit review: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Review — {cycle?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Your Role *</Label>
              <Select value={role} onValueChange={(v) => { setRole(v); if (v === "self") setEmployeeEmail(user.email); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self-Assessment</SelectItem>
                  <SelectItem value="manager">Manager Review</SelectItem>
                  <SelectItem value="peer">Peer Feedback</SelectItem>
                  <SelectItem value="hr">Skip-Level / HR Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employee Email *</Label>
              <Input
                placeholder="employee@company.com"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                disabled={role === "self"}
              />
            </div>
          </div>

          {reviewForm ? (
            <GuidedReviewFlow
              role={role}
              employeeEmail={employeeEmail}
              formConfig={reviewForm.config || DEFAULT_REVIEW_FORM_CONFIG}
              responses={responses}
              onChange={setResponses}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          ) : (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
          )}

          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AcknowledgeButton({ submission, cycle, onAcked }) {
  const [showDialog, setShowDialog] = useState(false);
  return (
    <>
      <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowDialog(true)}>
        <CheckCircle2 className="w-3 h-3" />
        Acknowledge
      </Button>
      {showDialog && (
        <AcknowledgeDialog
          submission={submission}
          cycle={cycle}
          onClose={() => setShowDialog(false)}
          onAcked={onAcked}
        />
      )}
    </>
  );
}

function ReviewSubmissionsView({ user, cycles }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCycle, setFilterCycle] = useState("all");
  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const subs = await base44.entities.CustomFormSubmission.filter({
        client_id: user.client_id || user.data?.client_id,
        review_cycle_id: { $exists: true },
      }, "-submitted_at", 100);
      setSubmissions(subs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubmissions(); }, [user]);

  const filtered = submissions.filter(s =>
    filterCycle === "all" || s.review_cycle_id === filterCycle
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        {cycles.length > 0 && (
          <>
            <Select value={filterCycle} onValueChange={setFilterCycle}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Filter by cycle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                {cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              onClick={() => { setSelectedCycle(cycles.find(c => c.id === filterCycle && c.id !== "all") || cycles[0]); setShowSubmit(true); }}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5"
              disabled={!cycles.find(c => c.status === "active")}
            >
              <Plus className="w-4 h-4" /> Complete Review
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No review submissions yet</p>
          <p className="text-xs text-gray-400 mt-1">Complete a review to see submissions here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub, i) => {
            const cycle = cycles.find(c => c.id === sub.review_cycle_id);
            const canAcknowledge = sub.linked_employee_email === user.email && !sub.acknowledged_at && sub.status === "submitted";
            return (
              <motion.div key={sub.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border border-gray-100 shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-[#0202ff]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {SUB_ROLE_LABELS[sub.submitter_role] || "Review"} — {sub.responses?.overall_rating || "N/A"}/5
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Employee: {sub.linked_employee_email} · By: {sub.submitter_email}
                            </p>
                            {sub.responses?.strengths && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{sub.responses.strengths}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className={`text-[10px] border ${SUB_STATUS_STYLES[sub.status] || SUB_STATUS_STYLES.submitted}`}>
                              {sub.status}
                            </Badge>
                            {canAcknowledge && <AcknowledgeButton submission={sub} cycle={cycle} onAcked={loadSubmissions} />}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {cycle && <span className="text-[10px] text-gray-400">{cycle.title}</span>}
                          {sub.submitted_at && (
                            <span className="text-[10px] text-gray-400">
                              · {format(new Date(sub.submitted_at), "MMM d, yyyy")}
                            </span>
                          )}
                          {sub.acknowledged_at && (
                            <span className="text-[10px] text-purple-600 flex items-center gap-0.5">
                              · <CheckCircle2 className="w-3 h-3" /> Acknowledged
                            </span>
                          )}
                        </div>
                        {sub.acknowledged_at && sub.metadata?.acknowledgment_disagreement && (
                          <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50 mt-1.5">
                            Disagreement noted
                          </Badge>
                        )}
                        {sub.acknowledged_at && sub.metadata?.acknowledgment_comments && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-50">
                            <p className="text-[10px] text-gray-500">Employee comments:</p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{sub.metadata.acknowledgment_comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {showSubmit && selectedCycle && (
        <ReviewSubmissionModal
          isOpen={showSubmit}
          onClose={() => setShowSubmit(false)}
          cycle={selectedCycle}
          user={user}
          onSaved={loadSubmissions}
        />
      )}
    </div>
  );
}

function ManagerConsolidationSection({ user, cycles }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(null);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      // Get all active cycles
      const activeCycles = cycles.filter(c => c.status === "active" || c.status === "draft");
      if (activeCycles.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }
      // Get roster entries where this user is the manager
      const allRoster = await base44.entities.ReviewParticipant.filter({
        manager_email: user.email,
      });
      setAssignments(allRoster);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssignments(); }, [user, cycles]);

  const openConsolidation = (assignment) => {
    const cycle = cycles.find(c => c.id === assignment.review_cycle_id);
    setSelectedCycle(cycle);
    setSelectedEmployee(assignment.employee_email);
  };

  if (loading) return null;
  if (assignments.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-[#0202ff]" /> Manager Consolidation
        <Badge variant="outline" className="text-[10px]">{assignments.length} assigned</Badge>
      </h3>
      <div className="space-y-2">
        {assignments.map((a, i) => {
          const cycle = cycles.find(c => c.id === a.review_cycle_id);
          if (!cycle) return null;
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-all cursor-pointer" onClick={() => openConsolidation(a)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{a.employee_name || a.employee_email}</p>
                    <p className="text-[10px] text-gray-400">{cycle.title}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Eye className="w-3 h-3" /> Review
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {selectedEmployee && selectedCycle && (
        <Dialog open={!!selectedEmployee} onOpenChange={() => { setSelectedEmployee(null); setSelectedCycle(null); }}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manager Consolidation — {selectedEmployee}</DialogTitle>
            </DialogHeader>
            <ManagerConsolidationView
              cycle={selectedCycle}
              employeeEmail={selectedEmployee}
              user={user}
              onSaved={() => loadAssignments()}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CalibrationSection({ user, cycles }) {
  const [selectedCycleId, setSelectedCycleId] = useState("");

  const activeCycles = cycles.filter(c => c.status === "active" || c.status === "archived");
  const selectedCycle = activeCycles.find(c => c.id === selectedCycleId);

  if (activeCycles.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Scale className="w-4 h-4 text-[#0202ff]" /> Calibration
      </h3>
      <div className="space-y-3">
        <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select a review cycle..." /></SelectTrigger>
          <SelectContent>
            {activeCycles.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedCycle && <CalibrationView cycle={selectedCycle} user={user} />}
      </div>
    </div>
  );
}

export default function ReviewsTabContent({ user }) {
  const [cycles, setCycles] = useState([]);

  const loadCycles = async () => {
    try {
      const data = await base44.entities.CustomForm.filter({
        form_type: "review_cycle",
        client_id: user.client_id || user.data?.client_id,
      }, "-created_date");
      setCycles(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadCycles(); }, [user]);

  return (
    <div className="space-y-6">
      {/* Review Cycles with Roster Management */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#0202ff]" /> Review Cycles
        </h3>
        <ReviewCyclesTab user={user} />
      </div>

      {/* Manager Consolidation */}
      <ManagerConsolidationSection user={user} cycles={cycles} />

      {/* Calibration */}
      <CalibrationSection user={user} cycles={cycles} />

      {/* Review Submissions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0202ff]" /> Review Submissions
        </h3>
        <ReviewSubmissionsView user={user} cycles={cycles} />
      </div>
    </div>
  );
}