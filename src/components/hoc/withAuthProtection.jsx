import React from 'react';
import { useAuth } from '@/components/useAuth';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { AccessDeniedPage } from '@/components/AccessDeniedPage';

/**
 * Higher-Order Component for authentication and role-based access control
 * @param {React.Component} Component - The component to protect
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.allowedRoles - Array of role names that can access this component
 * @param {Function} options.checkAccess - Custom function to check access (receives user object)
 * @returns {React.Component} Protected component
 */
export function withAuthProtection(Component, options = {}) {
  return function ProtectedComponent(props) {
    const { user, appRole, loading, isPlatformAdmin } = useAuth();
    const allowedRoles = Array.isArray(options) ? options : (options.allowedRoles || []);
    const checkAccess = Array.isArray(options) ? null : options.checkAccess;
    const [redirectAttempted, setRedirectAttempted] = React.useState(false);
    const redirectTimeoutRef = React.useRef(null);
    const isMountedRef = React.useRef(true);

    // Handle authentication redirect using useEffect for proper lifecycle management
    React.useEffect(() => {
      // Only attempt redirect once when loading is complete and user is not authenticated
      if (!loading && !user && !redirectAttempted && isMountedRef.current) {
        setRedirectAttempted(true);
        
        // Prevent multiple redirects
        if (redirectTimeoutRef.current) {
          return;
        }
        
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        
        // Check if already on a public page to prevent unnecessary redirects
        const normalizedPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
        const publicPaths = ['/landingpage', '/termsofservice', '/privacypolicy', '/login'];
        const isOnPublicPage = publicPaths.some(path => normalizedPath === path || normalizedPath.startsWith(path + '/'));
        
        if (isOnPublicPage) {
          // Already on public page, no redirect needed
          console.log('Already on public page, skipping redirect');
          return;
        }
        
        // Redirect to Landing Page (public page where users can log in)
        console.log('User not authenticated, redirecting to Landing Page');
        window.location.href = '/LandingPage';

        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
          redirectTimeoutRef.current = null;
        }
      }
      
      // Cleanup timeout on unmount or when dependencies change
      return () => {
        isMountedRef.current = false;
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
          redirectTimeoutRef.current = null;
        }
      };
    }, [loading, user, redirectAttempted]);
    
    // Reset mounted flag when component re-mounts
    React.useEffect(() => {
      isMountedRef.current = true;
    }, []);



    // Show loading state while checking authentication
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    // If not authenticated, show redirecting state
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      );
    }

    // Platform admins can access everything
    if (isPlatformAdmin) {
      return <Component {...props} />;
    }

    // Check custom access function if provided
    if (checkAccess && !checkAccess(user)) {
      return <AccessDeniedPage />;
    }

    // Check role-based access if roles are specified
    if (allowedRoles.length > 0 && !allowedRoles.includes(appRole)) {
      return <AccessDeniedPage />;
    }

    // User has access
    return <Component {...props} />;
  };
}