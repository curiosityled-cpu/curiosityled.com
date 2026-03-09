import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AssigneeSelector({ value = [], onChange, goalMembers = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, [goalMembers]);

  const loadUsers = async () => {
    try {
      // Prioritize goal members, then all users
      if (goalMembers.length > 0) {
        const allUsers = await base44.entities.User.list();
        const memberEmails = goalMembers.map(m => m.user_email);
        const goalMemberUsers = allUsers.filter(u => memberEmails.includes(u.email));
        const otherUsers = allUsers.filter(u => !memberEmails.includes(u.email));
        setUsers([...goalMemberUsers, ...otherUsers]);
      } else {
        const allUsers = await base44.entities.User.list();
        setUsers(allUsers);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleToggleUser = (user) => {
    const isSelected = value.some(a => a.user_email === user.email);
    
    if (isSelected) {
      onChange(value.filter(a => a.user_email !== user.email));
    } else {
      onChange([
        ...value,
        {
          user_email: user.email,
          user_name: user.full_name,
          assigned_date: new Date().toISOString()
        }
      ]);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="mb-2">
        <label className="text-sm font-medium">Assignees</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {value.length === 0 ? (
            <span className="text-sm text-gray-400">No assignees</span>
          ) : (
            value.map((assignee, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
              >
                <span>{assignee.user_name}</span>
                <button
                  onClick={() => handleToggleUser({ email: assignee.user_email, full_name: assignee.user_name })}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full"
      >
        {isOpen ? "Close" : "Assign Users"}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No users found
              </div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = value.some(a => a.user_email === user.email);
                const isMember = goalMembers.some(m => m.user_email === user.email);
                
                return (
                  <div
                    key={user.id}
                    onClick={() => handleToggleUser(user)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{user.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {user.email}
                        {isMember && <span className="ml-2 text-blue-600">(Goal Member)</span>}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}