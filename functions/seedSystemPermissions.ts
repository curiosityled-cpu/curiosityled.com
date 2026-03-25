import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    // Define system permissions
    const systemPermissions = [
      // Users
      { permission_key: 'users.view', name: 'View Users', description: 'View user list and profiles', category: 'users' },
      { permission_key: 'users.create', name: 'Create Users', description: 'Create new user accounts', category: 'users' },
      { permission_key: 'users.edit', name: 'Edit Users', description: 'Modify user information', category: 'users' },
      { permission_key: 'users.delete', name: 'Delete Users', description: 'Delete user accounts', category: 'users' },
      { permission_key: 'users.impersonate', name: 'Impersonate Users', description: 'Log in as another user', category: 'users' },
      
      // Analytics
      { permission_key: 'analytics.view_platform', name: 'View Platform Analytics', description: 'Access platform-wide analytics', category: 'analytics' },
      { permission_key: 'analytics.view_client', name: 'View Client Analytics', description: 'Access client-level analytics', category: 'analytics' },
      { permission_key: 'analytics.view_team', name: 'View Team Analytics', description: 'Access team analytics', category: 'analytics' },
      { permission_key: 'analytics.export', name: 'Export Analytics', description: 'Export analytics data', category: 'analytics' },
      
      // Content
      { permission_key: 'content.view', name: 'View Content', description: 'View learning resources and content', category: 'content' },
      { permission_key: 'content.create', name: 'Create Content', description: 'Create new learning resources', category: 'content' },
      { permission_key: 'content.edit', name: 'Edit Content', description: 'Modify existing content', category: 'content' },
      { permission_key: 'content.delete', name: 'Delete Content', description: 'Remove content from library', category: 'content' },
      { permission_key: 'content.publish', name: 'Publish Content', description: 'Publish content to users', category: 'content' },
      
      // Programs
      { permission_key: 'programs.view', name: 'View Programs', description: 'View learning programs and cohorts', category: 'programs' },
      { permission_key: 'programs.create', name: 'Create Programs', description: 'Create new programs', category: 'programs' },
      { permission_key: 'programs.edit', name: 'Edit Programs', description: 'Modify existing programs', category: 'programs' },
      { permission_key: 'programs.delete', name: 'Delete Programs', description: 'Remove programs', category: 'programs' },
      { permission_key: 'programs.manage_participants', name: 'Manage Participants', description: 'Add/remove program participants', category: 'programs' },
      
      // Assessments
      { permission_key: 'assessments.view', name: 'View Assessments', description: 'View assessment data', category: 'assessments' },
      { permission_key: 'assessments.create', name: 'Create Assessments', description: 'Create custom assessments', category: 'assessments' },
      { permission_key: 'assessments.deploy', name: 'Deploy Assessments', description: 'Assign assessments to users', category: 'assessments' },
      { permission_key: 'assessments.view_results', name: 'View Results', description: 'View assessment results', category: 'assessments' },
      
      // Learning
      { permission_key: 'learning.view', name: 'View Learning', description: 'View learning assignments', category: 'learning' },
      { permission_key: 'learning.assign', name: 'Assign Learning', description: 'Assign learning to users', category: 'learning' },
      { permission_key: 'learning.track_progress', name: 'Track Progress', description: 'Monitor learning progress', category: 'learning' },
      
      // Goals
      { permission_key: 'goals.view', name: 'View Goals', description: 'View user goals', category: 'goals' },
      { permission_key: 'goals.create', name: 'Create Goals', description: 'Create goals for users', category: 'goals' },
      { permission_key: 'goals.assign', name: 'Assign Goals', description: 'Assign goals to team members', category: 'goals' },
      { permission_key: 'goals.cascade', name: 'Cascade Goals', description: 'Cascade goals across organization', category: 'goals' },
      
      // Settings
      { permission_key: 'settings.view', name: 'View Settings', description: 'View system settings', category: 'settings' },
      { permission_key: 'settings.edit', name: 'Edit Settings', description: 'Modify system settings', category: 'settings' },
      { permission_key: 'settings.branding', name: 'Manage Branding', description: 'Customize platform branding', category: 'settings' },
      
      // Billing
      { permission_key: 'billing.view', name: 'View Billing', description: 'View billing information', category: 'billing' },
      { permission_key: 'billing.manage', name: 'Manage Billing', description: 'Manage subscriptions and payments', category: 'billing' },
      
      // Roles
      { permission_key: 'roles.view', name: 'View Roles', description: 'View role definitions', category: 'roles' },
      { permission_key: 'roles.create', name: 'Create Roles', description: 'Create custom roles', category: 'roles' },
      { permission_key: 'roles.edit', name: 'Edit Roles', description: 'Modify role permissions', category: 'roles' },
      { permission_key: 'roles.delete', name: 'Delete Roles', description: 'Remove custom roles', category: 'roles' },
      { permission_key: 'roles.assign', name: 'Assign Roles', description: 'Assign roles to users', category: 'roles' }
    ];

    // Check if permissions already exist
    const existingPermissions = await base44.asServiceRole.entities.Permission.list();
    const existingKeys = new Set(existingPermissions.map(p => p.permission_key));

    // Insert only new permissions
    const newPermissions = systemPermissions.filter(p => !existingKeys.has(p.permission_key));
    
    if (newPermissions.length > 0) {
      await base44.asServiceRole.entities.Permission.bulkCreate(newPermissions.map(p => ({
        ...p,
        is_system: true
      })));
    }

    return Response.json({
      success: true,
      message: `Seeded ${newPermissions.length} new permissions`,
      total: systemPermissions.length
    });

  } catch (error) {
    console.error('Error seeding permissions:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});