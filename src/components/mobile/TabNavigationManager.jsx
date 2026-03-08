import { useState, useEffect, useCallback } from 'react';

/**
 * Manages navigation history per tab for mobile bottom navigation
 * Each tab maintains its own history stack
 */
export function useTabNavigation(defaultTab = 'dashboard') {
  const [tabHistories, setTabHistories] = useState({
    dashboard: ['/'],
    experiences: ['/MyExperiences'],
    assessments: ['/Assessments'],
    development: ['/Development'],
    goals: ['/Performance'],
    insights: ['/Insights'],
    reports: ['/ReportBuilder']
  });
  
  const [currentTab, setCurrentTab] = useState(defaultTab);

  // Get current path for active tab
  const getCurrentPath = useCallback(() => {
    const history = tabHistories[currentTab] || ['/'];
    return history[history.length - 1];
  }, [currentTab, tabHistories]);

  // Navigate to a path within current tab
  const navigateInTab = useCallback((path, tab = currentTab) => {
    setTabHistories(prev => {
      const history = [...(prev[tab] || [])];
      
      // Don't add duplicate consecutive paths
      if (history[history.length - 1] !== path) {
        history.push(path);
      }
      
      return {
        ...prev,
        [tab]: history
      };
    });
  }, [currentTab]);

  // Switch to a different tab
  const switchTab = useCallback((tab) => {
    setCurrentTab(tab);
    
    // Return the last path for this tab
    const history = tabHistories[tab] || ['/'];
    return history[history.length - 1];
  }, [tabHistories]);

  // Go back within current tab
  const goBack = useCallback(() => {
    const history = tabHistories[currentTab] || [];
    
    if (history.length <= 1) {
      return null; // Can't go back further
    }
    
    setTabHistories(prev => ({
      ...prev,
      [currentTab]: history.slice(0, -1)
    }));
    
    return history[history.length - 2];
  }, [currentTab, tabHistories]);

  // Check if can go back in current tab
  const canGoBack = useCallback(() => {
    const history = tabHistories[currentTab] || [];
    return history.length > 1;
  }, [currentTab, tabHistories]);

  // Reset tab history
  const resetTab = useCallback((tab) => {
    setTabHistories(prev => ({
      ...prev,
      [tab]: [prev[tab]?.[0] || '/']
    }));
  }, []);

  return {
    currentTab,
    getCurrentPath,
    navigateInTab,
    switchTab,
    goBack,
    canGoBack,
    resetTab,
    tabHistories
  };
}