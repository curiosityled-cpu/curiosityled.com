import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { User, Users, Building2 } from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { SECTION_VIEW_CONFIG, VIEW_SCOPES, VIEW_PREFERENCES_KEY } from "@/components/constants/permissions";
import { motion } from "framer-motion";

/**
 * ViewToggle Component
 * 
 * Displays a toggle for switching between My/Team/Org views based on user permissions.
 * Only shows toggles for views the user has permission to access.
 * Persists the selected view in localStorage.
 * 
 * @param {string} section - The section identifier (e.g., 'dashboard', 'journeys', etc.)
 * @param {string} currentView - The currently active view scope ('my', 'team', 'org')
 * @param {function} onViewChange - Callback when view changes: (newView) => void
 * @param {string} className - Additional CSS classes
 */
export default function ViewToggle({ 
  section, 
  currentView, 
  onViewChange, 
  className = '' 
}) {
  const { hasPermission } = useAuth();
  
  const config = SECTION_VIEW_CONFIG[section];
  
  if (!config) {
    console.warn(`ViewToggle: Unknown section "${section}"`);
    return null;
  }

  // Memoize available views to prevent recalculation on every render
  const availableViews = useMemo(() => {
    return Object.entries(config.views).filter(([key, viewConfig]) => {
      // 'my' view is always available
      if (key === VIEW_SCOPES.MY) return true;
      // Other views require the specified permission
      return viewConfig.permission && hasPermission(viewConfig.permission);
    });
  }, [config.views, hasPermission]);

  // If only "My" view is available, don't render the toggle at all
  if (availableViews.length <= 1) {
    return null;
  }

  // Handle view change
  const handleViewChange = (newView) => {
    // Save to localStorage
    const savedPreferences = localStorage.getItem(VIEW_PREFERENCES_KEY);
    let preferences = {};
    try {
      preferences = savedPreferences ? JSON.parse(savedPreferences) : {};
    } catch (e) {
      preferences = {};
    }
    preferences[section] = newView;
    localStorage.setItem(VIEW_PREFERENCES_KEY, JSON.stringify(preferences));
    
    // Notify parent
    onViewChange(newView);
  };

  const getViewIcon = (viewKey) => {
    switch (viewKey) {
      case VIEW_SCOPES.MY:
        return <User className="w-4 h-4" />;
      case VIEW_SCOPES.TEAM:
        return <Users className="w-4 h-4" />;
      case VIEW_SCOPES.ORG:
        return <Building2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getViewColor = (viewKey, isActive) => {
    if (!isActive) return '';
    switch (viewKey) {
      case VIEW_SCOPES.MY:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case VIEW_SCOPES.TEAM:
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case VIEW_SCOPES.ORG:
        return 'bg-purple-100 text-purple-700 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-1 p-1 bg-gray-100 rounded-lg ${className}`}
    >
      {availableViews.map(([viewKey, viewConfig]) => {
        const isActive = currentView === viewKey;
        
        return (
          <Button
            key={viewKey}
            variant="ghost"
            size="sm"
            onClick={() => handleViewChange(viewKey)}
            className={`
              relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-all
              ${isActive 
                ? `${getViewColor(viewKey, true)} shadow-sm font-medium` 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }
            `}
          >
            {getViewIcon(viewKey)}
            <span className="text-sm">{viewConfig.label}</span>
            
            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId={`view-indicator-${section}`}
                className="absolute inset-0 rounded-md border-2"
                style={{ borderColor: 'currentColor', opacity: 0.3 }}
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Button>
        );
      })}
    </motion.div>
  );
}

/**
 * Hook to manage view state with persistence
 * 
 * @param {string} section - The section identifier
 * @param {string} defaultView - Default view if none saved (default: 'my')
 * @returns {[string, function]} - [currentView, setCurrentView]
 */
export function useViewToggle(section, defaultView = VIEW_SCOPES.MY) {
  const { hasPermission, loading } = useAuth();
  const [currentView, setCurrentView] = useState(defaultView);
  const [initialized, setInitialized] = useState(false);

  // Load saved preference on mount - wait for auth to be ready
  useEffect(() => {
    // Wait until auth is loaded before checking permissions
    if (loading) return;
    
    const savedPreferences = localStorage.getItem(VIEW_PREFERENCES_KEY);
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        const savedView = preferences[section];
        
        if (savedView) {
          // Verify user still has permission for saved view
          const config = SECTION_VIEW_CONFIG[section];
          if (config) {
            const viewConfig = config.views[savedView];
            // 'my' view is always allowed, others need permission check
            if (savedView === VIEW_SCOPES.MY || 
                (viewConfig && (!viewConfig.permission || hasPermission(viewConfig.permission)))) {
              setCurrentView(savedView);
              setInitialized(true);
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error loading view preferences:', e);
      }
    }
    
    // Default to 'my' view
    setCurrentView(defaultView);
    setInitialized(true);
  }, [section, hasPermission, defaultView, loading]);

  // Wrap setCurrentView to also persist
  const setView = (newView) => {
    try {
      const savedPreferences = localStorage.getItem(VIEW_PREFERENCES_KEY);
      let preferences = {};
      try {
        preferences = savedPreferences ? JSON.parse(savedPreferences) : {};
      } catch (e) {
        preferences = {};
      }
      preferences[section] = newView;
      localStorage.setItem(VIEW_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Error saving view preference:', e);
    }
    setCurrentView(newView);
  };

  return [currentView, setView];
}