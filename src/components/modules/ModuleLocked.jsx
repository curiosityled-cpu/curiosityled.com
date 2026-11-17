import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const packageName = (key) => {
  if (!key) return 'a higher package';
  return key.charAt(0).toUpperCase() + key.slice(1);
};

/**
 * What a screen shows when the tenant's package does not include the module.
 * The feature is named and explained rather than hidden, so the limitation reads
 * as a package boundary instead of a broken screen.
 */
export default function ModuleLocked({ module }) {
  const required = packageName(module?.min_package);

  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center border border-border bg-muted">
        <Lock className="w-5 h-5" style={{ color: 'hsl(var(--muted-foreground))' }} />
      </div>

      <h1 className="text-lg font-semibold mt-5">{module?.label || 'This module'} is not in your package</h1>

      {module?.claim && (
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {module.claim}
        </p>
      )}

      <p className="text-sm mt-4 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
        It is included from <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{required}</span>.
        Everything else in your workspace keeps working.
      </p>

      <div className="flex items-center justify-center gap-2 mt-6">
        <Button asChild variant="outline">
          <Link to="/today">Back to Lead</Link>
        </Button>
        <Button asChild>
          <Link to="/pricing">See what is included</Link>
        </Button>
      </div>
    </div>
  );
}