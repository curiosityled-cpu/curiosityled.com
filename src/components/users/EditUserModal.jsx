import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditUserModal({ open, onOpenChange, editingUser, setEditingUser, onSave, clients, partners, addonRoles, isPlatformAdmin }) {
  if (!editingUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={editingUser.full_name || ''}
                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Read-only in the platform auth system — for display only</p>
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" defaultValue={editingUser.email} disabled />
            </div>

            <div>
              <Label>Display Name</Label>
              <Input
                value={editingUser.display_name || ''}
                onChange={(e) => setEditingUser({ ...editingUser, display_name: e.target.value })}
                placeholder="Optional display name"
              />
            </div>

            <div>
              <Label>Platform Role</Label>
              <Select value={editingUser.app_role} onValueChange={(value) => setEditingUser({ ...editingUser, app_role: value })}>
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

            <div>
              <Label>Client Organization</Label>
              <Select value={editingUser.client_id || 'none'} onValueChange={(value) => setEditingUser({ ...editingUser, client_id: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Client</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Partner Organization</Label>
              <Select value={editingUser.partner_id || 'none'} onValueChange={(value) => setEditingUser({ ...editingUser, partner_id: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Partner</SelectItem>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Job Title</Label>
              <Input value={editingUser.current_role || ''} onChange={(e) => setEditingUser({ ...editingUser, current_role: e.target.value })} />
            </div>

            <div>
              <Label>Department</Label>
              <Input value={editingUser.department || ''} onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })} />
            </div>

            <div>
              <Label>Industry Sector</Label>
              <Input value={editingUser.sector || ''} onChange={(e) => setEditingUser({ ...editingUser, sector: e.target.value })} />
            </div>

            <div>
              <Label>Manager Email</Label>
              <Input type="email" value={editingUser.manager_email || ''} onChange={(e) => setEditingUser({ ...editingUser, manager_email: e.target.value })} />
            </div>

            <div>
              <Label>Start Date</Label>
              <Input type="date" value={editingUser.start_date || ''} onChange={(e) => setEditingUser({ ...editingUser, start_date: e.target.value })} />
            </div>

            <div>
              <Label>Addon Role</Label>
              <Select value={editingUser.custom_role_id || 'none'} onValueChange={(value) => setEditingUser({ ...editingUser, custom_role_id: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Addon Role</SelectItem>
                  {addonRoles.map(r => <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Adds permissions on top of base role</p>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-purple-50 border-purple-200">
                <Checkbox
                  id="is_uat_tester"
                  checked={editingUser.is_uat_tester || false}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_uat_tester: checked })}
                />
                <div>
                  <Label htmlFor="is_uat_tester" className="font-medium cursor-pointer">UAT Tester</Label>
                  <p className="text-xs text-gray-600 mt-1">Enable UAT testing mode for this user.</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <Label className="font-medium text-yellow-900">Account Status</Label>
                <p className="text-xs text-yellow-800 mt-1 mb-3">Pending users must activate their account before accessing the platform.</p>
                <Select value={editingUser.account_status || 'pending_activation'} onValueChange={(value) => setEditingUser({ ...editingUser, account_status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_activation">Pending Activation</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onSave(editingUser.id, editingUser)} className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}