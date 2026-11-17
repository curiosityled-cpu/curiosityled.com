import React from 'react';
import { useModuleAccess } from '@/lib/moduleAccess';
import ModuleLocked from '@/components/modules/ModuleLocked';

/**
 * Renders the screen unless this tenant's package excludes the module it needs,
 * in which case the screen is replaced by the package explanation.
 */
export default function ModuleRoute({ moduleKey, children }) {
  const { moduleFor, isLocked } = useModuleAccess();

  if (!isLocked(moduleKey)) return children;

  return <ModuleLocked module={moduleFor(moduleKey)} />;
}