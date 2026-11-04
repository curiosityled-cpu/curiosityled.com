import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';

export const ClientContext = createContext(null);

export const ClientProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [client, setClient] = useState(null);
  const [stats, setStats] = useState({
    total_users: 0,
    total_goals: 0,
    total_assessments: 0,
    total_learning_assigned: 0
  });
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    if (!authLoading && user) {
      loadClientContext();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // force = true skips the 5-minute session cache. Must be used after a save,
  // otherwise the organisation settings screen reloads the pre-save record.
  const loadClientContext = async ({ force = false } = {}) => {
    try {
      // Which client this person belongs to is decided on the server
      // (base44/shared/tenantContext.ts). user.client_id is deliberately not
      // read here: it can disagree with user.data.client_id, and the browser
      // must never pick the tenant.
      const cacheKey = `client_context_${user.id || user.email}`;
      if (force) {
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}_timestamp`);
      }
      const cached = force ? null : sessionStorage.getItem(cacheKey);
      const cacheTimestamp = force ? null : sessionStorage.getItem(`${cacheKey}_timestamp`);
      
      if (cached && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < 5 * 60 * 1000) { // 5 minutes
          const cachedData = JSON.parse(cached);
          // A cached null client is treated as a miss — it was likely caused
          // by a transient fetch error and should not block the UI for 5 min.
          if (cachedData.client) {
            setClient(cachedData.client);
            setTenant(cachedData.tenant || null);
            setStats(cachedData.stats || {
              total_users: 0,
              total_goals: 0,
              total_assessments: 0,
              total_learning_assigned: 0
            });
            setLoading(false);
            return;
          }
        }
      }

      const response = await base44.functions.invoke('getClientContext');

      if (response?.data?.success !== false) {
        const responseData = response.data?.data || response.data;
        const contextData = {
          client: responseData.client || null,
          tenant: responseData.tenant || null,
          stats: responseData.stats || {
            total_users: 0,
            total_goals: 0,
            total_assessments: 0,
            total_learning_assigned: 0
          }
        };
        
        setClient(contextData.client);
        setTenant(contextData.tenant);
        setStats(contextData.stats);
        
        // Only cache non-null clients — caching a null (from a transient
        // rate-limit or fetch error) would hide the client for 5 minutes.
        if (contextData.client) {
          sessionStorage.setItem(cacheKey, JSON.stringify(contextData));
          sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        }
      } else {
        setClient(null);
        setStats({
          total_users: 0,
          total_goals: 0,
          total_assessments: 0,
          total_learning_assigned: 0
        });
      }
    } catch (error) {
      console.error('Error loading client context:', error);
      setClient(null);
      setStats({
        total_users: 0,
        total_goals: 0,
        total_assessments: 0,
        total_learning_assigned: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshContext = async () => {
    await loadClientContext({ force: true });
  };

  return (
    <ClientContext.Provider value={{ 
      client, 
      tenant,
      stats, 
      loading, 
      refreshContext 
    }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    // Return a safe default instead of throwing so components degrade
    // gracefully to a loading state when the provider is not in the tree.
    return {
      client: null,
      tenant: null,
      stats: { total_users: 0, total_goals: 0, total_assessments: 0, total_learning_assigned: 0 },
      loading: true,
      refreshContext: async () => {}
    };
  }
  return context;
};