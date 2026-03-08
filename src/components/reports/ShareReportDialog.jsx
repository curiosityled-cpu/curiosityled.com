import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Users, Trash2, Eye, Edit, Share2, X } from "lucide-react";

export default function ShareReportDialog({ report, open, onOpenChange, onSuccess }) {
  const { user } = useAuth();
  const [userEmail, setUserEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('view');
  const [isTeamShared, setIsTeamShared] = useState(report?.is_team_shared || false);
  const [teamPermissionLevel, setTeamPermissionLevel] = useState(report?.team_permission_level || 'view');
  const [sharedWith, setSharedWith] = useState(report?.shared_with || []);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open && report) {
      setSharedWith(report.shared_with || []);
      setIsTeamShared(report.is_team_shared || false);
      setTeamPermissionLevel(report.team_permission_level || 'view');
      loadUsers();
    }
  }, [open, report]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const result = await base44.functions.invoke('listAllUsers');
      setAllUsers(result.data?.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = () => {
    if (!userEmail.trim()) {
      toast.error('Please enter a user email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (userEmail.toLowerCase() === report.created_by_email.toLowerCase()) {
      toast.error('Cannot share with report owner');
      return;
    }

    const alreadyShared = sharedWith.some(s => s.user_email.toLowerCase() === userEmail.toLowerCase());
    if (alreadyShared) {
      toast.error('This user already has access to this report');
      return;
    }

    const newShare = {
      user_email: userEmail.toLowerCase().trim(),
      permission_level: permissionLevel,
      shared_by: user.email,
      shared_date: new Date().toISOString()
    };

    setSharedWith([...sharedWith, newShare]);
    setUserEmail('');
    setPermissionLevel('view');
  };

  const handleRemoveUser = (email) => {
    setSharedWith(sharedWith.filter(s => s.user_email !== email));
  };

  const handleUpdatePermission = (email, newPermission) => {
    setSharedWith(sharedWith.map(s => 
      s.user_email === email 
        ? { ...s, permission_level: newPermission }
        : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.ScheduledReport.update(report.id, {
        shared_with: sharedWith,
        is_team_shared: isTeamShared,
        team_permission_level: isTeamShared ? teamPermissionLevel : null
      });

      toast.success('Sharing settings updated successfully');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating sharing settings:', error);
      toast.error('Failed to update sharing settings');
    } finally {
      setSaving(false);
    }
  };

  if (!report) return null;

  const getUserName = (email) => {
    const foundUser = allUsers.find(u => u.email === email);
    return foundUser?.full_name || email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Share Report: {report.report_name}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Control who can access this report and what they can do with it
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Team Sharing */}
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="flex items-start gap-3">
              <Checkbox
                id="team-share"
                checked={isTeamShared}
                onCheckedChange={setIsTeamShared}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="team-share" className="cursor-pointer font-semibold">
                  Share with entire team/organization
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  All users in your organization will have access to this report
                </p>
                {isTeamShared && (
                  <div className="mt-3">
                    <Label className="text-xs">Team Permission Level</Label>
                    <Select value={teamPermissionLevel} onValueChange={setTeamPermissionLevel}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            View Only
                          </div>
                        </SelectItem>
                        <SelectItem value="edit">
                          <div className="flex items-center gap-2">
                            <Edit className="w-3 h-3" />
                            Can Edit
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Individual User Sharing */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Share with specific users</Label>
            
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter user email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUser();
                    }
                  }}
                />
              </div>
              <Select value={permissionLevel} onValueChange={setPermissionLevel}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">Can Edit</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddUser} type="button">
                Add
              </Button>
            </div>

            {/* Shared Users List */}
            {sharedWith.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {sharedWith.map((share, index) => (
                  <div key={index} className="p-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{getUserName(share.user_email)}</p>
                      <p className="text-xs text-gray-500">{share.user_email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={share.permission_level}
                        onValueChange={(value) => handleUpdatePermission(share.user_email, value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="flex items-center gap-2">
                              <Eye className="w-3 h-3" />
                              View Only
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="flex items-center gap-2">
                              <Edit className="w-3 h-3" />
                              Can Edit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveUser(share.user_email)}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No users added yet</p>
              </div>
            )}
          </div>

          {/* Permission Explanations */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-900">Permission Levels:</p>
            <div className="space-y-1 text-gray-700">
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 mt-0.5 text-blue-600" />
                <div>
                  <strong>View Only:</strong> Can view report details, generate on-demand, and download
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Edit className="w-4 h-4 mt-0.5 text-green-600" />
                <div>
                  <strong>Can Edit:</strong> Can modify settings, pause/activate, clone, and perform all view actions
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Note: Only the report owner can delete reports or change sharing settings
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}