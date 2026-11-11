import { Navigate, useLocation } from 'react-router-dom';

/**
 * Sends a signed-out visitor to the login page while remembering where they were
 * headed, so a link (e.g. a check-in reminder pointing at /today) lands back on
 * that page after sign-in instead of the default landing route.
 */
export default function RedirectToLogin() {
  const location = useLocation();
  const target = `${location.pathname}${location.search || ''}`;
  const isSensible = target && target !== '/' && !target.startsWith('/login');

  return (
    <Navigate
      to={isSensible ? `/login?returnTo=${encodeURIComponent(target)}` : '/login'}
      replace
    />
  );
}