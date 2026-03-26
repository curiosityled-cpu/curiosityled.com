import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';

const CompetencyContext = createContext(null);

export const CompetencyProvider = ({ children }) => {
  const { user } = useAuth();
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [selectedCompetencies, setSelectedCompetencies] = useState([]);
  const [competenciesConfigured, setCompetenciesConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);

  const loadCompetencies = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check cache first (10 minute TTL for competencies since they change rarely)
      const cacheKey = `competencies_${user.client_id || 'platform'}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
      
      if (cached && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < 10 * 60 * 1000) { // 10 minutes
          const cachedData = JSON.parse(cached);
          setAllCompetencies(cachedData.allCompetencies || []);
          setSelectedCompetencies(cachedData.selectedCompetencies || []);
          setCompetenciesConfigured(cachedData.competenciesConfigured || false);
          setClient(cachedData.client || null);
          setLoading(false);
          return;
        }
      }

      // Load all platform competencies
      const competencies = await base44.entities.Competency.filter({
        is_platform_default: true
      });
      setAllCompetencies(competencies || []);

      let clientData = null;
      let selectedComps = [];
      let configured = false;

      // Load client's selected competencies if user has client_id
      if (user.client_id) {
        const clients = await base44.entities.Client.filter({ id: user.client_id });
        if (clients.length > 0) {
          clientData = clients[0];
          setClient(clientData);
          configured = clientData.competencies_configured || false;
          setCompetenciesConfigured(configured);

          if (clientData.selected_competency_ids && clientData.selected_competency_ids.length > 0) {
            // Filter competencies to only those selected by the organization
            selectedComps = competencies.filter(c => 
              clientData.selected_competency_ids.includes(c.id)
            );
            setSelectedCompetencies(selectedComps);
          } else {
            // Default: Show first 5 competencies if not configured
            selectedComps = competencies.slice(0, 5);
            setSelectedCompetencies(selectedComps);
          }
        } else {
          // No client found, show first 5 as default
          selectedComps = competencies.slice(0, 5);
          setSelectedCompetencies(selectedComps);
        }
      } else {
        // Platform admin or no client - show all
        selectedComps = competencies;
        configured = true;
        setSelectedCompetencies(competencies);
        setCompetenciesConfigured(true);
      }

      // Cache the results
      sessionStorage.setItem(cacheKey, JSON.stringify({
        allCompetencies: competencies || [],
        selectedCompetencies: selectedComps,
        competenciesConfigured: configured,
        client: clientData
      }));
      sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (error) {
      console.error('Error loading competencies:', error);
      setAllCompetencies([]);
      setSelectedCompetencies([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCompetencies();
  }, [loadCompetencies]);

  const refreshCompetencies = async () => {
    setLoading(true);
    await loadCompetencies();
  };

  // Update selected competencies (for admin use)
  const updateSelectedCompetencies = async (competencyIds) => {
    if (!client) {
      // Platform Admins have no client — save directly to competency records or just update local state
      // For Platform Admin, competencies are always "all", so just refresh
      return { success: false, error: 'No client record found. Platform Admins use all competencies by default — select an org client to configure per-client competencies.' };
    }

    try {
      await base44.entities.Client.update(client.id, {
        selected_competency_ids: competencyIds,
        competencies_configured: true
      });

      // Refresh context
      await refreshCompetencies();
      return { success: true };
    } catch (error) {
      console.error('Error updating competencies:', error);
      return { success: false, error: error.message };
    }
  };

  // Get competency by ID
  const getCompetencyById = (id) => {
    return allCompetencies.find(c => c.id === id);
  };

  // Get competency by name
  const getCompetencyByName = (name) => {
    return allCompetencies.find(c => c.name.toLowerCase() === name.toLowerCase());
  };

  // Check if a competency is in the organization's selected list
  const isCompetencySelected = (competencyId) => {
    return selectedCompetencies.some(c => c.id === competencyId);
  };

  // Filter any list of competencies to only show selected ones
  const filterToSelectedCompetencies = (competencyList) => {
    if (!competencyList) return [];
    const selectedIds = selectedCompetencies.map(c => c.id);
    return competencyList.filter(c => selectedIds.includes(c.id));
  };

  // Get Situational Intelligence competency (always included)
  const getSituationalIntelligence = () => {
    return allCompetencies.find(c => 
      c.category === 'Situational Intelligence' || 
      c.name.toLowerCase().includes('situational intelligence')
    );
  };

  return (
    <CompetencyContext.Provider value={{
      // Data
      allCompetencies,
      selectedCompetencies,
      competenciesConfigured,
      loading,
      client,
      
      // Actions
      refreshCompetencies,
      updateSelectedCompetencies,
      
      // Helpers
      getCompetencyById,
      getCompetencyByName,
      isCompetencySelected,
      filterToSelectedCompetencies,
      getSituationalIntelligence
    }}>
      {children}
    </CompetencyContext.Provider>
  );
};

export const useCompetencies = () => {
  const context = useContext(CompetencyContext);
  if (!context) {
    throw new Error('useCompetencies must be used within a CompetencyProvider');
  }
  return context;
};

export default CompetencyContext;