import React from 'react';
import { Button } from '@/components/ui/button';
import { useBrandingContext } from './BrandingProvider';

export const BrandedButton = React.forwardRef(({ className, style, ...props }, ref) => {
  const { branding } = useBrandingContext();
  
  const brandedStyle = {
    ...style,
    backgroundColor: props.variant === 'default' ? branding?.primary_color : style?.backgroundColor,
    color: props.variant === 'default' ? '#FFFFFF' : style?.color,
  };

  return <Button ref={ref} {...props} style={brandedStyle} className={className} />;
});

BrandedButton.displayName = 'BrandedButton';