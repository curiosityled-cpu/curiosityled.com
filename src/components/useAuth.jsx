import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BASE_ROLE_PERMISSIONS } from '@/components/constants/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [customRole, setCustomRole] = useState(null);
  const [basePermissions, setBasePermissions] = useState([]);
  const [addonPermissions, setAddonPermissions] = useState([]);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      if (mounted) {
        await loadUser();
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Separate effect for session monitoring to avoid dependency issues
  useEffect(() => {
    // Only monitor if user is logged in and has valid data
    if (!user || !user.email) return;
    
    let authCheckInterval = null;
    const failureCountRef = { current: 0 };
    const MAX_FAILURES = 3;
    const isHandlingExpiryRef = { current: false };
    let mounted = true;
    
    // Function to handle session expiry
    const handleSessionExpiry = () => {
      if (isHandlingExpiryRef.current || !mounted) {
        console.log('Already handling session expiry or unmounted, skipping');
        return;
      }
      
      isHandlingExpiryRef.current = true;
      console.warn('Session expired, redirecting to landing page');
      
      // Clear interval immediately
      if (authCheckInterval) {
        clearInterval(authCheckInterval);
        authCheckInterval = null;
      }
      
      // Check if already on public page to avoid redirect loop
      const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const publicPaths = ['/landingpage', '/termsofservice', '/privacypolicy'];
      const isOnPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));
      
      // Clear all auth state
      setUser(null);
      setUserPermissions([]);
      setBasePermissions([]);
      setAddonPermissions([]);
      setCustomRole(null);
      setImpersonation(null);
      
      // Clear storage
      localStorage.removeItem('impersonation');
      
      // Only redirect if not already on a public page
      if (!isOnPublicPage) {
        // Force redirect to landing page
        window.location.href = '/LandingPage';
      }
    };
    
    // Set up periodic auth check to detect session expiry
    authCheckInterval = setInterval(async () => {
      if (!mounted) return;
      
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve(false), 5000)
        );
        
        const isAuth = await Promise.race([
          base44.auth.isAuthenticated(),
          timeoutPromise
        ]);
        
        if (!mounted) return;
        
        if (!isAuth) {
          handleSessionExpiry();
        } else {
          // Reset failure count on success
          failureCountRef.current = 0;
        }
      } catch (error) {
        if (!mounted) return;
        
        console.error('Session check failed:', error);
        failureCountRef.current++;
        
        // Only treat as expired after multiple consecutive failures
        if (failureCountRef.current >= MAX_FAILURES) {
          console.warn(`Auth check failed ${MAX_FAILURES} times, treating as session expired`);
          handleSessionExpiry();
        }
      }
    }, 60000); // Check every minute
    
    // Also check on page visibility change
    let visibilityCheckTimeout = null;
    const handleVisibilityChange = async () => {
      if (!document.hidden && !isHandlingExpiryRef.current) {
        // Debounce visibility checks to avoid rapid repeated calls
        if (visibilityCheckTimeout) {
          clearTimeout(visibilityCheckTimeout);
        }

        visibilityCheckTimeout = setTimeout(async () => {
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Auth check timeout')), 5000)
            );

            const isAuth = await Promise.race([
              base44.auth.isAuthenticated(),
              timeoutPromise
            ]);

            if (!isAuth) {
              handleSessionExpiry();
            }
          } catch (error) {
            console.error('Visibility auth check failed:', error);
            // Don't immediately expire on visibility check failure
            // Let the interval handle it with retry logic
          }
        }, 1000); // 1 second debounce
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mounted = false;
      if (authCheckInterval) {
        clearInterval(authCheckInterval);
        authCheckInterval = null;
      }
      if (visibilityCheckTimeout) {
        clearTimeout(visibilityCheckTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const loadUser = async () => {
    // Prevent concurrent loadUser calls
    if (isLoadingUser) {
      console.log('User load already in progress, skipping');
      return;
    }
    
    setIsLoadingUser(true);
    
    try {
      const impersonationData = localStorage.getItem('impersonation');
      if (impersonationData) {
        let parsed;
        try {
          parsed = JSON.parse(impersonationData);
          // Validate impersonation data structure
          if (!parsed || typeof parsed !== 'object' || !parsed.target_user_id) {
            throw new Error('Invalid impersonation structure');
          }
        } catch (parseError) {
          console.error('Invalid impersonation data, clearing:', parseError);
          localStorage.removeItem('impersonation');
          setImpersonation(null);
          
          // Fall through to load actual user
          const currentUser = await base44.auth.me();
          if (currentUser && currentUser.email) {
            setUser(currentUser);
            await loadUserPermissions(currentUser);
          } else {
            throw new Error('Invalid user data returned from auth.me()');
          }
          return;
        }
        
        setImpersonation(parsed);
        
        const targetUsers = await base44.entities.User.filter({ id: parsed.target_user_id });
        if (targetUsers && targetUsers.length > 0) {
          const targetUser = targetUsers[0];
          if (targetUser && targetUser.email) {
            setUser(targetUser);
            await loadUserPermissions(targetUser);
          } else {
            throw new Error('Invalid target user data');
          }
        } else {
          // Target user not found, clear impersonation
          console.warn('Impersonation target user not found, clearing impersonation');
          localStorage.removeItem('impersonation');
          setImpersonation(null);
          
          // Load actual current user
          const currentUser = await base44.auth.me();
          if (currentUser && currentUser.email) {
            setUser(currentUser);
            await loadUserPermissions(currentUser);
          } else {
            throw new Error('Invalid user data returned from auth.me()');
          }
        }
      } else {
        const currentUser = await base44.auth.me();
        if (currentUser && currentUser.email) {
          setUser(currentUser);
          setImpersonation(null);
          await loadUserPermissions(currentUser);
        } else {
          throw new Error('Invalid user data returned from auth.me()');
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
      // Clear all state on error
      setUser(null);
      setImpersonation(null);
      setUserPermissions([]);
      setBasePermissions([]);
      setAddonPermissions([]);
      setCustomRole(null);
    } finally {
      setLoading(false);
      setIsLoadingUser(false);
    }
  };

  const loadUserPermissions = async (userData) => {
    if (!userData) {
      setUserPermissions([]);
      setBasePermissions([]);
      setAddonPermissions([]);
      setCustomRole(null);
      return;
    }

    try {
      // Step 1: Get base permissions from app_role
      const baseRolePermissions = BASE_ROLE_PERMISSIONS[userData.app_role] || [];
      setBasePermissions(baseRolePermissions);

      // Step 2: If user has a custom role, load it and MERGE permissions (additive)
      let customRolePermissions = [];
      let loadedCustomRole = null;

      if (userData.custom_role_id) {
        // Cache custom roles to avoid repeated fetches
        const cachedRole = sessionStorage.getItem(`role_${userData.custom_role_id}`);
        if (cachedRole) {
          try {
            loadedCustomRole = JSON.parse(cachedRole);
            customRolePermissions = loadedCustomRole.permissions || [];
          } catch (e) {
            // Cache corrupted, fetch fresh
            const roles = await base44.entities.CustomRole.filter({ id: userData.custom_role_id });
            if (roles.length > 0) {
              loadedCustomRole = roles[0];
              customRolePermissions = loadedCustomRole.permissions || [];
              sessionStorage.setItem(`role_${userData.custom_role_id}`, JSON.stringify(loadedCustomRole));
            }
          }
        } else {
          const roles = await base44.entities.CustomRole.filter({ id: userData.custom_role_id });
          if (roles.length > 0) {
            loadedCustomRole = roles[0];
            customRolePermissions = loadedCustomRole.permissions || [];
            sessionStorage.setItem(`role_${userData.custom_role_id}`, JSON.stringify(loadedCustomRole));
          }
        }
      }

      setCustomRole(loadedCustomRole);
      setAddonPermissions(customRolePermissions);

      // Step 3: Merge base permissions with custom role permissions (deduplicated)
      const mergedPermissions = [...new Set([...baseRolePermissions, ...customRolePermissions])];
      setUserPermissions(mergedPermissions);

    } catch (error) {
      console.error('Error loading permissions:', error);
      // Fallback to base permissions only
      const baseRolePermissions = BASE_ROLE_PERMISSIONS[userData.app_role] || [];
      setUserPermissions(baseRolePermissions);
      setBasePermissions(baseRolePermissions);
      setAddonPermissions([]);
      setCustomRole(null);
    }
  };

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    
    // Platform Admin has all permissions
    if (user.app_role === 'Platform Admin') return true;
    
    // Check if user has wildcard permission
    if (userPermissions.includes('*')) return true;
    
    // Check specific permission
    return userPermissions.includes(permissionKey);
  };

  const hasAnyPermission = (permissionKeys) => {
    if (!Array.isArray(permissionKeys)) return false;
    return permissionKeys.some(key => hasPermission(key));
  };

  const hasAllPermissions = (permissionKeys) => {
    if (!Array.isArray(permissionKeys)) return false;
    return permissionKeys.every(key => hasPermission(key));
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const startImpersonation = async (userId) => {
    try {
      const { data } = await base44.functions.invoke('impersonateUser', { user_id: userId });
      localStorage.setItem('impersonation', JSON.stringify(data.impersonation));
      await loadUser();
      return { success: true };
    } catch (error) {
      console.error('Error starting impersonation:', error);
      return { success: false, error: error.message };
    }
  };

  const exitImpersonation = async () => {
    try {
      await base44.functions.invoke('exitImpersonation');
      localStorage.removeItem('impersonation');
      await loadUser();
      return { success: true };
    } catch (error) {
      console.error('Error exiting impersonation:', error);
      return { success: false, error: error.message };
    }
  };

  const appRole = user?.app_role || null;

  // Computed display name: prefer display_name over full_name
  const displayName = user?.display_name || user?.full_name || '';
  
  const roleDisplayName = customRole?.role_name || {
    'User Level 1': 'User',
    'User Level 2': 'Team Leader',
    'Analyst': 'Analyst',
    'Admin Level 1': 'Program Administrator',
    'Admin Level 2': 'HR Administrator',
    'Super Administrator': 'Super Administrator',
    'Partner Business Administrator': 'Partner Business Administrator',
    'Platform Admin': 'Platform Administrator'
  }[appRole] || appRole;

  const hasRole = (roles) => {
    if (!appRole) return false;
    if (typeof roles === 'string') return appRole === roles;
    if (Array.isArray(roles)) return roles.includes(appRole);
    return false;
  };

  const isPlatformAdmin = appRole === 'Platform Admin';
  const isPartnerBusinessAdmin = appRole === 'Partner Business Administrator';
  const isSuperAdmin = appRole === 'Super Administrator';
  const isUserLevel1 = appRole === 'User Level 1';
  const isManagerOfManagers = appRole === 'User Level 2';
  const isOrgLeader = appRole === 'Analyst';
  const isProgramManager = appRole === 'Admin Level 1';
  const isHRAdmin = appRole === 'Admin Level 2';
  
  const isAnyAdmin = isSuperAdmin || isHRAdmin || isProgramManager || isPartnerBusinessAdmin || isPlatformAdmin;
  const hasAdminAccess = isSuperAdmin || isHRAdmin;
  
  // Program Manager specific access checks
  const hasProgramManagerAccess = isProgramManager || 
    hasPermission('classes.view') || 
    hasPermission('coaching.view') || 
    hasPermission('programs.view');

  const getWhiteLabelData = (user, currentAppRole) => {
    const defaultBranding = {
      name: 'Base44 Platform',
      logoUrl: '/logos/base44-logo.svg',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
    };

    if (!user) {
      return defaultBranding;
    }

    if (currentAppRole === 'Partner Business Administrator') {
      if (user.partner_branding && typeof user.partner_branding === 'object') {
        return {
          ...defaultBranding,
          name: user.partner_branding.name || defaultBranding.name,
          logoUrl: user.partner_branding.logoUrl || defaultBranding.logoUrl,
          primaryColor: user.partner_branding.primaryColor || defaultBranding.primaryColor,
          secondaryColor: user.partner_branding.secondaryColor || defaultBranding.secondaryColor,
        };
      }
    }

    if (currentAppRole === 'Platform Admin' || currentAppRole === 'Super Administrator') {
      return defaultBranding;
    }

    return defaultBranding;
  };

  const whiteLabel = getWhiteLabelData(user, appRole);

  // Check if user has any team-level permissions (from addon or base role)
  const hasTeamAccess = hasPermission('team.dashboard.view') || 
                        hasPermission('team.assessments.view') ||
                        hasPermission('team.journeys.view') ||
                        hasPermission('team.performance.view') ||
                        hasPermission('team.insights.view') ||
                        hasPermission('team.development.view');

  // Check if user has any org-level analytics permissions
  const hasOrgAnalyticsAccess = hasPermission('analytics.view_org') ||
                                hasPermission('analytics.view_client') ||
                                hasPermission('analytics.assessments.view') ||
                                hasPermission('analytics.journeys.view') ||
                                hasPermission('analytics.performance.view') ||
                                hasPermission('analytics.insights.view');

  // Check if user has personal/user access (for admins with User Add-on)
  const hasPersonalAccess = hasPermission('personal.dashboard.view') ||
                            hasPermission('personal.assessments.view') ||
                            hasPermission('personal.journeys.view') ||
                            hasPermission('personal.development.view') ||
                            hasPermission('personal.performance.view') ||
                            hasPermission('personal.insights.view');

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      appRole, 
      displayName,
      roleDisplayName, 
      customRole,
      userPermissions,
      basePermissions,
      addonPermissions,
      hasRole,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isPlatformAdmin,
      isPartnerBusinessAdmin,
      isSuperAdmin,
      isUserLevel1,
      isManagerOfManagers,
      isOrgLeader,
      isProgramManager,
      isHRAdmin,
      isAnyAdmin,
      hasAdminAccess,
      hasProgramManagerAccess,
      hasTeamAccess,
      hasOrgAnalyticsAccess,
      hasPersonalAccess,
      impersonation,
      isImpersonating: !!impersonation,
      startImpersonation,
      exitImpersonation,
      refreshUser,
      reloadUser: loadUser,
      whiteLabel
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};