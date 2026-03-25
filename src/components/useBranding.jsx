import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_BRANDING = {
  logo_url: '',
  favicon_url: '',
  primary_color: '#1E40AF',
  secondary_color: '#8B5CF6',
  header_bg_color: '#FFFFFF',
  text_color: '#1F2937',
  heading_font: 'Inter, sans-serif',
  body_font: 'Inter, sans-serif',
  font_url: '',
  platform_name: 'Curiosity Led',
  tagline: 'Leadership Development Platform',
  welcome_message: 'Welcome back, {{user.first_name}}!',
  terminology_overrides: {}
};

export const useBranding = () => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        // Get current user to check for client_id and partner_id
        const user = await base44.auth.me();
        
        let brandingConfig = null;

        // PRIORITY 1: Client-specific branding (if user belongs to a client)
        if (user && user.client_id) {
          try {
            const clientBranding = await base44.entities.BrandingConfiguration.filter({
              client_id: user.client_id,
              partner_id: null,
              is_active: true
            });
            
            if (clientBranding.length > 0) {
              brandingConfig = clientBranding[0];
              console.log('Using client-specific branding for client:', user.client_id);
            }
          } catch (error) {
            console.warn('No client-specific branding found:', error);
          }
        }

        // PRIORITY 2: Partner-specific branding (if user belongs to a partner and no client branding)
        if (!brandingConfig && user && user.partner_id) {
          try {
            const partnerBranding = await base44.entities.BrandingConfiguration.filter({
              partner_id: user.partner_id,
              client_id: null,
              is_active: true
            });
            
            if (partnerBranding.length > 0) {
              brandingConfig = partnerBranding[0];
              console.log('Using partner-specific branding for partner:', user.partner_id);
            }
          } catch (error) {
            console.warn('No partner-specific branding found:', error);
          }
        }

        // PRIORITY 3: Global platform branding (fallback)
        if (!brandingConfig) {
          try {
            const globalBranding = await base44.entities.BrandingConfiguration.filter({
              client_id: null,
              partner_id: null,
              is_active: true
            });
            
            if (globalBranding.length > 0) {
              brandingConfig = globalBranding[0];
              console.log('Using global platform branding');
            }
          } catch (error) {
            console.warn('No global branding found:', error);
          }
        }

        // Merge with defaults to ensure all properties exist
        if (brandingConfig) {
          setBranding({
            ...DEFAULT_BRANDING,
            ...brandingConfig
          });
        } else {
          // PRIORITY 4: Use hardcoded defaults if no branding found
          console.log('Using hardcoded default branding');
          setBranding(DEFAULT_BRANDING);
        }
      } catch (error) {
        console.error('Error fetching branding:', error);
        // Use defaults on error
        setBranding(DEFAULT_BRANDING);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  const updateBranding = async (newBranding) => {
    try {
      const user = await base44.auth.me();
      
      // Determine which type of branding to update
      let filter = {};
      let brandingData = {
        ...newBranding,
        is_active: true
      };

      if (user?.client_id) {
        // Update client branding
        filter = { client_id: user.client_id, partner_id: null, is_active: true };
        brandingData.client_id = user.client_id;
        brandingData.partner_id = null;
      } else if (user?.partner_id) {
        // Update partner branding
        filter = { partner_id: user.partner_id, client_id: null, is_active: true };
        brandingData.partner_id = user.partner_id;
        brandingData.client_id = null;
      } else {
        // Update platform default branding
        filter = { client_id: null, partner_id: null, is_active: true };
        brandingData.client_id = null;
        brandingData.partner_id = null;
      }

      const existingConfigs = await base44.entities.BrandingConfiguration.filter(filter);
      const existingConfig = existingConfigs.length > 0 ? existingConfigs[0] : null;

      if (existingConfig) {
        await base44.entities.BrandingConfiguration.update(existingConfig.id, brandingData);
      } else {
        await base44.entities.BrandingConfiguration.create(brandingData);
      }

      // Log the change
      await base44.entities.BrandingChangeLog.create({
        changed_by: user.email,
        change_type: 'branding_updated',
        new_value: JSON.stringify(brandingData)
      });

      setBranding({
        ...DEFAULT_BRANDING,
        ...brandingData
      });
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  };

  const resetToDefault = async () => {
    try {
      const user = await base44.auth.me();
      
      // Find and deactivate existing config
      let filter = {};
      if (user?.client_id) {
        filter = { client_id: user.client_id, partner_id: null, is_active: true };
      } else if (user?.partner_id) {
        filter = { partner_id: user.partner_id, client_id: null, is_active: true };
      } else {
        filter = { client_id: null, partner_id: null, is_active: true };
      }

      const existingConfigs = await base44.entities.BrandingConfiguration.filter(filter);
      
      if (existingConfigs.length > 0) {
        await base44.entities.BrandingConfiguration.update(existingConfigs[0].id, {
          is_active: false
        });
      }

      // Log the reset
      await base44.entities.BrandingChangeLog.create({
        changed_by: user.email,
        change_type: 'reset_to_default'
      });

      setBranding(DEFAULT_BRANDING);
    } catch (error) {
      console.error('Error resetting branding:', error);
      throw error;
    }
  };

  return { branding, loading, updateBranding, resetToDefault };
};