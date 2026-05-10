import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Zap, AlertCircle, HelpCircle, Target, MessageSquare } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { toast } from "sonner";

const ENERGY_LABELS = { 1: "Exhausted", 2: "Low", 3: "Okay", 4: "Good", 5: "Energised" };
const ENERGY_COLORS = { 1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#22c55e", 5: "#0202ff" };

function EnergyPicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all"
          style={{
            borderColor: value === n ? ENERGY_COLORS[n] : "#e5e7eb",
            backgroundColor: value === n ? `${ENERGY_COLORS[n]}15` : "white",
            color: value === n ? ENERGY_COLORS[n] : "#6b7280"
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function WeeklyCheckInForm({ user, isManager, teamMembers = [] }) {
  const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [selectedEmployee, setSelectedEmployee] = useState(isManager ? "" : user.email);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accomplishments: "", blockers: "", help_needed: "",
    energy_level: 3, next_priority: "",
    feedback_to_give: "", concerns: ""
  });

  useEffect(() => {
    if (!isManager) loadCheckIn(user.email);
  }, []);

  useEffect(() => {
    if (isManager && selectedEmployee) loadCheckIn(selectedEmployee);
  }, [selectedEmployee]);

  const loadCheckIn = async (empEmail) => {
    setLoading(true);
    try {
      const results = await base44.entities.WeeklyCheckIn.filter({
        employee_email: empEmail,
        week_of: weekOf
      });
      if (results.length > 0) {
        setExisting(results[0]);
        const r = results[0];
        setForm({
          accomplishments: r.accomplishments || "",
          blockers: r.blockers || "",
          help_needed: r.help_needed || "",
          energy_level: r.energy_level || 3,
          next_priority: r.next_priority || "",
          feedback_to_give: r.feedback_to_give || "",
          concerns: r.concerns || ""
        });
      } else {
        setExisting(null);
        setForm({ accomplishments: "", blockers: "", help_needed: "", energy_level: 3, next_priority: "", feedback_to_give: "", concerns: "" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const managerEmail = isManager ? user.email : (user.manager_email || user.email);
      const empEmail = isManager ? selectedEmployee : user.email;
      const payload = {
        client_id: user.client_id,
        employee_email: empEmail,
        manager_email: managerEmail,
        week_of: weekOf,
        ...form,
        ...(isManager ? { manager_reviewed: true } : {})
      };
      if (existing) {
        await base44.entities.WeeklyCheckIn.update(existing.id, payload);
        setExisting(prev => ({ ...prev, ...payload }));
      } else {
        const created = await base44.entities.WeeklyCheckIn.create(payload);
        setExisting(created);
      }
      toast.success(existing ? "Check-in updated" : "Check-in submitted!");
    } catch {
      toast.error("Failed to save check-in");
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: typeof e === "object" ? e.target.value : e }));

  const employeeFields = [
    { key: "accomplishments", label: "What did you accomplish this week?", icon: CheckCircle2, color: "#22c55e", placeholder: "Key wins, shipped work, progress made..." },
    { key: "blockers", label: "What's blocking you?", icon: AlertCircle, color: "#ef4444", placeholder: "Obstacles, dependencies, friction..." },
    { key: "help_needed", label: "What help do you need?", icon: HelpCircle, color: "#f97316", placeholder: "Resources, decisions, unblocking..." },
    { key: "next_priority", label: "Top priority next week", icon: Target, color: "#0202ff", placeholder: "Most important thing to move forward..." },
  ];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Weekly Check-In</h3>
          <p className="text-xs text-gray-500">Week of {format(new Date(weekOf + "T00:00:00"), "MMMM d, yyyy")}</p>
        </div>
        {existing && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Submitted
          </Badge>
        )}
      </div>

      {isManager && (
        <div>
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
        </div>
      )}

      {(!isManager || selectedEmployee) && (
        <>
          {/* Employee fields — editable by employee; read-only for manager */}
          <div className="space-y-3">
            {employeeFields.map(({ key, label, icon: Icon, color, placeholder }) => (
              <Card key={key} className="border border-gray-100 shadow-sm rounded-xl">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={set(key)}
                    disabled={isManager}
                    className="text-sm resize-none border-gray-200"
                  />
                </CardContent>
              </Card>
            ))}

            {/* Energy level */}
            <Card className="border border-gray-100 shadow-sm rounded-xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">Energy level this week</span>
                  </div>
                  {form.energy_level && (
                    <span className="text-xs font-medium" style={{ color: ENERGY_COLORS[form.energy_level] }}>
                      {ENERGY_LABELS[form.energy_level]}
                    </span>
                  )}
                </div>
                {isManager ? (
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className="flex-1 py-2 rounded-lg border-2 text-sm font-medium text-center"
                        style={{ borderColor: form.energy_level === n ? ENERGY_COLORS[n] : "#e5e7eb", backgroundColor: form.energy_level === n ? `${ENERGY_COLORS[n]}15` : "white", color: form.energy_level === n ? ENERGY_COLORS[n] : "#6b7280" }}>
                        {n}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EnergyPicker value={form.energy_level} onChange={v => setForm(p => ({ ...p, energy_level: v }))} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manager fields */}
          {isManager && (
            <div className="space-y-3 pt-2 border-t border-dashed border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your response (private)</p>
              {[
                { key: "feedback_to_give", label: "Feedback to share", icon: MessageSquare, color: "#8b5cf6", placeholder: "Recognition, coaching, suggestions..." },
                { key: "concerns", label: "Concerns or follow-ups", icon: AlertCircle, color: "#f97316", placeholder: "Things to monitor or address..." },
              ].map(({ key, label, icon: Icon, color, placeholder }) => (
                <Card key={key} className="border border-gray-100 shadow-sm rounded-xl">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color }} />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    <Textarea rows={2} placeholder={placeholder} value={form[key]} onChange={set(key)} className="text-sm resize-none border-gray-200" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {existing ? (isManager ? "Save Response" : "Update Check-In") : "Submit Check-In"}
          </Button>
        </>
      )}
    </div>
  );
}