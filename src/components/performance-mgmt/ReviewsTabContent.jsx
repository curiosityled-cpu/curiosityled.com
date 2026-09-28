import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Plus, ClipboardList, Users, Star, CheckCircle2, Clock, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReviewCyclesTab from "./ReviewCyclesTab";

const SUB_ROLE_LABELS = {
  self: "Self-Assessment",
  manager: "Manager Review",
  peer: "Peer Feedback",
  hr: "HR Review",
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
  const [rating, setRating] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRole("self");
      setEmployeeEmail(role === "self" ? user.email : "");
      setRating("");
      setComments("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!employeeEmail.trim() || !rating.trim()) return;
    setSubmitting(true);
    try {
      // Find or create a review form for this tenant
      let reviewForms = await base44.entities.CustomForm.filter({
        form_type: "review_form",
        client_id: user.client_id,
      });
      let reviewForm = reviewForms[0];
      if (!reviewForm) {
        reviewForm = await base44.entities.CustomForm.create({
          title: "Performance Review Form",
          form_type: "review_form",
          client_id: user.client_id,
          status: "active",
          settings: { questions: ["overall_rating", "comments"] },
        });
      }

      // Check if a submission already exists for this cycle + employee + role
      const existing = await base44.entities.CustomFormSubmission.filter({
        form_id: reviewForm.id,
        review_cycle_id: cycle.id,
        linked_employee_email: employeeEmail.trim().toLowerCase(),
        submitter_role: role,
      });

      if (existing.length > 0) {
        await base44.entities.CustomFormSubmission.update(existing[0].id, {
          responses: { overall_rating: rating, comments: comments },
          submitted_at: new Date().toISOString(),
          status: "submitted",
        });
        toast.success("Review updated");
      } else {
        await base44.entities.CustomFormSubmission.create({
          form_id: reviewForm.id,
          client_id: user.client_id,
          submitter_email: user.email,
          submitter_name: user.full_name || user.email,
          submitter_role: role,
          linked_employee_email: employeeEmail.trim().toLowerCase(),
          review_cycle_id: cycle.id,
          responses: { overall_rating: rating, comments: comments },
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Review — {cycle?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Your Role *</Label>
            <Select value={role} onValueChange={(v) => { setRole(v); if (v === "self") setEmployeeEmail(user.email); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Self-Assessment</SelectItem>
                <SelectItem value="manager">Manager Review</SelectItem>
                <SelectItem value="peer">Peer Feedback</SelectItem>
                <SelectItem value="hr">HR Review</SelectItem>
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
          <div className="space-y-1.5">
            <Label>Overall Rating *</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 — Exceeds Expectations</SelectItem>
                <SelectItem value="4">4 — Meets Expectations</SelectItem>
                <SelectItem value="3">3 — Partially Meets</SelectItem>
                <SelectItem value="2">2 — Below Expectations</SelectItem>
                <SelectItem value="1">1 — Far Below Expectations</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Comments</Label>
            <Textarea
              placeholder="Provide supporting comments and evidence..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !employeeEmail.trim() || !rating}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AcknowledgeButton({ submission, onAcked }) {
  const [loading, setLoading] = useState(false);
  const handleAck = async () => {
    setLoading(true);
    try {
      await base44.entities.CustomFormSubmission.update(submission.id, {
        acknowledged_at: new Date().toISOString(),
        acknowledged_by_email: submission.linked_employee_email,
        status: "acknowledged",
      });
      toast.success("Review acknowledged");
      onAcked?.();
    } catch (err) {
      toast.error("Failed to acknowledge");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white" disabled={loading} onClick={handleAck}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
      Acknowledge
    </Button>
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
        client_id: user.client_id,
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
                            {sub.responses?.comments && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{sub.responses.comments}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className={`text-[10px] border ${SUB_STATUS_STYLES[sub.status] || SUB_STATUS_STYLES.submitted}`}>
                              {sub.status}
                            </Badge>
                            {canAcknowledge && <AcknowledgeButton submission={sub} onAcked={loadSubmissions} />}
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

export default function ReviewsTabContent({ user }) {
  const [cycles, setCycles] = useState([]);

  const loadCycles = async () => {
    try {
      const data = await base44.entities.CustomForm.filter({
        form_type: "review_cycle",
        client_id: user.client_id,
      }, "-created_date");
      setCycles(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadCycles(); }, [user]);

  return (
    <div className="space-y-6">
      {/* Review Cycles (existing component) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#0202ff]" /> Review Cycles
        </h3>
        <ReviewCyclesTab user={user} />
      </div>

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