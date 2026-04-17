import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

const DEFAULT_FORM = { full_name: '', email: '', role: 'User Level 1' };

export default function InviteUserModal({ open, onOpenChange, onSuccess, isPlatformAdmin }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }

    setInviting(true);
    try {
      await base44.users.inviteUser(form.email.trim(), form.role, form.full_name.trim());
      toast.success(`Invitation sent to ${form.email}`);
      setForm(DEFAULT_FORM);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite New User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Jane Smith"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">This will be set as the user's name in the platform.</p>
          </div>

          <div>
            <Label>Email Address <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <Label>Platform Role</Label>
            <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="User Level 1">User (User Level 1)</SelectItem>
                <SelectItem value="User Level 2">Team Leader (User Level 2)</SelectItem>
                <SelectItem value="Analyst">Analyst (Read-Only Analytics)</SelectItem>
                <SelectItem value="Admin Level 1">Program Admin (Admin Level 1)</SelectItem>
                <SelectItem value="Admin Level 2">HR Admin (Admin Level 2)</SelectItem>
                <SelectItem value="Partner Business Administrator">Partner Business Administrator</SelectItem>
                {isPlatformAdmin && (
                  <>
                    <SelectItem value="Super Administrator">Super Administrator</SelectItem>
                    <SelectItem value="Platform Admin">Platform Admin</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inviting}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting} className="bg-blue-600 hover:bg-blue-700">
              {inviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}