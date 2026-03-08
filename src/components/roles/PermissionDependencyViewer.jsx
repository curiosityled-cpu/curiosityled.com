import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ChevronRight, Shield } from "lucide-react";

// Define permission dependencies and inheritance rules
const PERMISSION_DEPENDENCIES = {
  'users.edit': {
    requires: ['users.view'],
    description: 'To edit users, you must be able to view them first'
  },
  'users.delete': {
    requires: ['users.view', 'users.edit'],
    description: 'Deleting users requires view and edit permissions'
  },
  'analytics.export': {
    requires: ['analytics.view_client', 'analytics.view_team'],
    anyOf: true,
    description: 'Export requires at least one analytics view permission'
  },
  'content.edit': {
    requires: ['content.view'],
    description: 'Editing content requires view access'
  },
  'content.delete': {
    requires: ['content.view', 'content.edit'],
    description: 'Deleting content requires view and edit permissions'
  },
  'content.publish': {
    requires: ['content.view', 'content.edit'],
    description: 'Publishing content requires view and edit permissions'
  },
  'programs.edit': {
    requires: ['programs.view'],
    description: 'Editing programs requires view access'
  },
  'programs.delete': {
    requires: ['programs.view', 'programs.edit'],
    description: 'Deleting programs requires view and edit permissions'
  },
  'programs.manage_participants': {
    requires: ['programs.view'],
    description: 'Managing participants requires program view access'
  },
  'assessments.deploy': {
    requires: ['assessments.view'],
    description: 'Deploying assessments requires view access'
  },
  'assessments.view_results': {
    requires: ['assessments.view'],
    description: 'Viewing results requires assessment view access'
  },
  'learning.assign': {
    requires: ['learning.view'],
    description: 'Assigning learning requires view access'
  },
  'learning.track_progress': {
    requires: ['learning.view'],
    description: 'Tracking progress requires learning view access'
  },
  'goals.create': {
    requires: ['goals.view'],
    description: 'Creating goals requires view access'
  },
  'goals.assign': {
    requires: ['goals.view'],
    description: 'Assigning goals requires view access'
  },
  'goals.cascade': {
    requires: ['goals.view', 'goals.assign'],
    description: 'Cascading goals requires view and assign permissions'
  },
  'settings.edit': {
    requires: ['settings.view'],
    description: 'Editing settings requires view access'
  },
  'settings.branding': {
    requires: ['settings.view', 'settings.edit'],
    description: 'Configuring branding requires view and edit permissions'
  },
  'billing.manage': {
    requires: ['billing.view'],
    description: 'Managing billing requires view access'
  },
  'roles.assign': {
    requires: ['roles.view'],
    description: 'Assigning roles requires view access'
  }
};

// Role hierarchy (inherits permissions from parent roles)
const ROLE_HIERARCHY = {
  'Platform Admin': {
    inheritsFrom: [],
    grants: ['*'], // All permissions
    description: 'Full platform access - inherits nothing, grants everything'
  },
  'Super Administrator': {
    inheritsFrom: ['Admin Level 2'],
    description: 'Organization admin - inherits all Admin Level 2 permissions'
  },
  'Admin Level 2': {
    inheritsFrom: ['Admin Level 1'],
    description: 'HR Admin - inherits all Program Manager permissions'
  },
  'Admin Level 1': {
    inheritsFrom: ['User Level 3'],
    description: 'Program Manager - inherits all Senior Leader permissions'
  },
  'User Level 3': {
    inheritsFrom: ['User Level 2'],
    description: 'Senior Leader - inherits all Manager permissions'
  },
  'User Level 2': {
    inheritsFrom: ['User Level 1'],
    description: 'Manager - inherits all User permissions'
  },
  'User Level 1': {
    inheritsFrom: [],
    description: 'Base user role - no inheritance'
  }
};

