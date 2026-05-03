import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Predefined Add-on Role Templates
const ADDON_ROLE_TEMPLATES = [
  {
    role_name: 'Team Leader Add-on',
    role_key: 'team_leader_addon',
    description: 'Grants access to view and analyze team data across all sections (dashboard, assessments, journeys, development, performance, insights)',
    permissions: [
      'team.dashboard.view',
      'team.assessments.view',
      'team.journeys.view',
      'team.development.view',
      'team.performance.view',
      'team.insights.view',
      'team.goals.view',
      'team.learning.view'
    ],
    is_system_role: true,
    is_addon: true,
    is_active: true,
    color: '#3B82F6' // blue
  },
  {
    role_name: 'Analyst Add-on',
    role_key: 'analyst_addon',
    description: 'Grants access to organizational analytics and reporting across all sections',
    permissions: [
      'analytics.view_client',
      'analytics.view_org',
      'analytics.export',
      'analytics.assessments.view',
      'analytics.journeys.view',
      'analytics.development.view',
      'analytics.performance.view',
      'analytics.insights.view'
    ],
    is_system_role: true,
    is_addon: true,
    is_active: true,
    color: '#8B5CF6' // purple
  },
  {
    role_name: 'Program Admin Add-on',
    role_key: 'program_admin_addon',
    description: 'Grants access to create and manage programs, cohorts, and participants',
    permissions: [
      'programs.view',
      'programs.create',
      'programs.edit',
      'programs.delete',
      'programs.manage_participants',
      'programs.analytics.view',
      'cohorts.view',
      'cohorts.create',
      'cohorts.edit',
      'cohorts.manage_participants'
    ],
    is_system_role: true,
    is_addon: true,
    is_active: true,
    color: '#10B981' // green
  },
  {
    role_name: 'Executive Add-on',
    role_key: 'executive_addon',
    description: 'Grants a standard user access to executive-level organizational analytics and insights, on top of their personal user experience',
    permissions: [
      'analytics.view_client',
      'analytics.view_org',
      'analytics.export',
      'analytics.assessments.view',
      'analytics.journeys.view',
      'analytics.development.view',
      'analytics.performance.view',
      'analytics.insights.view',
      'users.view',
      'content.view',
      'programs.view',
      'assessments.view',
      'learning.view',
      'goals.view',
      'leadership_index.view_analytics'
    ],
    is_system_role: true,
    is_addon: true,
    is_active: true,
    color: '#0D9488' // teal
  },
  {
    role_name: 'HR Admin Add-on',
    role_key: 'hr_admin_addon',
    description: 'Grants access to user management, role assignment, and content administration',
    permissions: [
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'roles.view',
      'roles.assign',
      'settings.view',
      'settings.edit',
      'content.view',
      'content.create',
      'content.edit',
      'content.delete',
      'content.publish'
    ],
    is_system_role: true,
    is_addon: true,
    is_active: true,
    color: '#F59E0B' // amber
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only Platform Admins and Super Admins can seed addon roles
    if (!['Platform Admin', 'Super Administrator'].includes(user.app_role)) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const results = {
      created: [],
      existing: [],
      errors: []
    };

    // Check and create each addon role template
    for (const template of ADDON_ROLE_TEMPLATES) {
      try {
        // Check if role already exists
        const existingRoles = await base44.entities.CustomRole.filter({ 
          role_key: template.role_key 
        });

        if (existingRoles.length > 0) {
          // Update existing role to ensure it has latest permissions
          await base44.entities.CustomRole.update(existingRoles[0].id, {
            ...template,
            updated_date: new Date().toISOString()
          });
          results.existing.push(template.role_name);
        } else {
          // Create new role
          await base44.entities.CustomRole.create({
            ...template,
            created_by: user.email,
            user_count: 0
          });
          results.created.push(template.role_name);
        }
      } catch (error) {
        results.errors.push({
          role: template.role_name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Addon roles seeded successfully`,
      results
    });

  } catch (error) {
    console.error('Error seeding addon roles:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});