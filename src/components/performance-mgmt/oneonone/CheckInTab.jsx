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
  Sparkles, ChevronDown, ChevronUp, Plus, Eye, EyeOff, Flag, TrendingUp, Lightbulb
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
  reviewed_together: false,
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

// The check-in submission form (employee or manager submitting)
function CheckInForm({ user, isManager, targetEmail, targetName, onSaved, weekOf }) {
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    loadCheckIn();
  }, [targetEmail, weekOf]);

  const loadCheckIn = async () => {
    setLoading(true);
    try {
      const results = await base44.entities.WeeklyCheckIn.filter({
        employee_email: targetEmail,
        week_of: weekOf,
      });
      if (results.length > 0) {
        const r = results[0];
        setExisting(r);
        setForm({
          accomplishments: r.accomplishments || "",
          next_priority: r.next_priority || "",
          energy_level: r.energy_level || 3,
          help_needed: r.help_needed || "",
          feedback_to_give: r.feedback_to_give || "",
          reviewed_together: r.reviewed_together || false,
        });
      } else {
        setExisting(null);
        setForm({ ...EMPTY_FORM });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const managerEmail = isManager ? user.email : (user.manager_email || "");
      const payload = {
        client_id: user.client_id,
        employee_email: targetEmail,
        manager_email: managerEmail,
        week_of: weekOf,
        ...form,
        ...(isManager ? { manager_reviewed: true } : {}),
      };
      if (existing) {
        await base44.entities.WeeklyCheckIn.update(existing.id, payload);
        setExisting(prev => ({ ...prev, ...payload }));
      } else {
        const created = await base44.entities.WeeklyCheckIn.create(payload);
        setExisting(created);
      }
      toast.success(existing ? "Check-in updated" : "Check-in submitted!");
      onSaved?.();
    } catch {
      toast.error("Failed to save check-in");
    } finally {
      setSaving(false);
    }
  };

  const set = field => e => setForm(p => ({ ...p, [field]: typeof e === "object" ? e.target.value : e }));
  const readOnly = isManager; // Manager views employee's submission, can only add response

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" /></div>;

  return (
    <div className="space-y-3">
      {existing && (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-50 text-green-700 border-green-200 border gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" /> Submitted {format(new Date(existing.created_date || existing.week_of), "MMM d")}
          </Badge>
          {existing.manager_reviewed && (
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 border text-xs">Manager Reviewed</Badge>
          )}
        </div>
      )}

      {isManager && !existing && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {targetName} hasn't submitted a check-in for this week yet.
        </p>
      )}

      <div className="space-y-3">
        {[
          { key: "accomplishments", label: isManager ? `What did ${targetName} accomplish this week?` : "What's on your mind? What did you accomplish?", icon: CheckCircle2, color: "#22c55e", placeholder: "Wins, progress, highlights..." },
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
              <Textarea
                rows={2}
                placeholder={placeholder}
                value={form[key]}
                onChange={set(key)}
                disabled={readOnly}
                className="text-sm resize-none border-gray-200"
              />
            </CardContent>
          </Card>
        ))}

        {/* Energy */}
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
            <EnergyPicker value={form.energy_level} onChange={v => setForm(p => ({ ...p, energy_level: v }))} readOnly={readOnly} />
          </CardContent>
        </Card>

        {/* Manager-only private response */}
        {isManager && existing && (
          <div className="space-y-2 pt-1 border-t border-dashed border-gray-200">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Your private response</p>
            <Card className="border border-purple-100 bg-purple-50/30 rounded-xl">
              <CardContent className="p-3 space-y-2">
                <span className="text-sm font-medium text-gray-700">Manager notes / feedback</span>
                <Textarea
                  rows={2}
                  placeholder="Recognition, coaching, action items to discuss..."
                  value={form.feedback_to_give}
                  onChange={set("feedback_to_give")}
                  className="text-sm resize-none border-gray-200 bg-white"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reviewed together */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.reviewed_together}
            onChange={e => setForm(p => ({ ...p, reviewed_together: e.target.checked }))}
            className="w-4 h-4 accent-[#0202ff]"
          />
          <span className="text-sm text-gray-600">We reviewed this check-in together ☐</span>
        </label>
      </div>

      {(!isManager || existing) && (
        <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isManager ? "Save Manager Response" : existing ? "Update Check-In" : "Submit Check-In"}
        </Button>
      )}
    </div>
  );
}

