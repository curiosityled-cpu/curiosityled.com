import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CATEGORY_CONFIG, SCOPE_CONFIG } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function SubmitRequestForm({ user, client, onSubmitted }) {
  const [form, setForm] = useState({
    request_category: "",
    participant_scope: "individual",
    participant_identifier: "",
    participant_name: "",
    title: "",
    description: "",
    urgency: "standard",
    requested_start_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.request_category || !form.title) {
      toast.error("Please select a category and add a title.");
      return;
    }
    setSubmitting(true);
    try {
      const settings = client?.settings || {};
      const intakeRequired = settings.require_intake_conversation !== false;
      const record = await base44.entities.CoachingRequest.create({
        request_category: form.request_category,
        participant_scope: form.participant_scope,
        participant_identifier: form.participant_identifier || user?.email || "",
        participant_name: form.participant_name || user?.full_name || "",
        requested_by_email: user?.email,
        requested_by_name: user?.full_name || "",
        client_id: client?.id || user?.client_id || "",
        title: form.title,
        description: form.description,
        status: "submitted",
        designated_program_admin_email: client?.contact_email || "",
        intake_conversation_required: intakeRequired,
        urgency: form.urgency,
        requested_start_date: form.requested_start_date || null,
      });
      toast.success("Request submitted successfully.");
      if (onSubmitted) onSubmitted(record);
      setForm({
        request_category: "",
        participant_scope: "individual",
        participant_identifier: "",
        participant_name: "",
        title: "",
        description: "",
        urgency: "standard",
        requested_start_date: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryKeys = Object.keys(CATEGORY_CONFIG);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label className="text-sm font-medium mb-2 block">What are you requesting?</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categoryKeys.map((key) => {
            const cat = CATEGORY_CONFIG[key];
            const Icon = cat.icon;
            const active = form.request_category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("request_category", key)}
                className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                  active
                    ? "border-[#0202ff] bg-[#0202ff]/5 ring-1 ring-[#0202ff]/20"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-[#0202ff]" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${active ? "text-[#0202ff]" : "text-foreground"}`}>
                  {cat.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{cat.role}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Participant scope</Label>
          <Select value={form.participant_scope} onValueChange={(v) => set("participant_scope", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SCOPE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">
            {form.participant_scope === "individual" ? "Participant email" : form.participant_scope === "cohort" ? "Cohort name / ID" : "Team identifier"}
          </Label>
          <Input
            value={form.participant_identifier}
            onChange={(e) => set("participant_identifier", e.target.value)}
            placeholder={form.participant_scope === "individual" ? "name@company.com" : "e.g. Q3 Leadership Cohort"}
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-1.5 block">Request title</Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Executive coaching for new VP"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-1.5 block">Describe what you need</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="Context, goals, situation, anything that helps us match the right practitioner..."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Priority</Label>
          <Select value={form.urgency} onValueChange={(v) => set("urgency", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Requested start date</Label>
          <Input
            type="date"
            value={form.requested_start_date}
            onChange={(e) => set("requested_start_date", e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full" style={{ backgroundColor: "#0202ff" }}>
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        {submitting ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}