import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Building2, Users, Sparkles, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Auto-populate roster by selecting an org segment (entire org, department, or team).
 * Fetches users in the tenant, groups by department, and auto-assigns roles:
 * - Each user becomes an employee (review participant)
 * - Their manager_email (from UserProfile) becomes the manager reviewer
 * - Peers are same-department colleagues (optional, can be refined)
 */
export default function RosterAutoPopulate({ isOpen, onClose, cycle, user, onPopulated }) {
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [selectedDept, setSelectedDept] = useState("");
  const [preview, setPreview] = useState([]);
  const [includePeers, setIncludePeers] = useState(false);

  const clientId = user.client_id || user.data?.client_id;

  useEffect(() => {
    if (isOpen) loadUsers();
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Fetch tenant users
      const userList = await base44.entities.User.list(500);
      // Fetch user profiles for department/manager info
      let profiles = [];
      try {
        profiles = await base44.entities.UserProfile.filter({ tenant_id: clientId }, "-created_date", 500);
      } catch (e) {
        // Profiles may not exist for all tenants
      }

      // Build a map of email → profile
      const profileMap = {};
      profiles.forEach(p => {
        if (p.email) profileMap[p.email.toLowerCase()] = p;
      });

      // Enrich users with department and manager info
      const enriched = userList
        .filter(u => u.email && u.email !== user.email) // exclude self
        .map(u => {
          const profile = profileMap[u.email.toLowerCase()];
          return {
            email: u.email,
            name: u.full_name || u.email,
            department: profile?.department || u.data?.department || "Unassigned",
            manager_email: profile?.manager_email || u.data?.manager_email || "",
          };
        });

      setUsers(enriched);

      // Extract unique departments
      const depts = [...new Set(enriched.map(u => u.department).filter(Boolean))];
      setDepartments(depts);
    } catch (err) {
      toast.error("Failed to load users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update preview when segment changes
  useEffect(() => {
    if (selectedSegment === "all") {
      setPreview(users);
    } else if (selectedSegment === "department" && selectedDept) {
      setPreview(users.filter(u => u.department === selectedDept));
    } else {
      setPreview([]);
    }
  }, [selectedSegment, selectedDept, users]);

  const handlePopulate = async () => {
    if (preview.length === 0) return;
    setPopulating(true);
    try {
      // Build participants list
      const participants = preview.map(u => {
        // Peers = same department colleagues (excluding self and manager)
        let peerEmails = [];
        if (includePeers) {
          peerEmails = preview
            .filter(p => p.email !== u.email && p.email !== u.manager_email && p.department === u.department)
            .slice(0, 3) // max 3 peers per person
            .map(p => p.email);
        }
        return {
          employee_email: u.email.toLowerCase(),
          employee_name: u.name,
          manager_email: u.manager_email?.toLowerCase() || "",
          peer_emails: peerEmails,
        };
      });

      const res = await base44.functions.invoke("assignReviewParticipants", {
        review_cycle_id: cycle.id,
        participants,
      });

      toast.success(`${res.data.assigned} participants auto-populated`);
      onPopulated?.();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.invalid_emails) {
        toast.error(`Some emails are not tenant users: ${data.invalid_emails.join(", ").slice(0, 100)}`);
      } else {
        toast.error("Auto-populate failed: " + (err.message || "Unknown error"));
      }
    } finally {
      setPopulating(false);
    }
  };

  // Count how many have managers assigned
  const withManagers = preview.filter(u => u.manager_email).length;
  const withoutManagers = preview.length - withManagers;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0202ff]" />
            Auto-Populate Roster
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Select a segment of your organization to automatically create review participants.
              Each person's manager will be auto-assigned from their profile.
            </p>

            {/* Segment selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Select Segment</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedSegment("all")}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    selectedSegment === "all"
                      ? "border-[#0202ff] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Users className="w-4 h-4 text-[#0202ff]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Entire Org</p>
                    <p className="text-[10px] text-gray-500">{users.length} people</p>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedSegment("department")}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    selectedSegment === "department"
                      ? "border-[#0202ff] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#0202ff]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">By Department</p>
                    <p className="text-[10px] text-gray-500">{departments.length} departments</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Department selector */}
            {selectedSegment === "department" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Department</Label>
                <div className="flex flex-wrap gap-1.5">
                  {departments.map(dept => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedDept === dept
                          ? "bg-[#0202ff] text-white"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Peer option */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includePeers}
                onChange={e => setIncludePeers(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#0202ff] focus:ring-[#0202ff]"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Auto-assign peer reviewers</span>
                <p className="text-xs text-gray-400">Same-department colleagues will be assigned as peers (max 3 per person)</p>
              </div>
            </label>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">
                    Preview: {preview.length} participants
                  </span>
                  <div className="flex gap-2 text-[10px]">
                    <Badge variant="outline" className="text-[10px] border-green-200 text-green-700 bg-green-50">
                      {withManagers} with manager
                    </Badge>
                    {withoutManagers > 0 && (
                      <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                        {withoutManagers} no manager
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {preview.slice(0, 20).map((u, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-500">
                        {u.department}
                      </Badge>
                      {u.manager_email ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  {preview.length > 20 && (
                    <p className="text-[10px] text-gray-400 text-center py-1.5">
                      +{preview.length - 20} more...
                    </p>
                  )}
                </div>
              </div>
            )}

            {withoutManagers > 0 && preview.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <p>{withoutManagers} participant(s) have no manager assigned in their profile. You can add managers manually after populating.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handlePopulate}
                disabled={populating || preview.length === 0}
                className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5"
              >
                {populating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Populate {preview.length} Participants
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}