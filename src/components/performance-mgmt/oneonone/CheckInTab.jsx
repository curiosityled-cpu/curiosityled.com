import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, CheckCircle2, Zap, AlertCircle, Target, MessageSquare,
  Sparkles, ChevronDown, ChevronUp, Plus, Flag, TrendingUp, Lightbulb,
  Paperclip, Trash2, Edit2, X, Users
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { toast } from "sonner";

const ENERGY_LABELS = { 1: "Exhausted", 2: "Low", 3: "Okay", 4: "Good", 5: "Energised" };
const ENERGY_COLORS = { 1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#22c55e", 5: "#0202ff" };

const EMPTY_FORM = {
  accomplishments: "",
  next_priority: "",
  energy_level: 3,
  help_needed: "",
  feedback_to_give: "",
  document_urls: [],
};

function EnergyPicker({ value, onChange, readOnly }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange(n)}
          className="flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all"
          style={{
            borderColor: value === n ? ENERGY_COLORS[n] : "#e5e7eb",
            backgroundColor: value === n ? `${ENERGY_COLORS[n]}15` : "white",
            color: value === n ? ENERGY_COLORS[n] : "#6b7280",
            cursor: readOnly ? "default" : "pointer",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// The employee's check-in submission form
function CheckInForm({ user, targetEmail, targetName, onSaved, weekOf, existingCheckIn, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    accomplishments: existingCheckIn?.accomplishments || "",
    next_priority: existingCheckIn?.next_priority || "",
    energy_level: existingCheckIn?.energy_level || 3,
    help_needed: existingCheckIn?.help_needed || "",
    feedback_to_give: existingCheckIn?.feedback_to_give || "",
    document_urls: existingCheckIn?.document_urls || [],
  });

  const set = field => e => setForm(p => ({ ...p, [field]: typeof e === "object" ? e.target.value : e }));

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, document_urls: [...(p.document_urls || []), file_url] }));
      toast.success("File uploaded");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = (url) => setForm(p => ({ ...p, document_urls: p.document_urls.filter(u => u !== url) }));

  const handleSave = async () => {
    if (!form.accomplishments && !form.next_priority) {
      toast.error("Please fill in at least one field");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: user.client_id,
        employee_email: targetEmail,
        manager_email: user.manager_email || "",
        week_of: weekOf,
        ...form,
      };
      if (existingCheckIn) {
        await base44.entities.WeeklyCheckIn.update(existingCheckIn.id, payload);
        toast.success("Check-in updated");
      } else {
        await base44.entities.WeeklyCheckIn.create(payload);
        toast.success("Check-in submitted!");
      }
      onSaved?.();
    } catch {
      toast.error("Failed to save check-in");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{existingCheckIn ? "Edit Check-In" : "New Check-In"}</h4>
          <p className="text-xs text-gray-500">Week of {format(new Date(weekOf + "T00:00:00"), "MMMM d, yyyy")}</p>
        </div>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        )}
      </div>

      {[
        { key: "accomplishments", label: "What did you accomplish this week?", icon: CheckCircle2, color: "#22c55e", placeholder: "Wins, progress, highlights..." },
        { key: "next_priority", label: "Top priority for next week", icon: Target, color: "#0202ff", placeholder: "Most important focus..." },
        { key: "help_needed", label: "What help or resources are needed?", icon: AlertCircle, color: "#f97316", placeholder: "Unblocking, decisions, resources..." },
        { key: "feedback_to_give", label: "Feedback, concerns, or recognition", icon: MessageSquare, color: "#8b5cf6", placeholder: "About your work, the team, or our collaboration..." },
      ].map(({ key, label, icon: Icon, color, placeholder }) => (
        <Card key={key} className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
            <Textarea rows={2} placeholder={placeholder} value={form[key]} onChange={set(key)} className="text-sm resize-none border-gray-200" />
          </CardContent>
        </Card>
      ))}

      <Card className="border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Energy / Morale (1–5)</span>
            </div>
            {form.energy_level && (
              <span className="text-xs font-medium" style={{ color: ENERGY_COLORS[form.energy_level] }}>
                {ENERGY_LABELS[form.energy_level]}
              </span>
            )}
          </div>
          <EnergyPicker value={form.energy_level} onChange={v => setForm(p => ({ ...p, energy_level: v }))} />
        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card className="border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Attachments</span>
            </div>
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.pptx" />
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={uploading} asChild>
                <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}Upload File</span>
              </Button>
            </label>
          </div>
          {form.document_urls?.length > 0 ? (
            <div className="space-y-1.5">
              {form.document_urls.map((url, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                  <a href={url} target="_blank" rel="noreferrer" className="text-xs text-[#0202ff] hover:underline truncate flex-1">
                    {url.split("/").pop() || `Document ${i + 1}`}
                  </a>
                  <button onClick={() => removeDoc(url)} className="ml-2 text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No files attached. You can upload PDFs, Word docs, images, etc.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {onCancel && <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>}
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {existingCheckIn ? "Update Check-In" : "Submit Check-In"}
        </Button>
      </div>
    </div>
  );
}

// Manager's private response panel
function ManagerResponsePanel({ checkIn, user, onSaved }) {
  const [notes, setNotes] = useState(checkIn.manager_notes || "");
  const [reviewed, setReviewed] = useState(checkIn.reviewed_together || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.WeeklyCheckIn.update(checkIn.id, {
        manager_notes: notes,
        reviewed_together: reviewed,
        manager_reviewed: true,
      });
      toast.success("Manager response saved");
      onSaved?.();
    } catch {
      toast.error("Failed to save response");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-dashed border-purple-200 space-y-3">
      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Your Private Notes</p>
      <Textarea
        rows={3}
        placeholder="Recognition, coaching notes, action items to discuss..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="text-sm resize-none border-gray-200 bg-white"
      />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="w-4 h-4 accent-[#0202ff]" />
        <span className="text-sm text-gray-600">We reviewed this check-in together</span>
      </label>
      <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
        {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
        Save Response
      </Button>
    </div>
  );
}

// Expandable submission card
function SubmissionCard({ checkIn, isManager, user, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const energyColor = ENERGY_COLORS[checkIn.energy_level] || "#6b7280";
  const isOwner = user.email === checkIn.employee_email;

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-4">
        <button className="w-full flex items-center justify-between text-left" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${energyColor}20`, color: energyColor }}>
              {checkIn.energy_level || "–"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800">Week of {format(new Date(checkIn.week_of + "T00:00:00"), "MMMM d, yyyy")}</p>
                {isManager && <span className="text-xs text-gray-400">· {checkIn.employee_email}</span>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{checkIn.accomplishments?.substring(0, 60) || "—"}{checkIn.accomplishments?.length > 60 ? "..." : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {checkIn.manager_reviewed && <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200 border hidden sm:flex">Reviewed</Badge>}
            {checkIn.reviewed_together && <Badge className="text-xs bg-green-50 text-green-700 border-green-200 border hidden sm:flex">Discussed</Badge>}
            {checkIn.document_urls?.length > 0 && <Paperclip className="w-3.5 h-3.5 text-gray-400" />}
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
            {[
              { label: "Accomplishments & Wins", value: checkIn.accomplishments, icon: CheckCircle2, color: "#22c55e" },
              { label: "Top Priority Next Week", value: checkIn.next_priority, icon: Target, color: "#0202ff" },
              { label: "Help / Resources Needed", value: checkIn.help_needed, icon: AlertCircle, color: "#f97316" },
              { label: "Feedback & Recognition", value: checkIn.feedback_to_give, icon: MessageSquare, color: "#8b5cf6" },
            ].filter(f => f.value).map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
              </div>
            ))}

            {checkIn.document_urls?.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Attachments</span>
                </div>
                {checkIn.document_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-[#0202ff] hover:underline block">
                    {url.split("/").pop() || `Document ${i + 1}`}
                  </a>
                ))}
              </div>
            )}

            {/* Manager private notes (read-only for employee if manager saved) */}
            {isManager && checkIn.manager_notes && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-700 mb-1">Your Private Notes</p>
                <p className="text-sm text-purple-800 whitespace-pre-wrap">{checkIn.manager_notes}</p>
              </div>
            )}

            {/* Manager response form */}
            {isManager && (
              <ManagerResponsePanel checkIn={checkIn} user={user} onSaved={() => {}} />
            )}

            {/* Edit/Delete actions */}
            <div className="flex gap-2 pt-1">
              {(isOwner || isManager) && onEdit && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEdit(checkIn)}>
                  <Edit2 className="w-3 h-3" /> Edit
                </Button>
              )}
              {(isOwner || isManager) && onDelete && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => onDelete(checkIn)}>
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// AI insights panel
function AIInsightsPanel({ checkIns, employeeName }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const generateInsights = async () => {
    if (checkIns.length === 0) return;
    setLoading(true);
    try {
      const summary = checkIns.slice(0, 8).map(c => ({
        week: c.week_of, energy: c.energy_level,
        accomplishments: c.accomplishments, blockers: c.help_needed,
        priority: c.next_priority, feedback: c.feedback_to_give,
      }));
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an executive coach analyzing weekly check-ins for ${employeeName || "a team member"}.\n\nCheck-in data (last ${summary.length} weeks):\n${JSON.stringify(summary, null, 2)}\n\nProvide:\n1. SUMMARY (2 sentences)\n2. FLAGS (bullet list of risks, repeated blockers, energy drops)\n3. OPPORTUNITIES (bullet list: strengths, growth areas)\n4. RECOMMENDATIONS (2-3 action items for the manager)\n\nBe specific and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            flags: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
          },
        },
      });
      setInsights(result);
      setExpanded(true);
    } catch {
      toast.error("Could not generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-[#0202ff]/20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0202ff]" />
            <span className="text-sm font-semibold text-[#0202ff]">AI Check-In Insights</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-[#0202ff] text-[#0202ff] hover:bg-blue-50"
            onClick={insights ? () => setExpanded(!expanded) : generateInsights}
            disabled={loading || checkIns.length === 0}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {insights ? (expanded ? "Collapse" : "Show Insights") : "Generate Insights"}
          </Button>
        </div>
        {checkIns.length === 0 && <p className="text-xs text-gray-400">No check-ins available yet.</p>}
        {expanded && insights && (
          <div className="space-y-3 text-sm">
            <div className="bg-white/70 rounded-lg p-3">
              <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Summary</p>
              <p className="text-gray-600 text-xs leading-relaxed">{insights.summary}</p>
            </div>
            {insights.flags?.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="font-semibold text-red-700 mb-1 flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> Flags & Risks</p>
                <ul className="space-y-1">{insights.flags.map((f, i) => <li key={i} className="text-xs text-red-700">• {f}</li>)}</ul>
              </div>
            )}
            {insights.opportunities?.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="font-semibold text-green-700 mb-1 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Opportunities</p>
                <ul className="space-y-1">{insights.opportunities.map((o, i) => <li key={i} className="text-xs text-green-700">• {o}</li>)}</ul>
              </div>
            )}
            {insights.recommendations?.length > 0 && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="font-semibold text-purple-700 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Recommendations</p>
                <ul className="space-y-1">{insights.recommendations.map((r, i) => <li key={i} className="text-xs text-purple-700">• {r}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main CheckInTab
export default function CheckInTab({ user, isManager, teamMembers = [] }) {
  const currentWeekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState(null);
  const [filterEmployee, setFilterEmployee] = useState("all"); // "all" or specific email

  useEffect(() => { loadCheckIns(); }, [filterEmployee]);

  const loadCheckIns = async () => {
    setLoading(true);
    try {
      let filter = {};
      if (!isManager) {
        filter = { employee_email: user.email };
      } else if (filterEmployee !== "all") {
        filter = { manager_email: user.email, employee_email: filterEmployee };
      } else {
        filter = { manager_email: user.email };
      }
      const data = await base44.entities.WeeklyCheckIn.filter(filter, "-week_of", 50);
      setCheckIns(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (checkIn) => {
    if (!confirm("Delete this check-in? This cannot be undone.")) return;
    try {
      await base44.entities.WeeklyCheckIn.delete(checkIn.id);
      setCheckIns(prev => prev.filter(c => c.id !== checkIn.id));
      toast.success("Check-in deleted");
    } catch {
      toast.error("Failed to delete check-in");
    }
  };

  const handleEdit = (checkIn) => {
    setEditingCheckIn(checkIn);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingCheckIn(null);
    loadCheckIns();
  };

  const displayedName = filterEmployee === "all"
    ? "team"
    : teamMembers.find(m => m.email === filterEmployee)?.full_name || filterEmployee;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Check-Ins</h3>
          <p className="text-xs text-gray-500">
            {isManager ? "Review your direct reports' submitted check-ins" : "Submit and track your weekly check-ins"}
          </p>
        </div>
        {!isManager && !showForm && (
          <Button onClick={() => { setEditingCheckIn(null); setShowForm(true); }} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
            <Plus className="w-4 h-4" /> New Check-In
          </Button>
        )}
      </div>

      {/* Manager filter: all team or specific person */}
      {isManager && (
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by team member..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team Members</SelectItem>
              {teamMembers.map(m => (
                <SelectItem key={m.email} value={m.email}>{m.full_name || m.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Direct report: New check-in form */}
      {showForm && !isManager && (
        <CheckInForm
          user={user}
          targetEmail={user.email}
          targetName={user.full_name || user.email}
          weekOf={editingCheckIn?.week_of || currentWeekOf}
          existingCheckIn={editingCheckIn}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingCheckIn(null); }}
        />
      )}

      {/* Check-in list */}
      {!showForm && (
        <>
          {/* AI Insights for managers */}
          {isManager && checkIns.length > 0 && (
            <AIInsightsPanel checkIns={checkIns} employeeName={filterEmployee === "all" ? "your team" : displayedName} />
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
          ) : checkIns.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No check-ins yet</p>
              {!isManager && (
                <Button onClick={() => setShowForm(true)} className="mt-4 bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
                  <Plus className="w-4 h-4" /> Submit First Check-In
                </Button>
              )}
              {isManager && <p className="text-sm text-gray-400 mt-1">Direct reports haven't submitted any check-ins yet.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {checkIns.map(ci => (
                <SubmissionCard
                  key={ci.id}
                  checkIn={ci}
                  isManager={isManager}
                  user={user}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}