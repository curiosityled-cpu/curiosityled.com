import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { analytics } from '@heycatch/sdk';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

// "Proxy as user" records the admin's choice in localStorage; the platform
// session itself stays the admin's. Every screen — including the manager
// surface, which reads this context — has to render as the proxied person,
// so the target's profile replaces the admin's wherever the UI reads `user`.
const resolveImpersonatedUser = async (realUser) => {
  let raw = null;
  try {
    raw = localStorage.getItem('impersonation');
  } catch {
    return realUser;
  }
  if (!raw) return realUser;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.target_user_id) throw new Error('invalid impersonation');
    const targets = await base44.entities.User.filter({ id: parsed.target_user_id });
    if (targets?.length) return targets[0];
    localStorage.removeItem('impersonation');
  } catch (error) {
    console.error('Could not resolve proxy target, clearing:', error);
    localStorage.removeItem('impersonation');
  }
  return realUser;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const prevUserIdRef = useRef(null);

  useEffect(() => {
    checkAppState();
  }, []);

  useEffect(() => {
    if (user && user.id) {
      analytics.setIdentity(user.id, {
        email: user.email,
        name: user?.display_name || user?.data?.display_name || user?.full_name || '',
      });
      prevUserIdRef.current = user.id;
    } else if (prevUserIdRef.current && !user) {
      analytics.resetIdentity();
      prevUserIdRef.current = null;
    }
  }, [user]);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  // The platform does not expose sign-in times to the app, so the first
  // authenticated load of a browser session stamps the user's own record.
  // That is what "Last Login" in user management reports.
  const recordLogin = async (currentUser) => {
    if (!currentUser?.email) return;
    try {
      if (sessionStorage.getItem('cl_login_recorded')) return;
      sessionStorage.setItem('cl_login_recorded', '1');
    } catch {
      return;
    }
    try {
      const response = await base44.functions.invoke('recordUserLogin', {});
      const stamp = response.data?.last_login_date;
      if (stamp) {
        setUser(prev => (prev ? { ...prev, last_login_date: stamp } : prev));
      }
    } catch (error) {
      console.error('Could not record login time:', error);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const realUser = await base44.auth.me();
      const currentUser = await resolveImpersonatedUser(realUser);
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      recordLogin(realUser);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      displayName: user?.display_name || user?.data?.display_name || user?.full_name || '',
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      checkUserAuth,
      authChecked
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};