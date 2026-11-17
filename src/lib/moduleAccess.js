import { useClient } from '@/components/contexts/ClientContext';

/**
 * The screens a package boundary withholds. One line here, plus a
 * <ModuleRoute moduleKey="..."> wrapper in App.jsx, gates a screen.
 */
export const PATH_MODULE_KEY = {
  '/talent-manager': 'talent',
  '/succession': 'talent',
  '/reviews': 'reviews',
  '/decision-analytics': 'cross_team_analytics',
};

/**
 * Reads the package position the server resolved for this tenant.
 *
 * The answer comes from base44/shared/moduleGate.ts via the client context, so a
 * locked menu item and a refused server call can never disagree. A screen is
 * locked only when the package excludes the module AND the tenant is in block
 * mode — in warn mode the screen stays usable while the attempt is recorded.
 */
export const useModuleAccess = () => {
  const { modules } = useClient();

  const moduleFor = (key) =>
    (Array.isArray(modules) ? modules.find((m) => m.module === key) : null) || null;

  const isLocked = (key) => {
    const entry = moduleFor(key);
    return !!entry && !entry.included_in_package && entry.outcome === 'blocked';
  };

  const pathLocked = (path) => isLocked(PATH_MODULE_KEY[path]);

  return { modules, moduleFor, isLocked, pathLocked };
};