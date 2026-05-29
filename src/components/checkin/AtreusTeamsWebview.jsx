/**
 * AtreusTeamsWebview
 * 
 * Teams SDK wrapper for AtreusTeamsSettings.
 * Embeds the settings panel inside a Teams webview with proper authentication
 * and tab context awareness.
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AtreusTeamsSettings from './AtreusTeamsSettings';

export default function AtreusTeamsWebview() {
  const [teamsContext, setTeamsContext] = useState(null);
  const [teamsReady, setTeamsReady] = useState(false);

  useEffect(() => {
    // Load Teams SDK and initialize context
    if (typeof window !== 'undefined' && window.microsoftTeams) {
      window.microsoftTeams.initialize();
      
      // Get Teams context (user, theme, locale, etc.)
      window.microsoftTeams.getContext((context) => {
        setTeamsContext(context);
        setTeamsReady(true);
      });
    } else {
      // Fallback: if Teams SDK not available, still render settings (for web testing)
      setTeamsReady(true);
    }
  }, []);

  if (!teamsReady) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Apply Teams theme if available
  const themeClass = teamsContext?.theme === 'dark' ? 'dark' : 'light';

  return (
    <div className={themeClass}>
      <div className={teamsContext?.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}>
        {/* Teams-aware header */}
        {teamsContext && (
          <div className="border-b px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              {teamsContext.upn && `Signed in as: ${teamsContext.upn}`}
            </p>
          </div>
        )}

        {/* Settings component */}
        <AtreusTeamsSettings />

        {/* Teams footer (Teams app info) */}
        <div className="mt-8 px-6 py-4 text-xs text-gray-500 dark:text-gray-500 border-t">
          <p>
            Atreus Settings • Powered by Curiosity Led
            {teamsContext?.locale && ` • Language: ${teamsContext.locale}`}
          </p>
        </div>
      </div>
    </div>
  );
}