export default function PermissionDependencyViewer({ selectedPermissions = [], allPermissions = [] }) {
  // Get all dependencies for selected permissions
  const getDependencies = () => {
    const deps = [];
    selectedPermissions.forEach(permKey => {
      if (PERMISSION_DEPENDENCIES[permKey]) {
        const dep = PERMISSION_DEPENDENCIES[permKey];
        const missingDeps = dep.requires.filter(req => !selectedPermissions.includes(req));
        
        if (missingDeps.length > 0) {
          deps.push({
            permission: permKey,
            missing: missingDeps,
            anyOf: dep.anyOf,
            description: dep.description
          });
        }
      }
    });
    return deps;
  };

  // Get implicit permissions (dependencies that should be auto-added)
  const getImplicitPermissions = () => {
    const implicit = new Set();
    selectedPermissions.forEach(permKey => {
      if (PERMISSION_DEPENDENCIES[permKey]) {
        const dep = PERMISSION_DEPENDENCIES[permKey];
        if (!dep.anyOf) {
          dep.requires.forEach(req => {
            if (!selectedPermissions.includes(req)) {
              implicit.add(req);
            }
          });
        }
      }
    });
    return Array.from(implicit);
  };

  const dependencies = getDependencies();
  const implicitPerms = getImplicitPermissions();

  return (
    <div className="space-y-4">
      {/* Permission Hierarchy Info */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Role Hierarchy & Inheritance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(ROLE_HIERARCHY).map(([roleName, info]) => (
            <div key={roleName} className="flex items-start gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-[200px]">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{roleName}</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                {info.inheritsFrom.length > 0 ? (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      Inherits from: <strong>{info.inheritsFrom.join(', ')}</strong>
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500 italic">{info.description}</span>
                )}
              </div>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Higher roles automatically inherit all permissions from lower roles in the hierarchy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Missing Dependencies Warning */}
      {dependencies.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertDescription className="text-orange-900">
            <strong className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" />
              Missing Required Permissions
            </strong>
            <div className="space-y-2">
              {dependencies.map((dep, idx) => {
                const perm = allPermissions.find(p => p.permission_key === dep.permission);
                return (
                  <div key={idx} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {perm?.name || dep.permission}
                      </Badge>
                      <span className="text-xs text-orange-700">
                        {dep.anyOf ? 'requires at least one of:' : 'requires:'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-4">
                      {dep.missing.map(missingKey => {
                        const missingPerm = allPermissions.find(p => p.permission_key === missingKey);
                        return (
                          <Badge key={missingKey} className="bg-orange-100 text-orange-800 text-xs">
                            {missingPerm?.name || missingKey}
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-xs text-orange-600 ml-4 mt-1">{dep.description}</p>
                  </div>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-Added Permissions */}
      {implicitPerms.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-900">
            <strong className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" />
              Suggested Permissions (Auto-Added)
            </strong>
            <p className="text-xs mb-2">
              The following permissions will be automatically added because they're required by your selections:
            </p>
            <div className="flex flex-wrap gap-1">
              {implicitPerms.map(permKey => {
                const perm = allPermissions.find(p => p.permission_key === permKey);
                return (
                  <Badge key={permKey} className="bg-green-100 text-green-800 text-xs">
                    {perm?.name || permKey}
                  </Badge>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Categories Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Permission Categories Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['users', 'analytics', 'content', 'programs', 'assessments', 'learning', 'goals', 'settings', 'billing', 'roles'].map(category => {
              const categoryPerms = allPermissions.filter(p => p.category === category);
              const selectedCount = categoryPerms.filter(p => selectedPermissions.includes(p.permission_key)).length;
              const percentage = categoryPerms.length > 0 ? (selectedCount / categoryPerms.length) * 100 : 0;
              
              return (
                <div key={category} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{category}</span>
                    <span className="text-xs text-gray-600">{selectedCount}/{categoryPerms.length}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* No Selections */}
      {selectedPermissions.length === 0 && (
        <Alert>
          <AlertDescription className="text-gray-700">
            <Info className="w-4 h-4 inline mr-2" />
            Select permissions to see their dependencies and inheritance rules
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}