import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';

const ClientContext = createContext(null);

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

  useEffect(() => {
    if (!authLoading && user) {
      loadClientContext();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadClientContext = async () => {
    try {
      // Only load client context if user has a client_id
      if (!user?.client_id) {
        setClient(null);
        setStats({
          total_users: 0,
          total_goals: 0,
          total_assessments: 0,
          total_learning_assigned: 0
        });
        setLoading(false);
        return;
      }

      // Check cache first (5 minute TTL)
      const cacheKey = `client_context_${user.client_id}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
      
      if (cached && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < 5 * 60 * 1000) { // 5 minutes
          const cachedData = JSON.parse(cached);
          setClient(cachedData.client || null);
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

      const response = await base44.functions.invoke('getClientContext');

      if (response?.data?.success !== false) {
        const responseData = response.data?.data || response.data;
        const contextData = {
          client: responseData.client || null,
          stats: responseData.stats || {
            total_users: 0,
            total_goals: 0,
            total_assessments: 0,
            total_learning_assigned: 0
          }
        };
        
        setClient(contextData.client);
        setStats(contextData.stats);
        
        // Cache the result
        sessionStorage.setItem(cacheKey, JSON.stringify(contextData));
        sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
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
    await loadClientContext();
  };

  return (
    <ClientContext.Provider value={{ 
      client, 
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
    throw new Error('useClient must be used within ClientProvider');
  }
  return context;
};