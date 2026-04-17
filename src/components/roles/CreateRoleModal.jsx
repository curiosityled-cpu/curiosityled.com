import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Plus } from "lucide-react";

const ROLE_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#a855f7'
];

export default function CreateRoleModal({ open, onOpenChange, editingRole, roleFormData, setRoleFormData, selectedPermissions, groupedPermissions, onTogglePermission, onSave }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRole ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="role_name">Role Name *</Label>
              <Input
                id="role_name"
                value={roleFormData.role_name}
                onChange={(e) => setRoleFormData({ ...roleFormData, role_name: e.target.value })}
                placeholder="e.g., Content Manager, Analytics Viewer"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                placeholder="Describe what this role is responsible for..."
                rows={3}
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {ROLE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setRoleFormData({ ...roleFormData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${roleFormData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-medium mb-3 block">Role Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRoleFormData({ ...roleFormData, is_addon: false })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${!roleFormData.is_addon ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">Standalone Role</span>
                  </div>
                  <p className="text-xs text-gray-600">Replaces the user's base role permissions when assigned</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFormData({ ...roleFormData, is_addon: true })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${roleFormData.is_addon ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="w-5 h-5 text-indigo-600" />
                    <span className="font-medium">Addon Role</span>
                  </div>
                  <p className="text-xs text-gray-600">Merges with user's base role permissions (additive)</p>
                </button>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-lg font-semibold mb-4 block">Permissions * ({selectedPermissions.length} selected)</Label>
            <Tabs defaultValue={Object.keys(groupedPermissions)[0]}>
              <TabsList className="grid grid-cols-5 w-full">
                {Object.keys(groupedPermissions).slice(0, 5).map(category => (
                  <TabsTrigger key={category} value={category} className="capitalize">{category}</TabsTrigger>
                ))}
              </TabsList>
              {Object.keys(groupedPermissions).slice(0, 5).map(category => (
                <TabsContent key={category} value={category} className="space-y-3 mt-4">
                  {groupedPermissions[category].map(permission => (
                    <div key={permission.permission_key} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                      <Checkbox
                        id={permission.permission_key}
                        checked={selectedPermissions.includes(permission.permission_key)}
                        onCheckedChange={() => onTogglePermission(permission.permission_key)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={permission.permission_key} className="font-medium cursor-pointer">{permission.name}</Label>
                        <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>

            {Object.keys(groupedPermissions).length > 5 && (
              <Tabs defaultValue={Object.keys(groupedPermissions)[5]} className="mt-4">
                <TabsList className="grid grid-cols-5 w-full">
                  {Object.keys(groupedPermissions).slice(5).map(category => (
                    <TabsTrigger key={category} value={category} className="capitalize">{category}</TabsTrigger>
                  ))}
                </TabsList>
                {Object.keys(groupedPermissions).slice(5).map(category => (
                  <TabsContent key={category} value={category} className="space-y-3 mt-4">
                    {groupedPermissions[category].map(permission => (
                      <div key={permission.permission_key} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                        <Checkbox
                          id={permission.permission_key}
                          checked={selectedPermissions.includes(permission.permission_key)}
                          onCheckedChange={() => onTogglePermission(permission.permission_key)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={permission.permission_key} className="font-medium cursor-pointer">{permission.name}</Label>
                          <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSave} className="bg-purple-600 hover:bg-purple-700">
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}