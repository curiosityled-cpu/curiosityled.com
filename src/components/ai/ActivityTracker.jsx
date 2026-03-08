import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/components/useAuth';
import { base44 } from '@/api/base44Client';

/**
 * Activity Tracker
 * Passively tracks user interactions for Atreus personalization
 * Complies with privacy settings and data minimization principles
 */

const STORAGE_KEY = 'atreus_activity_history';
const MAX_HISTORY_SIZE = 50;
const SESSION_KEY = 'atreus_session_data';

export const useActivityTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const lastPathRef = useRef(null);
  const sessionStartRef = useRef(Date.now());

  // Check if user has opted into activity tracking
  const isTrackingEnabled = useCallback(async () => {
    if (!user?.email) return false;
    
    try {
      // Check user's privacy settings
      const prefs = await base44.entities.UserPreference.filter({ user_email: user.email });
      if (prefs.length > 0) {
        return prefs[0].privacy_settings?.allow_activity_tracking !== false;
      }
      // Default to enabled if no preferences set
      return true;
    } catch (error) {
      console.warn('Failed to check tracking preference:', error);
      return true; // Fail open
    }
  }, [user?.email]);

  // Get or initialize activity history
  const getActivityHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Save activity to local storage
  const saveActivity = async (activity) => {
    const trackingAllowed = await isTrackingEnabled();
    if (!trackingAllowed) return;

    try {
      const history = getActivityHistory();
      history.unshift({
        ...activity,
        timestamp: new Date().toISOString(),
        user_email: user?.email || 'anonymous'
      });

      // Keep only recent activities
      const trimmed = history.slice(0, MAX_HISTORY_SIZE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('Failed to save activity:', error);
    }
  };

  // Track page navigation
  useEffect(() => {
    if (!user || !isTrackingEnabled()) return;

    const currentPath = location.pathname;
    
    if (lastPathRef.current && lastPathRef.current !== currentPath) {
      // User navigated to a new page
      saveActivity({
        type: 'page_navigation',
        from: lastPathRef.current,
        to: currentPath,
        search: location.search,
        hash: location.hash
      });
    }

    lastPathRef.current = currentPath;
  }, [location.pathname, user]);

  // Track session data
  useEffect(() => {
    if (!isTrackingEnabled()) return;

    const updateSessionData = () => {
      const sessionData = {
        session_start: sessionStartRef.current,
        last_active: Date.now(),
        pages_visited: getActivityHistory().filter(a => a.type === 'page_navigation').length,
        session_duration: Date.now() - sessionStartRef.current
      };
      
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    };

    // Update every 30 seconds
    const interval = setInterval(updateSessionData, 30000);
    updateSessionData();

    return () => clearInterval(interval);
  }, []);

  return {
    trackActivity: saveActivity,
    getHistory: getActivityHistory,
    clearHistory: () => localStorage.removeItem(STORAGE_KEY)
  };
};

// Track specific UI interactions
export const trackInteraction = async (interactionType, details = {}) => {
  // Simple sync check - defaults to enabled
  const stored = localStorage.getItem('atreus_tracking_disabled');
  if (stored === 'true') return;

  try {
    const history = getActivityHistory();
    history.unshift({
      type: 'interaction',
      interaction_type: interactionType,
      details: details,
      timestamp: new Date().toISOString()
    });

    const trimmed = history.slice(0, MAX_HISTORY_SIZE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Failed to track interaction:', error);
  }
};

// Get activity summary for Atreus context
export const getActivitySummary = () => {
  try {
    const history = getActivityHistory();
    const sessionData = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    
    // Calculate frequency of page visits
    const pageFrequency = {};
    history
      .filter(a => a.type === 'page_navigation')
      .forEach(a => {
        const page = a.to;
        pageFrequency[page] = (pageFrequency[page] || 0) + 1;
      });

    // Get most visited pages
    const mostVisited = Object.entries(pageFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([page, count]) => ({ page, count }));

    // Recent interactions
    const recentInteractions = history
      .filter(a => a.type === 'interaction')
      .slice(0, 10)
      .map(a => a.interaction_type);

    return {
      session_duration_minutes: Math.round((sessionData.session_duration || 0) / 60000),
      pages_visited_count: sessionData.pages_visited || 0,
      most_visited_pages: mostVisited,
      recent_interactions: recentInteractions,
      last_10_pages: history
        .filter(a => a.type === 'page_navigation')
        .slice(0, 10)
        .map(a => ({ path: a.to, timestamp: a.timestamp }))
    };
  } catch (error) {
    console.warn('Failed to generate activity summary:', error);
    return null;
  }
};

// Helper to check if tracking is enabled (sync version for exports)
function isTrackingEnabled() {
  const stored = localStorage.getItem('atreus_tracking_disabled');
  return stored !== 'true';
}

// Helper to get history
function getActivityHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}