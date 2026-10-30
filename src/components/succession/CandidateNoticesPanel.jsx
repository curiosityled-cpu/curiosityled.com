import React, { useCallback, useEffect, useState } from "react";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Send, FileText } from "lucide-react";

const NOTICE_TYPES = [
  { value: "candidacy_inclusion", label: "Being considered for a role" },
  { value: "evidence_use", label: "Evidence used about them" },
  { value: "readiness_outcome", label: "Readiness outcome" },
  { value: "decision_outcome", label: "Decision outcome" },
  { value: "legal_hold", label: "Record under legal hold" },
  { value: "retention", label: "Record retention" },
];

const STATUS_STYLE = {
  draft: "bg-gray-50 text-gray-700 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  acknowledged: "bg-emerald-50 text-emerald-700 border-emerald-200",
  withdrawn: "bg-gray-50 text-gray-500 border-gray-200",
};

/**
 * CandidateNoticesPanel — what a candidate was told about their own record.
 *
 * A notice is versioned rather than edited, so the version that was actually
 * sent stays readable. It is delivered in-app, which means the candidate needs
 * an account: the server refuses to mark a notice sent when it can reach nobody.
 */
export default function CandidateNoticesPanel() {
  const { invoke, loading, error } = useSuccessionApi();
  const [candidacies, setCandidacies] = useState([]);
  const [candidacyId, setCandidacyId] = useState("");
  const [notices, setNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [noticeType, setNoticeType] = useState("candidacy_inclusion");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [legalBasis, setLegalBasis] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await invoke("successionListCandidacies", {
          operation_id: `notice-candidacies-${Date.now()}`,
        });
        const rows = res?.candidacies || res?.rows || [];
        if (!cancelled) {
          setCandidacies(rows);
          if (rows.length > 0) setCandidacyId((prev) => prev || rows[0].id);
        }
      } catch {
        if (!cancelled) setCandidacies([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoke]);

  const loadNotices = useCallback(async () => {
    if (!candidacyId) {
      setNotices([]);
      return;
    }
    setLoadingNotices(true);
    try {
      const res = await invoke("successionCandidateNotice", { action: "list", candidacy_id: candidacyId });
      setNotices(res?.notices || []);
    } catch {
      setNotices([]);
    } finally {
      setLoadingNotices(false);
    }
  }, [candidacyId, invoke]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const draftNotice = async () => {
    if (summary.trim().length < 10 || body.trim().length < 40) return;
    await invoke("successionCandidateNotice", {
      action: "draft",
      candidacy_id: candidacyId,
      notice_type: noticeType,
      summary: summary.trim(),
      body: body.trim(),
      legal_basis: legalBasis.trim() || undefined,
    });
    setSummary("");
    setBody("");
    setLegalBasis("");
    loadNotices();
  };

  const sendNotice = async (noticeId) => {
    await invoke("successionCandidateNotice", { action: "send", notice_id: noticeId });
    loadNotices();
  };

  const label = (c) =>
    c.candidate_name || c.subject_name || c.user_email || c.subject_email || c.id.slice(-8);

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Card>
        <CardContent className="py-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Draft a notice</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              About the candidate's own record only. Each version is kept exactly as sent.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Candidate</Label>
              <Select value={candidacyId} onValueChange={setCandidacyId}>
                <SelectTrigger className="mt-1" aria-label="Candidate">
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidacies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {label(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notice type</Label>
              <Select value={noticeType} onValueChange={setNoticeType}>
                <SelectTrigger className="mt-1" aria-label="Notice type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTICE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Summary line</Label>
            <Input
              className="mt-1"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. You are being considered for Operations Director"
            />
          </div>

          <div>
            <Label className="text-xs">What the candidate reads</Label>
            <Textarea
              className="mt-1"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write against the role criteria, never against the person. Do not include another candidate's information."
            />
          </div>

          <div>
            <Label className="text-xs">Why this notice is owed (optional)</Label>
            <Input
              className="mt-1"
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              placeholder="e.g. Transparency policy 4.2"
            />
          </div>

          <Button
            size="sm"
            onClick={draftNotice}
            disabled={loading || !candidacyId || summary.trim().length < 10 || body.trim().length < 40}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
            Save draft
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Notices</h3>
        {loadingNotices ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : notices.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-gray-500">
              No notices yet for this candidate.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notices.map((n) => (
              <Card key={n.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${STATUS_STYLE[n.status] || ""}`}>
                          {n.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {NOTICE_TYPES.find((t) => t.value === n.notice_type)?.label || n.notice_type}
                        </span>
                        <span className="text-xs text-gray-400">v{n.version}</span>
                      </div>
                      <p className="text-sm text-gray-900 mt-1">{n.summary}</p>
                      <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {n.sent_at
                          ? `Sent ${new Date(n.sent_at).toLocaleDateString()} by ${n.sent_by_email}`
                          : `Drafted ${n.drafted_at ? new Date(n.drafted_at).toLocaleDateString() : ""} by ${n.drafted_by_email || ""}`}
                        {n.acknowledged_at ? ` — acknowledged ${new Date(n.acknowledged_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    {n.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => sendNotice(n.id)} disabled={loading}>
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Send
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}