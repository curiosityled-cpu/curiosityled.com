import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { ADDON_PERMISSIONS } from '../components/utils/permissions.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated and has admin permissions
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only Platform Admins and Super Administrators can seed templates
    if (user.app_role !== 'Platform Admin' && user.app_role !== 'Super Administrator') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const templates = [
      {
        role_name: 'Team Leader Add-on',
        description: 'Grants team leadership analytics and management capabilities. View team dashboards, learning progress, goals, performance, assessments, journeys, and insights.',
        permissions: ADDON_PERMISSIONS['Team Leader Add-on'],
        is_system_template: true,
        created_by: user.email
      },
      {
        role_name: 'Analyst Add-on',
        description: 'Grants organization-wide analytics access. View and export client-level data across all modules including dashboards, learning, goals, performance, assessments, journeys, and insights.',
        permissions: ADDON_PERMISSIONS['Analyst Add-on'],
        is_system_template: true,
        created_by: user.email
      },
      {
        role_name: 'Program Admin Add-on',
        description: 'Grants program management capabilities. Create, edit, delete, and manage programs and their participants with full analytics access.',
        permissions: ADDON_PERMISSIONS['Program Admin Add-on'],
        is_system_template: true,
        created_by: user.email
      },
      {
        role_name: 'HR Admin Add-on',
        description: 'Grants HR administration capabilities. Manage users, assign roles, and configure platform settings.',
        permissions: ADDON_PERMISSIONS['HR Admin Add-on'],
        is_system_template: true,
        created_by: user.email
      }
    ];
    
    const createdTemplates = [];
    const skippedTemplates = [];
    
    for (const template of templates) {
      // Check if template already exists
      const existing = await base44.asServiceRole.entities.CustomRole.filter({
        role_name: template.role_name,
        is_system_template: true
      });
      
      if (existing.length > 0) {
        skippedTemplates.push(template.role_name);
        continue;
      }
      
      // Create the template
      const created = await base44.asServiceRole.entities.CustomRole.create(template);
      createdTemplates.push(created);
    }
    
    return Response.json({
      success: true,
      message: `Seeded ${createdTemplates.length} custom role templates`,
      created: createdTemplates.map(t => t.role_name),
      skipped: skippedTemplates,
      templates: createdTemplates
    });
    
  } catch (error) {
    console.error('Error seeding custom role templates:', error);
    return Response.json({ 
      error: error.message || 'Failed to seed templates' 
    }, { status: 500 });
  }
});