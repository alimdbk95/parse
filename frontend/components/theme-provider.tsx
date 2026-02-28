'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useStore();

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;

    // Remove all theme attributes first
    root.removeAttribute('data-theme');

    // Apply the current theme
    if (theme !== 'dark') {
      root.setAttribute('data-theme', theme);
    }

    // Also update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors = {
        dark: '#0a0a0f',
        light: '#fafafa',
        accessible: '#000000',
      };
      metaThemeColor.setAttribute('content', colors[theme]);
    }
  }, [theme]);

  return <>{children}</>;
}

// Theme hook for easy access
export function useTheme() {
  const { theme, setTheme } = useStore();

  const toggleTheme = () => {
    const themes: Array<'dark' | 'light' | 'accessible'> = ['dark', 'light', 'accessible'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isAccessible: theme === 'accessible',
  };
}
