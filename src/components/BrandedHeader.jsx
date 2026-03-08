import React from 'react';
import { useBrandingContext } from './BrandingProvider';

export const BrandedHeader = ({ children, className = '' }) => {
  const { branding } = useBrandingContext();
  
  const headerStyle = {
    backgroundColor: branding?.header_bg_color || '#FFFFFF',
    color: branding?.text_color || '#1F2937',
  };

  return (
    <header style={headerStyle} className={`${className} transition-colors`}>
      {children}
    </header>
  );
};