import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { operation, csv_data } = await req.json();

    if (operation === 'upload') {
      const lines = csv_data.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const competencies = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;
        
        const comp = {};
        headers.forEach((header, index) => {
          const value = values[index];
          
          if (header === 'key_components') {
            // Format: "Component1:35|Component2:28|Component3:22|Component4:15"
            comp[header] = value ? value.split('|').map(c => {
              const [name, weight] = c.split(':');
              return { name, weight: parseFloat(weight) || 0 };
            }) : [];
          } else if (header === 'leadership_level_requirements') {
            // Format: "level_1:2|level_2:3|level_3:4|level_4:5|level_5:5"
            const reqs = {
              level_1_leading_self: 2,
              level_2_leading_others: 3,
              level_3_leading_managers: 4,
              level_4_leading_functions: 5,
              level_5_leading_organizations: 5
            };
            if (value) {
              value.split('|').forEach(part => {
                const [level, val] = part.split(':');
                const key = `level_${level}_leading_${level === '1' ? 'self' : level === '2' ? 'others' : level === '3' ? 'managers' : level === '4' ? 'functions' : 'organizations'}`;
                reqs[key] = parseInt(val) || 2;
              });
            }
            comp[header] = reqs;
          } else if (header === 'assessment_mapping') {
            // Format: "assessment_ids:id1;id2|score_mapping:0-59: Development Needed|calculation_method:Average of questions"
            const mapping = { assessment_ids: [], score_mapping: '', calculation_method: '' };
            if (value) {
              value.split('|').forEach(part => {
                const [key, val] = part.split(':');
                if (key === 'assessment_ids') {
                  mapping[key] = val ? val.split(';').map(v => v.trim()) : [];
                } else {
                  mapping[key] = val || '';
                }
              });
            }
            comp[header] = mapping;
          } else if (header === 'is_platform_default') {
            comp[header] = value.toLowerCase() === 'true';
          } else {
            comp[header] = value || '';
          }
        });
        
        if (!comp.name || !comp.category || !comp.definition) continue;
        competencies.push(comp);
      }

      const results = [];
      for (const comp of competencies) {
        try {
          const created = await base44.asServiceRole.entities.Competency.create(comp);
          results.push({ success: true, name: comp.name, id: created.id });
        } catch (error) {
          results.push({ success: false, name: comp.name, error: error.message });
        }
      }

      return Response.json({ 
        success: true, 
        message: `Processed ${competencies.length} competencies`,
        results 
      });

    } else if (operation === 'delete') {
      const lines = csv_data.trim().split('\n');
      const names = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values[0]) names.push(values[0]);
      }

      const results = [];
      for (const name of names) {
        try {
          const comps = await base44.asServiceRole.entities.Competency.filter({ name });
          for (const comp of comps) {
            await base44.asServiceRole.entities.Competency.delete(comp.id);
          }
          results.push({ success: true, name, deleted: comps.length });
        } catch (error) {
          results.push({ success: false, name, error: error.message });
        }
      }

      return Response.json({ 
        success: true, 
        message: `Processed ${names.length} competency deletions`,
        results 
      });

    } else {
      return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in bulk competency operations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});