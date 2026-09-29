import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Users, User, Loader2, Send, Calendar } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

const ADMIN_ROLES = ["Admin Level 1", "Admin Level 2", "Super Administrator", "Partner Business Administrator", "Platform Admin"];

export default function AssignConversationalModuleModal({ open, onClose, onSuccess, moduleData }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");

  const appRole = user?.app_role || user?.data?.app_role || user?.role;
  const isAdmin = ADMIN_ROLES.includes(appRole);
  const subordinates = user?.data?.subordinate_emails || [];

  useEffect(() => {
    if (open) {
      loadData();
      setSelectedUsers([]);
      setSearchTerm("");
      setDueDate("");
      setPriority("medium");
      setNotes("");
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Admins see all users in their org
        const allUsers = await base44.entities.User.list("email", 500);
        setUsers(allUsers || []);
      } else {
        // Leaders see their subordinates
        if (subordinates.length > 0) {
          const subUsers = await base44.entities.User.filter({ email: { $in: subordinates } }, "email", 500);
          setUsers(subUsers || []);
        } else {
          setUsers([]);
        }
      }
    } catch (e) {
      console.error("Error loading users:", e);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(u =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const toggleUser = (email) => {
    if (selectedUsers.includes(email)) {
      setSelectedUsers(selectedUsers.filter(e => e !== email));
    } else {
      setSelectedUsers([...selectedUsers, email]);
    }
  };

  const selectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.email));
    }
  };

  const handleAssign = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }
    setAssigning(true);
    try {
      const clientId = user?.data?.client_id;
      const records = selectedUsers.map(email => ({
        user_email: email,
        assigned_by: user.email,
        client_id: clientId,
        conversational_learning_module_id: moduleData.id,
        title: moduleData.title,
        description: moduleData.description || "",
        priority,
        due_date: dueDate || undefined,
        status: "assigned",
        notes: notes || undefined,
        metadata: { module_type: "conversational_learning" }
      }));

      await base44.entities.AssignedLearning.bulkCreate(records);
      toast.success(`Assigned "${moduleData.title}" to ${selectedUsers.length} ${selectedUsers.length === 1 ? "person" : "people"}`);
      onSuccess?.();
      onClose();
    } catch (e) {
      console.error("Assignment error:", e);
      toast.error("Failed to assign module");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0202ff]" />
            Assign "{moduleData?.title}" 
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* User selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                Select Recipients {!isAdmin && subordinates.length > 0 && "(Your Team)"}
              </Label>
              {filteredUsers.length > 0 && (
                <button
                  onClick={selectAll}
                  className="text-xs text-[#0202ff] hover:underline font-medium"
                >
                  {selectedUsers.length === filteredUsers.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {!isAdmin && subordinates.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-500 border rounded-lg">
                <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                No team members found. You need direct reports to assign learning.
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
              </div>
            ) : filteredUsers.length > 0 ? (
              <>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-1">
                    {filteredUsers.map(u => (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(u.email) ? "bg-[#0202ff]/5" : "hover:bg-gray-50"}`}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(u.email)}
                          onCheckedChange={() => toggleUser(u.email)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 block truncate">
                            {u.full_name || u.email}
                          </span>
                          <span className="text-xs text-gray-500 truncate">{u.email}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                {selectedUsers.length > 0 && (
                  <Badge className="mt-2 bg-[#0202ff]/10 text-[#0202ff] border-[#0202ff]/20">
                    {selectedUsers.length} selected
                  </Badge>
                )}
              </>
            ) : null}
          </div>

          {/* Assignment options */}
          {filteredUsers.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Due Date (optional)</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          )}

          {filteredUsers.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context or instructions for the learner..."
                rows={2}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={assigning || selectedUsers.length === 0}
            className="bg-[#0202ff] hover:bg-[#0202ff]/90"
          >
            {assigning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Assign to {selectedUsers.length} {selectedUsers.length === 1 ? "person" : "people"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}