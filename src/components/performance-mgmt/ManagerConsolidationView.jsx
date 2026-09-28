import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, User, Users, FileText, Target, ChevronDown, ChevronRight, Star } from "lucide-react";
import ReviewFormRenderer, { DEFAULT_REVIEW_FORM_CONFIG } from "./ReviewFormRenderer";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_LABELS = {
  self: "Self-Assessment",
  manager: "Manager Review",
  peer: "Peer Feedback",
  hr: "HR Review",
};

function SubmissionPanel({ role, submission, employeeEmail }) {
  if (!submission) {
    return (
      <Card className="border border-dashed border-gray-200 rounded-xl">
        <CardContent className="p-4 text-center">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mx-auto mb-2">
            {role === "self" ? <User className="w-4 h-4 text-gray-300" /> :
             role === "peer" ? <Users className="w-4 h-4 text-gray-300" /> :
             <FileText className="w-4 h-4 text-gray-300" />}
          </div>
          <p className="text-xs text-gray-400">{ROLE_LABELS[role]} not submitted</p>
        </CardContent>
      </Card>
    );
  }

  const responses = submission.responses || {};
  const overallRating = responses.overall_rating || responses.overall_rating;

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              {role === "self" ? <User className="w-3.5 h-3.5 text-[#0202ff]" /> :
               role === "peer" ? <Users className="w-3.5 h-3.5 text-[#0202ff]" /> :
               <FileText className="w-3.5 h-3.5 text-[#0202ff]" />}
            </div>
            <span className="text-sm font-medium text-gray-900">{ROLE_LABELS[role]}</span>
          </div>
          {overallRating && (
            <Badge variant="outline" className="text-[10px] border border-blue-200 text-blue-700 bg-blue-50">
              {overallRating}/5
            </Badge>
          )}
        </div>
        <div className="space-y-2 text-xs">
          {responses.strengths && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Strengths</p>
              <p className="text-gray-600 mt-0.5">{responses.strengths}</p>
            </div>
          )}
          {responses.improvements && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Improvements</p>
              <p className="text-gray-600 mt-0.5">{responses.improvements}</p>
            </div>
          )}
          {responses.development_goals && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Development Goals</p>
              <p className="text-gray-600 mt-0.5">{responses.development_goals}</p>
            </div>
          )}
          {responses.calibration_comments && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Comments</p>
              <p className="text-gray-600 mt-0.5">{responses.calibration_comments}</p>
            </div>
          )}
          {responses.competency_ratings && Object.keys(responses.competency_ratings).length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Competency Ratings</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(responses.competency_ratings).map(([cid, val]) => (
                  <Badge key={cid} variant="outline" className="text-[10px]">{val}/5</Badge>
                ))}
              </div>
            </div>
          )}
          {!responses.strengths && !responses.improvements && !responses.calibration_comments && (
            <p className="text-gray-400 italic">No detailed responses</p>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-50">
          By: {submission.submitter_email} · {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function PerformanceDataSection({ employeeEmail }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getPerformanceTimeline", { employee_email: employeeEmail });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && !data) loadData();
  }, [expanded]);

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#0202ff]" />
            <span className="text-sm font-medium text-gray-900">Employee Performance Data</span>
            <Badge variant="outline" className="text-[10px]">Goals, KPIs, Evidence</Badge>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 border-t border-gray-50">
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" /></div>
                ) : data ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                    {[
                      { label: "Goals", value: data.counts?.goals || 0, icon: Target },
                      { label: "KPIs", value: data.counts?.kpis || 0, icon: Star },
                      { label: "Coaching", value: data.counts?.coaching_sessions || 0, icon: Users },
                      { label: "Check-ins", value: (data.counts?.daily_checkins || 0) + (data.counts?.weekly_checkins || 0), icon: FileText },
                    ].map(s => (
                      <div key={s.label} className="text-center p-2 rounded-lg bg-gray-50">
                        <p className="text-lg font-bold text-gray-900">{s.value}</p>
                        <p className="text-[10px] text-gray-500">{s.label}</p>
                      </div>
                    ))}
                    {data.timeline && data.timeline.length > 0 && (
                      <div className="col-span-full mt-2 space-y-1 max-h-40 overflow-y-auto">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Recent Activity</p>
                        {data.timeline.slice(0, 8).map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-[10px] py-1 border-b border-gray-50 last:border-0">
                            <span className="text-gray-400 flex-shrink-0">{item.date ? new Date(item.date).toLocaleDateString() : ""}</span>
                            <span className="text-gray-600">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-4 text-center">Unable to load performance data</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default function ManagerConsolidationView({ cycle, employeeEmail, user, onSaved }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managerResponses, setManagerResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState(null);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const subs = await base44.entities.CustomFormSubmission.filter({
        review_cycle_id: cycle.id,
        linked_employee_email: employeeEmail,
      }, "-submitted_at");
      setSubmissions(subs);

      // Find or create review form
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

      // Check if manager already submitted
      const existingMgr = subs.find(s => s.submitter_role === "manager");
      if (existingMgr) setManagerResponses(existingMgr.responses || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubmissions(); }, [cycle.id, employeeEmail]);

  const selfSub = submissions.find(s => s.submitter_role === "self");
  const peerSubs = submissions.filter(s => s.submitter_role === "peer");
  const mgrSub = submissions.find(s => s.submitter_role === "manager");

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formId = reviewForm.id;
      const existing = submissions.find(s => s.submitter_role === "manager");

      if (existing) {
        await base44.entities.CustomFormSubmission.update(existing.id, {
          responses: managerResponses,
          submitted_at: new Date().toISOString(),
          status: "submitted",
        });
        toast.success("Manager review updated");
      } else {
        await base44.entities.CustomFormSubmission.create({
          form_id: formId,
          client_id: user.client_id || user.data?.client_id,
          submitter_email: user.email,
          submitter_name: user.full_name || user.email,
          submitter_role: "manager",
          linked_employee_email: employeeEmail,
          review_cycle_id: cycle.id,
          responses: managerResponses,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submission_source: "direct",
        });
        toast.success("Manager review submitted");
      }
      onSaved?.();
      loadSubmissions();
    } catch (err) {
      toast.error("Failed to submit: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Employee performance data (collapsible) */}
      <PerformanceDataSection employeeEmail={employeeEmail} />

      {/* Side-by-side panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Self-Assessment</p>
          <SubmissionPanel role="self" submission={selfSub} employeeEmail={employeeEmail} />
        </div>
        <div>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Peer Feedback ({peerSubs.length})</p>
          {peerSubs.length > 0 ? (
            <div className="space-y-2">
              {peerSubs.map((ps, i) => <SubmissionPanel key={ps.id || i} role="peer" submission={ps} employeeEmail={employeeEmail} />)}
            </div>
          ) : (
            <SubmissionPanel role="peer" submission={null} employeeEmail={employeeEmail} />
          )}
        </div>
        <div>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Manager Review {mgrSub && "(Submitted)"}</p>
          {mgrSub && (
            <SubmissionPanel role="manager" submission={mgrSub} employeeEmail={employeeEmail} />
          )}
        </div>
      </div>

      {/* Manager review form */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#0202ff]" />
          {mgrSub ? "Edit Manager Review" : "Complete Manager Review"}
        </h4>
        <ReviewFormRenderer
          formConfig={reviewForm?.config || DEFAULT_REVIEW_FORM_CONFIG}
          employeeEmail={employeeEmail}
          responses={managerResponses}
          onChange={setManagerResponses}
        />
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {mgrSub ? "Update Review" : "Submit Manager Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}