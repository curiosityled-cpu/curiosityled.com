import React from "react";
import { Info, Shield, AlertTriangle, CheckCircle } from "lucide-react";

const PERMISSION_DEPENDENCIES = {
  'users.edit': { requires: ['users.view'], description: 'Editing users requires view access' },
  'users.delete': { requires: ['users.view', 'users.edit'], description: 'Deleting users requires view and edit access' },
  'analytics.export': { requires: ['analytics.view_client', 'analytics.view_team'], anyOf: true, description: 'Export requires at least one analytics view permission' },
  'content.edit': { requires: ['content.view'], description: 'Editing content requires view access' },
  'content.delete': { requires: ['content.view', 'content.edit'], description: 'Deleting content requires view and edit access' },
  'content.publish': { requires: ['content.view', 'content.edit'], description: 'Publishing requires view and edit access' },
  'programs.edit': { requires: ['programs.view'], description: 'Editing programs requires view access' },
  'programs.delete': { requires: ['programs.view', 'programs.edit'], description: 'Deleting programs requires view and edit access' },
  'programs.manage_participants': { requires: ['programs.view'], description: 'Managing participants requires program view access' },
  'assessments.deploy': { requires: ['assessments.view'], description: 'Deploying assessments requires view access' },
  'assessments.view_results': { requires: ['assessments.view'], description: 'Viewing results requires assessment view access' },
  'learning.assign': { requires: ['learning.view'], description: 'Assigning learning requires view access' },
  'learning.track_progress': { requires: ['learning.view'], description: 'Tracking progress requires view access' },
  'goals.create': { requires: ['goals.view'], description: 'Creating goals requires view access' },
  'goals.assign': { requires: ['goals.view'], description: 'Assigning goals requires view access' },
  'goals.cascade': { requires: ['goals.view', 'goals.assign'], description: 'Cascading goals requires view and assign access' },
  'settings.edit': { requires: ['settings.view'], description: 'Editing settings requires view access' },
  'settings.branding': { requires: ['settings.view', 'settings.edit'], description: 'Configuring branding requires view and edit access' },
  'billing.manage': { requires: ['billing.view'], description: 'Managing billing requires view access' },
  'roles.assign': { requires: ['roles.view'], description: 'Assigning roles requires view access' },
};

export default function PermissionDependencyViewer({ selectedPermissions = [], allPermissions = [] }) {
  const dependencies = selectedPermissions
    .filter(k => PERMISSION_DEPENDENCIES[k])
    .map(k => {
      const dep = PERMISSION_DEPENDENCIES[k];
      const missing = dep.requires.filter(r => !selectedPermissions.includes(r));
      return missing.length > 0 ? { permission: k, missing, anyOf: dep.anyOf, description: dep.description } : null;
    })
    .filter(Boolean);

  const categories = ['users', 'analytics', 'content', 'programs', 'assessments', 'learning', 'goals', 'settings', 'billing', 'roles'];

  return (
    <div className="space-y-4">
      {/* Selection Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-[#0202ff]" />
          <p className="text-sm font-semibold text-gray-900">Permission Coverage</p>
        </div>
        <div className="space-y-2">
          {categories.map(cat => {
            const catPerms = allPermissions.filter(p => p.category === cat);
            if (catPerms.length === 0) return null;
            const selected = catPerms.filter(p => selectedPermissions.includes(p.permission_key)).length;
            const pct = Math.round((selected / catPerms.length) * 100);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium capitalize text-gray-600">{cat}</span>
                  <span className="text-xs text-gray-400">{selected}/{catPerms.length}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 0 ? '#0202ff' : 'transparent' }} />
                </div>
              </div>
            );
          })}
        </div>
        {selectedPermissions.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">Select permissions to see coverage</p>
        )}
      </div>

      {/* Dependency warnings */}
      {dependencies.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Missing Dependencies</p>
          </div>
          <div className="space-y-3">
            {dependencies.map((dep, i) => {
              const perm = allPermissions.find(p => p.permission_key === dep.permission);
              return (
                <div key={i} className="text-xs">
                  <p className="font-medium text-amber-800 mb-1">{perm?.name || dep.permission}</p>
                  <p className="text-amber-600 mb-1">{dep.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {dep.missing.map(mk => {
                      const mp = allPermissions.find(p => p.permission_key === mk);
                      return <span key={mk} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">{mp?.name || mk}</span>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All good */}
      {selectedPermissions.length > 0 && dependencies.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 font-medium">All permission dependencies are satisfied</p>
        </div>
      )}

      {/* Role hierarchy info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role Hierarchy</p>
        </div>
        <div className="space-y-1.5 text-xs text-gray-500">
          {[
            { role: 'Platform Admin', desc: 'All permissions' },
            { role: 'Super Administrator', desc: 'Inherits HR Admin' },
            { role: 'HR Admin (L2)', desc: 'Inherits Program Admin' },
            { role: 'Program Admin (L1)', desc: 'Inherits Team Leader' },
            { role: 'Team Leader (L2)', desc: 'Inherits User' },
            { role: 'User (L1)', desc: 'Base access' },
          ].map(({ role, desc }) => (
            <div key={role} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
              <span className="font-medium text-gray-700">{role}</span>
              <span className="text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}