import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Plus, Search } from "lucide-react";

const ROLE_COLORS = [
  '#0202ff', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
];

export default function CreateRoleModal({ open, onOpenChange, editingRole, roleFormData, setRoleFormData, selectedPermissions, groupedPermissions, onTogglePermission, onSave }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [permSearch, setPermSearch] = useState('');

  const categories = Object.keys(groupedPermissions);
  const currentCategory = activeCategory || categories[0];

  const visiblePerms = currentCategory
    ? (groupedPermissions[currentCategory] || []).filter(p =>
        !permSearch || p.name?.toLowerCase().includes(permSearch.toLowerCase()) || p.description?.toLowerCase().includes(permSearch.toLowerCase())
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-lg font-bold text-gray-900">
            {editingRole ? 'Edit Role' : 'Create Custom Role'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Role Name *</Label>
              <Input
                value={roleFormData.role_name}
                onChange={(e) => setRoleFormData({ ...roleFormData, role_name: e.target.value })}
                placeholder="e.g., Content Manager, Analytics Viewer"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</Label>
              <Textarea
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                placeholder="Describe what this role is responsible for..."
                rows={2}
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setRoleFormData({ ...roleFormData, color })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${roleFormData.color === color ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Role Type */}
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Role Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRoleFormData({ ...roleFormData, is_addon: false })}
                className={`p-4 border-2 rounded-xl text-left transition-all ${!roleFormData.is_addon ? 'border-[#0202ff] bg-[#0202ff]/5' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4" style={{ color: !roleFormData.is_addon ? '#0202ff' : '#9ca3af' }} />
                  <span className="text-sm font-semibold text-gray-900">Standalone</span>
                </div>
                <p className="text-xs text-gray-500">Replaces the user's base role permissions</p>
              </button>
              <button
                type="button"
                onClick={() => setRoleFormData({ ...roleFormData, is_addon: true })}
                className={`p-4 border-2 rounded-xl text-left transition-all ${roleFormData.is_addon ? 'border-[#0202ff] bg-[#0202ff]/5' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Plus className="w-4 h-4" style={{ color: roleFormData.is_addon ? '#0202ff' : '#9ca3af' }} />
                  <span className="text-sm font-semibold text-gray-900">Addon</span>
                </div>
                <p className="text-xs text-gray-500">Adds permissions on top of base role</p>
              </button>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Permissions <span className="text-[#0202ff] font-bold">{selectedPermissions.length > 0 ? `(${selectedPermissions.length} selected)` : '*'}</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 h-7 text-xs w-44"
                />
              </div>
            </div>

            <div className="flex gap-3">
              {/* Category sidebar */}
              <div className="w-36 flex-shrink-0 space-y-0.5">
                {categories.map(cat => {
                  const count = (groupedPermissions[cat] || []).filter(p => selectedPermissions.includes(p.permission_key)).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setPermSearch(''); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${currentCategory === cat ? 'bg-[#0202ff] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <span className="capitalize">{cat}</span>
                      {count > 0 && (
                        <span className={`text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold ${currentCategory === cat ? 'bg-white/20 text-white' : 'bg-[#0202ff]/10 text-[#0202ff]'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Permission list */}
              <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {visiblePerms.length > 0 ? visiblePerms.map(permission => (
                    <label
                      key={permission.permission_key}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        id={permission.permission_key}
                        checked={selectedPermissions.includes(permission.permission_key)}
                        onCheckedChange={() => onTogglePermission(permission.permission_key)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                        {permission.description && <p className="text-xs text-gray-400 mt-0.5">{permission.description}</p>}
                      </div>
                    </label>
                  )) : (
                    <div className="px-4 py-8 text-center text-xs text-gray-400">
                      {permSearch ? 'No permissions match your search' : 'No permissions in this category'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} style={{ backgroundColor: '#0202ff' }} className="hover:opacity-90">
            {editingRole ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}