// AI summary card for a set of check-ins
function AIInsightsPanel({ checkIns, employeeName }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const generateInsights = async () => {
    if (checkIns.length === 0) return;
    setLoading(true);
    try {
      const summary = checkIns.slice(0, 8).map(c => ({
        week: c.week_of,
        energy: c.energy_level,
        accomplishments: c.accomplishments,
        blockers: c.help_needed,
        priority: c.next_priority,
        feedback: c.feedback_to_give,
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an executive coach analyzing weekly check-ins for ${employeeName || "a team member"}.\n\nCheck-in data (last ${summary.length} weeks):\n${JSON.stringify(summary, null, 2)}\n\nProvide a concise analysis with:\n1. SUMMARY (2 sentences)\n2. FLAGS (bullet list of risks, repeated blockers, energy drops, burnout signals)\n3. OPPORTUNITIES (bullet list: strengths, growth areas, recognition moments)\n4. RECOMMENDATIONS (2-3 action items for the manager)\n\nBe specific, direct, and actionable. Use plain text bullet points.`,
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
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-[#0202ff] text-[#0202ff] hover:bg-blue-50"
            onClick={insights ? () => setExpanded(!expanded) : generateInsights}
            disabled={loading || checkIns.length === 0}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {insights ? (expanded ? "Collapse" : "Show Insights") : "Generate Insights"}
          </Button>
        </div>

        {checkIns.length === 0 && (
          <p className="text-xs text-gray-400">No check-ins available yet. Insights will appear once submissions are made.</p>
        )}

        {expanded && insights && (
          <div className="space-y-3 text-sm">
            <div className="bg-white/70 rounded-lg p-3">
              <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Summary</p>
              <p className="text-gray-600 text-xs leading-relaxed">{insights.summary}</p>
            </div>

            {insights.flags?.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="font-semibold text-red-700 mb-1 flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> Flags & Risks</p>
                <ul className="space-y-1">
                  {insights.flags.map((f, i) => <li key={i} className="text-xs text-red-700">• {f}</li>)}
                </ul>
              </div>
            )}

            {insights.opportunities?.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="font-semibold text-green-700 mb-1 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Opportunities</p>
                <ul className="space-y-1">
                  {insights.opportunities.map((o, i) => <li key={i} className="text-xs text-green-700">• {o}</li>)}
                </ul>
              </div>
            )}

            {insights.recommendations?.length > 0 && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="font-semibold text-purple-700 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Recommendations</p>
                <ul className="space-y-1">
                  {insights.recommendations.map((r, i) => <li key={i} className="text-xs text-purple-700">• {r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Submission history card
function SubmissionCard({ checkIn, isManager, user }) {
  const [expanded, setExpanded] = useState(false);
  const energyColor = ENERGY_COLORS[checkIn.energy_level] || "#6b7280";

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-4">
        <button className="w-full flex items-center justify-between text-left" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${energyColor}20`, color: energyColor }}>
              {checkIn.energy_level}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Week of {format(new Date(checkIn.week_of + "T00:00:00"), "MMMM d, yyyy")}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{checkIn.accomplishments?.substring(0, 60) || "—"}{checkIn.accomplishments?.length > 60 ? "..." : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {checkIn.manager_reviewed && <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200 border">Reviewed</Badge>}
            {checkIn.reviewed_together && <Badge className="text-xs bg-green-50 text-green-700 border-green-200 border">Discussed</Badge>}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main CheckInTab export
export default function CheckInTab({ user, isManager, teamMembers = [] }) {
  const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const [view, setView] = useState("form"); // "form" | "history"
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [historyCheckIns, setHistoryCheckIns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // For employees: themselves. For managers: pick a team member.
  const targetEmail = isManager ? selectedEmployee : user.email;
  const targetMember = isManager ? teamMembers.find(m => m.email === selectedEmployee) : null;
  const targetName = isManager ? (targetMember?.full_name || selectedEmployee) : (user.full_name || user.email);

  useEffect(() => {
    if (view === "history") loadHistory();
  }, [view, selectedEmployee]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const filter = isManager && selectedEmployee
        ? { employee_email: selectedEmployee, manager_email: user.email }
        : !isManager
        ? { employee_email: user.email }
        : { manager_email: user.email };
      const data = await base44.entities.WeeklyCheckIn.filter(filter, "-week_of", 20);
      setHistoryCheckIns(data);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Check-In</h3>
          <p className="text-xs text-gray-500">Private between you and your direct manager</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {["form", "history"].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                backgroundColor: view === v ? "white" : "transparent",
                color: view === v ? "#0202ff" : "#6b7280",
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {v === "form" ? "This Week" : "History & Insights"}
            </button>
          ))}
        </div>
      </div>

      {/* Manager team member selector */}
      {isManager && (
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select team member..." />
          </SelectTrigger>
          <SelectContent>
            {teamMembers.map(m => (
              <SelectItem key={m.email} value={m.email}>{m.full_name || m.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* This Week form view */}
      {view === "form" && (
        <div className="max-w-2xl">
          {(!isManager || targetEmail) ? (
            <CheckInForm
              key={`${targetEmail}-${refreshKey}`}
              user={user}
              isManager={isManager}
              targetEmail={targetEmail}
              targetName={targetName}
              weekOf={weekOf}
              onSaved={() => setRefreshKey(k => k + 1)}
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Select a team member to view or respond to their check-in.</p>
          )}
        </div>
      )}

      {/* History + AI insights view */}
      {view === "history" && (
        <div className="space-y-4">
          {(!isManager || targetEmail) ? (
            <>
              <AIInsightsPanel checkIns={historyCheckIns} employeeName={targetName} />

              {historyLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
              ) : historyCheckIns.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No check-ins submitted yet.</div>
              ) : (
                <div className="space-y-3">
                  {historyCheckIns.map(ci => (
                    <SubmissionCard key={ci.id} checkIn={ci} isManager={isManager} user={user} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Select a team member to view their check-in history and insights.</p>
          )}
        </div>
      )}
    </div>
  );
}