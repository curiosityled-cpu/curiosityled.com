import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitBranch, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CascadeGoalDialog({ goal, isOpen, onClose, onSuccess }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cascading, setCascading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedEmails([]);
    loadTeam();
  }, [isOpen]);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      const subordinates = me.subordinate_emails || [];
      if (subordinates.length === 0) { setTeamMembers([]); setLoading(false); return; }
      const res = await base44.functions.invoke("listAllUsers", {});
      const all = res.data?.users || [];
      setTeamMembers(all.filter(u => subordinates.includes(u.email)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (email) =>
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );

  const selectAll = () =>
    setSelectedEmails(selectedEmails.length === teamMembers.length ? [] : teamMembers.map(m => m.email));

  const handleCascade = async () => {
    if (selectedEmails.length === 0) { toast.error("Select at least one team member"); return; }
    setCascading(true);
    try {
      const res = await base44.functions.invoke("cascadeGoals", {
        goal_id: goal.id,
        target_emails: selectedEmails,
      });
      if (res.data?.success) {
        toast.success(`Goal cascaded to ${res.data.successCount} team member${res.data.successCount !== 1 ? "s" : ""}`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.data?.error || "Failed to cascade");
      }
    } catch {
      toast.error("Failed to cascade goal");
    } finally {
      setCascading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#0202ff]" />
            Cascade Goal to Team
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Goal summary */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: goal?.color || "#0202ff" }} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{goal?.title}</p>
                {goal?.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{goal.description}</p>}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Each selected team member will receive a copy of this goal linked back to this parent. 
            Their progress will automatically roll up to update this goal.
          </p>

          {/* Team member list */}
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No direct reports found
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Select team members</p>
                <button onClick={selectAll} className="text-xs text-[#0202ff] hover:underline">
                  {selectedEmails.length === teamMembers.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {teamMembers.map(m => (
                  <label key={m.email} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={selectedEmails.includes(m.email)}
                      onCheckedChange={() => toggle(m.email)}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#0202ff]">{(m.full_name || m.email)[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{m.full_name || m.email}</p>
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedEmails.length > 0 && (
                <p className="text-xs text-gray-500">{selectedEmails.length} of {teamMembers.length} selected</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleCascade}
              disabled={cascading || selectedEmails.length === 0}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5"
            >
              {cascading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              Cascade to {selectedEmails.length > 0 ? selectedEmails.length : ""} Member{selectedEmails.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}