import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InviteMemberModal({ isOpen, onClose, goal, onMemberAdded }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("editor");

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await base44.entities.User.list();
      const existingMemberEmails = goal?.members?.map(m => m.user_email) || [];
      const availableUsers = allUsers.filter(u => !existingMemberEmails.includes(u.email));
      setUsers(availableUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setIsLoading(false);
  };

  const handleInvite = async () => {
    if (!selectedUser) return;

    const newMember = {
      user_email: selectedUser.email,
      user_name: selectedUser.full_name,
      role: selectedRole,
      added_date: new Date().toISOString()
    };

    const updatedMembers = [...(goal.members || []), newMember];
    
    try {
      await base44.entities.Goal.update(goal.id, { members: updatedMembers });
      
      // Create notification for invited user
      await base44.entities.Notification.create({
        user_email: selectedUser.email,
        type: "goal_assignment",
        title: "Added to Goal",
        message: `You've been added to the goal "${goal.title}" as ${selectedRole}`,
        related_entity_type: "Goal",
        related_entity_id: goal.id,
        priority: "medium"
      });

      onMemberAdded(updatedMembers);
      setSelectedUser(null);
      setSelectedRole("editor");
      onClose();
    } catch (error) {
      console.error("Error inviting member:", error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Invite Team Member</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search User</label>
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="max-h-48 overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No users available to invite
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
                    selectedUser?.id === user.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              ))
            )}
          </div>

          {selectedUser && (
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner - Full control</SelectItem>
                  <SelectItem value="editor">Editor - Can edit and manage</SelectItem>
                  <SelectItem value="viewer">Viewer - View only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!selectedUser}
              className="flex-1 bg-[#0073EA] hover:bg-[#0056B3]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}