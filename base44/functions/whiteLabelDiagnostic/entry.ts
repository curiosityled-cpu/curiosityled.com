import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const diagnostics = {
      user: {
        email: user.email,
        client_id: user.client_id,
        partner_id: user.partner_id,
        role: user.role,
        app_role: user.app_role
      },
      branding_search: {},
      errors: []
    };

    // Test 1: Search for all active branding configs
    try {
      const allConfigs = await base44.entities.BrandingConfiguration.filter({
        is_active: true
      });
      diagnostics.branding_search.all_active_count = allConfigs.length;
      diagnostics.branding_search.all_active = allConfigs.map(c => ({
        id: c.id,
        client_id: c.client_id,
        partner_id: c.partner_id,
        platform_name: c.platform_name,
        primary_color: c.primary_color,
        heading_font_mode: c.heading_font_mode,
        body_font_mode: c.body_font_mode
      }));
    } catch (error) {
      diagnostics.errors.push(`Failed to fetch all configs: ${error.message}`);
    }

    // Test 2: Search for platform default (no client_id, no partner_id)
    try {
      const allConfigs = await base44.entities.BrandingConfiguration.filter({
        is_active: true
      });
      const platformDefaults = allConfigs.filter(c => !c.client_id && !c.partner_id);
      diagnostics.branding_search.platform_defaults_count = platformDefaults.length;
      if (platformDefaults.length > 0) {
        diagnostics.branding_search.platform_default = {
          id: platformDefaults[0].id,
          platform_name: platformDefaults[0].platform_name,
          primary_color: platformDefaults[0].primary_color,
          heading_font_mode: platformDefaults[0].heading_font_mode,
          body_font_mode: platformDefaults[0].body_font_mode,
          all_fields: Object.keys(platformDefaults[0])
        };
      }
    } catch (error) {
      diagnostics.errors.push(`Failed to fetch platform defaults: ${error.message}`);
    }

    // Test 3: If user has client_id, search for client-specific branding
    if (user.client_id) {
      try {
        const clientConfigs = await base44.entities.BrandingConfiguration.filter({
          client_id: user.client_id,
          is_active: true
        });
        diagnostics.branding_search.client_branding_count = clientConfigs.length;
        if (clientConfigs.length > 0) {
          diagnostics.branding_search.client_branding = {
            id: clientConfigs[0].id,
            platform_name: clientConfigs[0].platform_name,
            primary_color: clientConfigs[0].primary_color
          };
        }
      } catch (error) {
        diagnostics.errors.push(`Failed to fetch client branding: ${error.message}`);
      }
    }

    // Test 4: Check if BrandingConfiguration entity exists and is queryable
    try {
      const schema = await base44.entities.BrandingConfiguration.schema();
      diagnostics.entity_schema = {
        exists: true,
        properties: Object.keys(schema.properties || {})
      };
    } catch (error) {
      diagnostics.errors.push(`Failed to fetch schema: ${error.message}`);
    }

    // Test 5: Test the useBranding logic - simulate fetch
    try {
      let brandingConfig = null;
      
      if (user.client_id) {
        const results = await base44.entities.BrandingConfiguration.filter({
          client_id: user.client_id,
          is_active: true
        });
        if (results.length > 0) {
          brandingConfig = results[0];
          diagnostics.selection_logic = 'client-specific selected';
        } else {
          const all = await base44.entities.BrandingConfiguration.filter({
            is_active: true
          });
          const platformOnly = all.filter(c => !c.client_id && !c.partner_id);
          if (platformOnly.length > 0) {
            brandingConfig = platformOnly[0];
            diagnostics.selection_logic = 'platform default selected (no client branding found)';
          } else {
            diagnostics.selection_logic = 'no branding found - using hardcoded defaults';
          }
        }
      } else if (user.partner_id) {
        const results = await base44.entities.BrandingConfiguration.filter({
          partner_id: user.partner_id,
          is_active: true
        });
        if (results.length > 0) {
          brandingConfig = results[0];
          diagnostics.selection_logic = 'partner-specific selected';
        } else {
          const all = await base44.entities.BrandingConfiguration.filter({
            is_active: true
          });
          const platformOnly = all.filter(c => !c.client_id && !c.partner_id);
          if (platformOnly.length > 0) {
            brandingConfig = platformOnly[0];
            diagnostics.selection_logic = 'platform default selected (no partner branding found)';
          } else {
            diagnostics.selection_logic = 'no branding found - using hardcoded defaults';
          }
        }
      } else {
        const all = await base44.entities.BrandingConfiguration.filter({
          is_active: true
        });
        const platformOnly = all.filter(c => !c.client_id && !c.partner_id);
        if (platformOnly.length > 0) {
          brandingConfig = platformOnly[0];
          diagnostics.selection_logic = 'platform default selected (admin user)';
        } else {
          diagnostics.selection_logic = 'no branding found - using hardcoded defaults';
        }
      }

      if (brandingConfig) {
        diagnostics.selected_branding = {
          id: brandingConfig.id,
          client_id: brandingConfig.client_id,
          partner_id: brandingConfig.partner_id,
          platform_name: brandingConfig.platform_name,
          primary_color: brandingConfig.primary_color,
          header_bg_color: brandingConfig.header_bg_color,
          heading_font_mode: brandingConfig.heading_font_mode,
          body_font_mode: brandingConfig.body_font_mode,
          is_missing_font_modes: !brandingConfig.heading_font_mode || !brandingConfig.body_font_mode
        };
      }
    } catch (error) {
      diagnostics.errors.push(`Failed to simulate selection logic: ${error.message}`);
    }

    diagnostics.timestamp = new Date().toISOString();
    diagnostics.status = diagnostics.errors.length === 0 ? 'OK' : 'ERRORS_FOUND';

    return Response.json(diagnostics);
  } catch (error) {
    return Response.json({
      error: error.message,
      status: 'FAILED'
    }, { status: 500 });
  }
});