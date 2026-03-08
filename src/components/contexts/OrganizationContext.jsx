import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';

const OrganizationContext = createContext(null);

export const OrganizationProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      loadOrganizationContext();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadOrganizationContext = async () => {
    try {
      const { data } = await base44.functions.invoke('getClientContext');
      setOrganization(data.client);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading client context:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshContext = async () => {
    await loadOrganizationContext();
  };

  return (
    <OrganizationContext.Provider value={{ 
      organization, 
      stats, 
      loading, 
      refreshContext 
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};