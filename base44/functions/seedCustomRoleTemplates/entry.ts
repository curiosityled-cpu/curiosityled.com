import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'Platform Admin' && user.app_role !== 'Super Administrator') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const roles = [
      // ── System Roles ──────────────────────────────────────────────────────
      {
        role_name: 'User',
        role_key: 'user',
        description: 'Base role for all platform users. Access personal dashboard, learning library, goals, and assessments.',
        color: '#6366f1',
        is_system_role: true,
        is_addon: false,
        is_active: true,
        permissions: ['content.view', 'learning.view', 'goals.view', 'goals.create', 'assessments.view'],
      },
      {
        role_name: 'Team Leader',
        role_key: 'team_leader',
        description: 'Leads a team. All User permissions plus team analytics, goal assignment, and learning tracking.',
        color: '#3b82f6',
        is_system_role: true,
        is_addon: false,
        is_active: true,
        permissions: ['content.view', 'learning.view', 'learning.assign', 'learning.track_progress', 'goals.view', 'goals.create', 'goals.assign', 'assessments.view', 'assessments.view_results', 'analytics.view_team'],
      },
      {
        role_name: 'Analyst',
        role_key: 'analyst',
        description: 'Data and reporting specialist. Organization-wide analytics access and export capabilities.',
        color: '#14b8a6',
        is_system_role: true,
        is_addon: false,
        is_active: true,
        permissions: ['content.view', 'learning.view', 'learning.track_progress', 'goals.view', 'assessments.view', 'assessments.view_results', 'analytics.view_client', 'analytics.view_team', 'analytics.export'],
      },
      {
        role_name: 'Executive',
        role_key: 'executive',
        description: 'Senior leader with strategic oversight. Access to org-wide analytics, goal cascading, and insights.',
        color: '#8b5cf6',
        is_system_role: true,
        is_addon: false,
        is_active: true,
        permissions: ['content.view', 'learning.view', 'learning.track_progress', 'goals.view', 'goals.create', 'goals.cascade', 'assessments.view', 'assessments.view_results', 'analytics.view_client', 'analytics.view_team', 'analytics.export'],
      },
      {
        role_name: 'Program Administrator',
        role_key: 'program_administrator',
        description: 'Manages programs, cohorts, and participants. Create and manage programs with full analytics.',
        color: '#f97316',
        is_system_role: true,
        is_addon: false,
        is_active: true,
        permissions: ['content.view', 'content.create', 'content.edit', 'learning.view', 'learning.assign', 'learning.track_progress', 'goals.view', 'goals.create', 'goals.assign', 'assessments.view', 'assessments.create', 'assessments.deploy', 'assessments.view_results', 'programs.view', 'programs.create', 'programs.edit', 'programs.manage_participants', 'analytics.view_client', 'analytics.view_team', 'analytics.export'],
      },
      {
        role_name: 'HR Administrator',
        role_key: 'hr_administrator',
        description: 'Manages users, roles, and organizational settings. Full HR and people operations access.',
        color: '#ec4899',
        is_system_role: true,
        is_addon: false,
        is_active: true,
        permissions: ['users.view', 'users.create', 'users.edit', 'content.view', 'content.create', 'content.edit', 'content.publish', 'learning.view', 'learning.assign', 'learning.track_progress', 'goals.view', 'goals.create', 'goals.assign', 'goals.cascade', 'assessments.view', 'assessments.create', 'assessments.deploy', 'assessments.view_results', 'programs.view', 'programs.create', 'programs.edit', 'programs.delete', 'programs.manage_participants', 'roles.view', 'roles.assign', 'analytics.view_client', 'analytics.view_team', 'analytics.export', 'settings.view'],
      },
      {
        role_name: 'Super Administrator',
        role_key: 'super_administrator',
        description: 'Full organizational control. All HR Admin permissions plus user deletion, full role management, and org settings.',
        color: '#ef4444',
        is_system_role: true,
        is_addon: false,
        is_active: true,
        permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish', 'learning.view', 'learning.assign', 'learning.track_progress', 'goals.view', 'goals.create', 'goals.assign', 'goals.cascade', 'assessments.view', 'assessments.create', 'assessments.deploy', 'assessments.view_results', 'programs.view', 'programs.create', 'programs.edit', 'programs.delete', 'programs.manage_participants', 'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'analytics.view_client', 'analytics.view_team', 'analytics.export', 'settings.view', 'settings.edit', 'billing.view'],
      },
      {
        role_name: 'Platform Administrator',
        role_key: 'platform_administrator',
        description: 'Full platform control. All permissions including billing, branding, impersonation, and platform-wide analytics.',
        color: '#0202ff',
        is_system_role: true,
        is_addon: false,
        is_active: true,
        permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.impersonate', 'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish', 'learning.view', 'learning.assign', 'learning.track_progress', 'goals.view', 'goals.create', 'goals.assign', 'goals.cascade', 'assessments.view', 'assessments.create', 'assessments.deploy', 'assessments.view_results', 'programs.view', 'programs.create', 'programs.edit', 'programs.delete', 'programs.manage_participants', 'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'analytics.view_platform', 'analytics.view_client', 'analytics.view_team', 'analytics.export', 'settings.view', 'settings.edit', 'settings.branding', 'billing.view', 'billing.manage'],
      },

      // ── Add-on Roles ──────────────────────────────────────────────────────
      {
        role_name: 'User Add-on',
        role_key: 'user_addon',
        description: 'Addon: Grants base user access to content, learning, goals, and personal assessments.',
        color: '#6366f1',
        is_system_role: false,
        is_addon: true,
        is_active: true,
        permissions: ['content.view', 'learning.view', 'goals.view', 'goals.create', 'assessments.view'],
      },
      {
        role_name: 'Team Leader Add-on',
        role_key: 'team_leader_addon',
        description: 'Addon: Grants team leadership capabilities — team analytics, goal assignment, and learning tracking.',
        color: '#3b82f6',
        is_system_role: false,
        is_addon: true,
        is_active: true,
        permissions: ['learning.assign', 'learning.track_progress', 'goals.assign', 'assessments.view_results', 'analytics.view_team'],
      },
      {
        role_name: 'Analyst Add-on',
        role_key: 'analyst_addon',
        description: 'Addon: Grants organization-wide analytics and data export access.',
        color: '#14b8a6',
        is_system_role: false,
        is_addon: true,
        is_active: true,
        permissions: ['analytics.view_client', 'analytics.view_team', 'analytics.export', 'assessments.view_results', 'learning.track_progress'],
      },
      {
        role_name: 'Executive Add-on',
        role_key: 'executive_addon',
        description: 'Addon: Grants strategic oversight — goal cascading and org-wide analytics.',
        color: '#8b5cf6',
        is_system_role: false,
        is_addon: true,
        is_active: true,
        permissions: ['goals.cascade', 'analytics.view_client', 'analytics.export', 'assessments.view_results'],
      },
      {
        role_name: 'Program Administrator Add-on',
        role_key: 'program_administrator_addon',
        description: 'Addon: Grants program creation, management, and participant oversight.',
        color: '#f97316',
        is_system_role: false,
        is_addon: true,
        is_active: true,
        permissions: ['programs.view', 'programs.create', 'programs.edit', 'programs.manage_participants', 'content.create', 'content.edit', 'assessments.create', 'assessments.deploy', 'learning.assign'],
      },
      {
        role_name: 'HR Administrator Add-on',
        role_key: 'hr_administrator_addon',
        description: 'Addon: Grants user management, role assignment, and HR operations capabilities.',
        color: '#ec4899',
        is_system_role: false,
        is_addon: true,
        is_active: true,
        permissions: ['users.view', 'users.create', 'users.edit', 'roles.view', 'roles.assign', 'settings.view', 'analytics.view_client', 'analytics.export'],
      },
      {
        role_name: 'Super Administrator Add-on',
        role_key: 'super_administrator_addon',
        description: 'Addon: Grants elevated admin access — user deletion, full role management, and org settings.',
        color: '#ef4444',
        is_system_role: false,
        is_addon: true,
        is_active: true,
        permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'roles.view', 'roles.create', 'roles.edit', 'roles.assign', 'settings.view', 'settings.edit', 'content.delete', 'programs.delete', 'billing.view'],
      },
      {
        role_name: 'Platform Administrator Add-on',
        role_key: 'platform_administrator_addon',
        description: 'Addon: Grants full platform control — billing, branding, impersonation, and platform analytics.',
        color: '#0202ff',
        is_system_role: false,
        is_addon: true,
        is_active: true,
        permissions: ['users.impersonate', 'settings.branding', 'billing.view', 'billing.manage', 'analytics.view_platform', 'roles.delete'],
      },
    ];

    const created = [];
    const skipped = [];

    for (const role of roles) {
      const existing = await base44.asServiceRole.entities.CustomRole.filter({ role_key: role.role_key });
      if (existing.length > 0) {
        skipped.push(role.role_name);
        continue;
      }
      await base44.asServiceRole.entities.CustomRole.create(role);
      created.push(role.role_name);
    }

    return Response.json({
      success: true,
      message: `Created ${created.length} roles, skipped ${skipped.length} existing`,
      created,
      skipped,
    });

  } catch (error) {
    console.error('Error seeding role templates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});