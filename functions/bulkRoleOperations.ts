import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to perform bulk operations
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { operation, csv_data } = await req.json();

    if (operation === 'upload') {
      // Parse CSV and create roles
      const lines = csv_data.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const roles = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;
        
        const role = {};
        headers.forEach((header, index) => {
          const value = values[index];
          
          // Handle different field types
          if (header === 'essential_duties' || header === 'success_metrics' || 
              header === 'tools_and_systems' || header === 'benefits_highlights') {
            role[header] = value ? value.split('|').map(v => v.trim()) : [];
          } else if (header === 'required_qualifications' || header === 'preferred_qualifications') {
            // Format: "education:Bachelor's|experience_years:5|technical_skills:Python;Java|certifications:PMP"
            const qual = { education: '', experience_years: 0, technical_skills: [], certifications: [] };
            if (value) {
              value.split('|').forEach(part => {
                const [key, val] = part.split(':');
                if (key === 'technical_skills' || key === 'certifications') {
                  qual[key] = val ? val.split(';').map(v => v.trim()) : [];
                } else if (key === 'experience_years') {
                  qual[key] = parseInt(val) || 0;
                } else {
                  qual[key] = val || '';
                }
              });
            }
            role[header] = qual;
          } else if (header === 'technical_competencies' || header === 'behavioral_competencies') {
            // Format: "Comp1:80:1|Comp2:90:1.5"
            role[header] = value ? value.split('|').map(c => {
              const [name, target_score, weight] = c.split(':');
              return { name, target_score: parseInt(target_score) || 80, weight: parseFloat(weight) || 1 };
            }) : [];
          } else if (header === 'reporting_structure') {
            // Format: "reports_to:Director|direct_reports:5|dotted_line_reports:Team1;Team2|key_collaborations:Sales;Marketing"
            const struct = { reports_to: '', direct_reports: 0, dotted_line_reports: [], key_collaborations: [] };
            if (value) {
              value.split('|').forEach(part => {
                const [key, val] = part.split(':');
                if (key === 'dotted_line_reports' || key === 'key_collaborations') {
                  struct[key] = val ? val.split(';').map(v => v.trim()) : [];
                } else if (key === 'direct_reports') {
                  struct[key] = parseInt(val) || 0;
                } else {
                  struct[key] = val || '';
                }
              });
            }
            role[header] = struct;
          } else if (header === 'work_environment') {
            // Format: "location_type:hybrid|physical_office_location:NYC|travel_percentage:20|physical_requirements:Standing;Lifting|working_conditions:Office"
            const env = { location_type: 'hybrid', physical_office_location: '', travel_percentage: 0, physical_requirements: [], working_conditions: '' };
            if (value) {
              value.split('|').forEach(part => {
                const [key, val] = part.split(':');
                if (key === 'physical_requirements') {
                  env[key] = val ? val.split(';').map(v => v.trim()) : [];
                } else if (key === 'travel_percentage') {
                  env[key] = parseInt(val) || 0;
                } else {
                  env[key] = val || '';
                }
              });
            }
            role[header] = env;
          } else if (header === 'compensation_range') {
            // Format: "min_salary:80000|max_salary:120000|currency:USD|bonus_structure:15% annual|equity:Stock options"
            const comp = { min_salary: 0, max_salary: 0, currency: 'USD', bonus_structure: '', equity: '' };
            if (value) {
              value.split('|').forEach(part => {
                const [key, val] = part.split(':');
                if (key === 'min_salary' || key === 'max_salary') {
                  comp[key] = parseInt(val) || 0;
                } else {
                  comp[key] = val || '';
                }
              });
            }
            role[header] = comp;
          } else if (header === 'is_active' || header === 'is_platform_default') {
            role[header] = value.toLowerCase() === 'true';
          } else {
            role[header] = value || '';
          }
        });
        
        // Set defaults for required fields
        if (!role.level) role.level = 'leading_self';
        if (!role.department) role.department = 'operations';
        if (!role.essential_duties) role.essential_duties = [];
        
        roles.push(role);
      }

      // Bulk create roles
      const results = [];
      for (const role of roles) {
        try {
          const created = await base44.asServiceRole.entities.Role.create(role);
          results.push({ success: true, title: role.title, id: created.id });
        } catch (error) {
          results.push({ success: false, title: role.title, error: error.message });
        }
      }

      return Response.json({ 
        success: true, 
        message: `Processed ${roles.length} roles`,
        results 
      });

    } else if (operation === 'delete') {
      // Parse CSV and delete roles by title
      const lines = csv_data.trim().split('\n');
      const titles = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values[0]) titles.push(values[0]);
      }

      const results = [];
      for (const title of titles) {
        try {
          const roles = await base44.asServiceRole.entities.Role.filter({ title });
          for (const role of roles) {
            await base44.asServiceRole.entities.Role.delete(role.id);
          }
          results.push({ success: true, title, deleted: roles.length });
        } catch (error) {
          results.push({ success: false, title, error: error.message });
        }
      }

      return Response.json({ 
        success: true, 
        message: `Processed ${titles.length} role deletions`,
        results 
      });

    } else {
      return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in bulk role operations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});