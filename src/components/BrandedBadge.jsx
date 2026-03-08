import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useBrandingContext } from './BrandingProvider';

export const BrandedBadge = React.forwardRef(({ className, style, children, ...props }, ref) => {
  const { branding } = useBrandingContext();
  
  const brandedStyle = {
    ...style,
    backgroundColor: branding?.primary_color,
    color: '#FFFFFF',
  };

  return (
    <Badge ref={ref} {...props} style={brandedStyle} className={className}>
      {children}
    </Badge>
  );
});

BrandedBadge.displayName = 'BrandedBadge';