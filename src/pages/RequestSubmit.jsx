import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS } from "@/components/coaching-request/RequestBadges";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export default function RequestSubmit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    request_category: "1on1_coaching",
    participant_scope: "individual",
    participant_email: "",
    participant_emails: "",
    title: "",
    description: "",
    business_justification: "",
    due_date: "",
    sponsor_email: "",
    client_id: "",
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const list = await base44.entities.Client.list();
        setClients(list);
        if (list.length > 0 && !form.client_id) {
          setForm(f => ({ ...f, client_id: user?.client_id || list[0].id }));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.title || !form.description || !form.client_id) {
      setError("Title, description, and organization are required.");
      return;
    }
    setSubmitting(true);
    try {
      const client = clients.find(c => c.id === form.client_id);
      const requireIntake = client?.settings?.require_intake_conversation ?? true;

      const participantEmails = form.participant_scope === "individual"
        ? form.participant_email
        : form.participant_emails.split(",").map(e => e.trim()).filter(Boolean);

      await base44.entities.CoachingRequest.create({
        request_category: form.request_category,
        participant_scope: form.participant_scope,
        participant_email: form.participant_scope === "individual" ? form.participant_email : null,
        participant_emails: form.participant_scope !== "individual" ? participantEmails : [],
        title: form.title,
        description: form.description,
        requested_by_email: user.email,
        client_id: form.client_id,
        business_justification: form.business_justification,
        due_date: form.due_date || null,
        sponsor_email: form.sponsor_email || null,
        status: "submitted",
        intake_conversation_required: requireIntake,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Request Submitted</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your request has been submitted and will be reviewed by your Program Administrator.
              {form.participant_scope === "individual" ? " You'll be notified when it's assigned and accepted." : ""}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
              <Button onClick={() => { setSubmitted(false); setForm({ ...form, title: "", description: "", business_justification: "" }); }}>
                Submit Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold mb-1">Submit a Request</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Request coaching, consulting, or assessment support for yourself, a cohort, or a team.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Category</Label>
                <Select value={form.request_category} onValueChange={v => setForm({ ...form, request_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Organization</Label>
                <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Participant Scope</Label>
              <Select value={form.participant_scope} onValueChange={v => setForm({ ...form, participant_scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="cohort">Cohort</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.participant_scope === "individual" ? (
              <div>
                <Label className="mb-1.5 block">Participant Email</Label>
                <Input
                  type="email"
                  value={form.participant_email}
                  onChange={e => setForm({ ...form, participant_email: e.target.value })}
                  placeholder="name@company.com"
                />
              </div>
            ) : (
              <div>
                <Label className="mb-1.5 block">Participant Emails (comma-separated)</Label>
                <Textarea
                  value={form.participant_emails}
                  onChange={e => setForm({ ...form, participant_emails: e.target.value })}
                  placeholder="name1@company.com, name2@company.com"
                  rows={2}
                />
              </div>
            )}

            <div>
              <Label className="mb-1.5 block">Title</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Brief title for this request"
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what support you need"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Additional Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Business Justification</Label>
              <Textarea
                value={form.business_justification}
                onChange={e => setForm({ ...form, business_justification: e.target.value })}
                placeholder="Why is this needed?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Target Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Sponsor Email (optional)</Label>
                <Input
                  type="email"
                  value={form.sponsor_email}
                  onChange={e => setForm({ ...form, sponsor_email: e.target.value })}
                  placeholder="HRBP or manager email"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={submitting || loading}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}