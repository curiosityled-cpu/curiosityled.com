import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_BRANDING = {
  logo_url: '',
  favicon_url: '',
  primary_color: '#1E40AF',
  secondary_color: '#8B5CF6',
  header_bg_color: '#FFFFFF',
  text_color: '#1F2937',
  heading_font: 'Inter, sans-serif',
  heading_font_mode: 'dropdown',
  body_font: 'Inter, sans-serif',
  body_font_mode: 'dropdown',
  font_url: '',
  platform_name: 'Curiosity Led',
  tagline: 'Leadership Development Platform',
  welcome_message: 'Welcome back, {{user.first_name}}!',
  terminology_overrides: {}
};

// Global cache and subscribers management
let brandingCache = {}; // { [userKey]: brandingData }
let currentUserKey = null;
let subscribers = new Set(); // Use Set to prevent duplicate subscriptions
let lastFetchTime = 0; // Track last fetch to prevent excessive re-fetches

function getUserKey(user) {
  if (!user) return 'anonymous';
  return user.client_id || user.partner_id || user.email || 'platform';
}

function notifySubscribers(branding) {
  subscribers.forEach(fn => {
    try {
      fn(branding);
    } catch (error) {
      console.error('Error calling subscriber:', error);
    }
  });
}

async function fetchBrandingFromDB() {
  try {
    const user = await base44.auth.me();
    const userKey = getUserKey(user);
    currentUserKey = userKey;

    let brandingConfig = null;

    // PRIORITY 1: Client-specific branding
    if (user?.client_id) {
      const results = await base44.entities.BrandingConfiguration.filter({
        client_id: user.client_id,
        is_active: true
      });
      if (results.length > 0) {
        brandingConfig = results[0];
      } else {
        // Fall back to platform default
        const platformDefault = await base44.entities.BrandingConfiguration.filter({
          is_active: true
        });
        const platformOnly = platformDefault.filter(c => !c.client_id && !c.partner_id);
        if (platformOnly.length > 0) brandingConfig = platformOnly[0];
      }
    }
    // PRIORITY 2: Partner-specific branding
    else if (user?.partner_id) {
      const results = await base44.entities.BrandingConfiguration.filter({
        partner_id: user.partner_id,
        is_active: true
      });
      if (results.length > 0) {
        brandingConfig = results[0];
      } else {
        // Fall back to platform default
        const platformDefault = await base44.entities.BrandingConfiguration.filter({
          is_active: true
        });
        const platformOnly = platformDefault.filter(c => !c.client_id && !c.partner_id);
        if (platformOnly.length > 0) brandingConfig = platformOnly[0];
      }
    }
    // PRIORITY 3: Platform default
    else {
      const all = await base44.entities.BrandingConfiguration.filter({
        is_active: true
      });
      const platformOnly = all.filter(c => !c.client_id && !c.partner_id);
      if (platformOnly.length > 0) brandingConfig = platformOnly[0];
    }

    // Ensure all required fields have defaults
    const resolved = brandingConfig
      ? {
          ...DEFAULT_BRANDING,
          ...brandingConfig,
          heading_font_mode: brandingConfig.heading_font_mode || 'dropdown',
          body_font_mode: brandingConfig.body_font_mode || 'dropdown'
        }
      : DEFAULT_BRANDING;

    brandingCache[userKey] = resolved;
    lastFetchTime = Date.now();
    notifySubscribers(resolved);
    return resolved;
  } catch (error) {
    console.error('Error fetching branding:', error);
    const fallback = { ...DEFAULT_BRANDING };
    notifySubscribers(fallback);
    return fallback;
  }
}

export const useBranding = () => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [lastUserKey, setLastUserKey] = useState(null);

  useEffect(() => {
    // Subscribe to branding changes
    subscribers.add(setBranding);

    // Fetch branding on mount
    const initBranding = async () => {
      setLoading(true);
      const fetched = await fetchBrandingFromDB();
      setLastUserKey(currentUserKey);
      setLoading(false);
    };
    
    initBranding();

    // Setup interval to check for user changes (impersonation)
    const checkInterval = setInterval(async () => {
      try {
        const user = await base44.auth.me();
        const userKey = getUserKey(user);
        
        // Use currentUserKey directly since it's updated by fetchBrandingFromDB
        if (userKey !== currentUserKey) {
          // User changed (impersonation or login), re-fetch branding immediately
          setLoading(true);
          await fetchBrandingFromDB();
          setLastUserKey(currentUserKey);
          setLoading(false);
        }
      } catch (error) {
        console.error('[Branding] Error checking user context:', error);
      }
    }, 3000); // Check every 3 seconds to avoid rate limits

    // Cleanup: unsubscribe and clear interval
    return () => {
      subscribers.delete(setBranding);
      clearInterval(checkInterval);
    };
  }, []);

  const refreshBranding = useCallback(async () => {
    // Clear cache for current user and re-fetch
    if (currentUserKey) {
      delete brandingCache[currentUserKey];
    }
    setLoading(true);
    await fetchBrandingFromDB();
    setLastUserKey(currentUserKey);
    setLoading(false);
  }, []);

  return { branding, loading, refreshBranding };
};