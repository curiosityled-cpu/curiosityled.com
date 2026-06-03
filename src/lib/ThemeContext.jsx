import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ isDark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('cl_theme');
      const dark = stored !== null ? stored === 'dark' : true; // default dark
      // Apply synchronously to avoid flash of wrong theme
      document.documentElement.classList.toggle('dark', dark);
      return dark;
    } catch {
      document.documentElement.classList.add('dark');
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('cl_theme', isDark ? 'dark' : 'light'); } catch {}
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);