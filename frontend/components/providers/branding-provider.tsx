'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const branding = useStore((state) => state.branding);
  const setBranding = useStore((state) => state.setBranding);
  const setIsMobile = useStore((state) => state.setIsMobile);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);

  // Load branding settings on mount
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const { branding: savedBranding } = await api.getBranding();
        if (savedBranding) {
          setBranding({
            primaryColor: savedBranding.primaryColor || undefined,
            accentColor: savedBranding.accentColor || undefined,
            textColor: savedBranding.textColor || undefined,
            backgroundColor: savedBranding.backgroundColor || undefined,
            chartColors: savedBranding.colors || undefined,
            font: savedBranding.font || undefined,
            fontSize: savedBranding.fontSize || undefined,
            chartBackground: savedBranding.chartBackground || undefined,
          });
        }
      } catch (error) {
        // Silently fail - use defaults
        console.error('Failed to load branding:', error);
      }
    };

    loadBranding();
  }, [setBranding]);

  // Apply CSS variables when branding changes
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--brand-accent', branding.accentColor);
    root.style.setProperty('--brand-text', branding.textColor);
    root.style.setProperty('--brand-background', branding.backgroundColor);
    root.style.setProperty('--brand-font', branding.font);

    // Set chart colors
    branding.chartColors.forEach((color, index) => {
      root.style.setProperty(`--chart-color-${index + 1}`, color);
    });
  }, [branding]);

  // Handle responsive detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Auto-close sidebar on mobile when it opens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    handleResize();
  }, [sidebarOpen, setSidebarOpen]);

  return <>{children}</>;
}
