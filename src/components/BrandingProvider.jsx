import React, { createContext, useContext } from 'react';
import { useBranding } from './useBranding';

const BrandingContext = createContext(null);

export const BrandingProvider = ({ children }) => {
  const { branding, loading } = useBranding();
  
  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBrandingContext = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    console.warn('useBrandingContext used outside BrandingProvider, returning defaults');
    return { branding: {}, loading: false };
  }
  return context;
};

// Helper to get branding value with fallback
export const useBrandingValue = (key, defaultValue) => {
  const { branding } = useBrandingContext();
  return branding?.[key] ?? defaultValue;
};