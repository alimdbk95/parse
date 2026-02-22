'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/sidebar';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { BrandingProvider } from '@/components/providers/branding-provider';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    setUser,
    setWorkspaces,
    setCurrentWorkspace,
    setAnalyses,
    isMobile,
    sidebarOpen,
    setSidebarOpen,
  } = useStore();
  const [loading, setLoading] = useState(true);
  const [analyses, setLocalAnalyses] = useState<any[]>([]);

  // Touch handling for swipe gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && !sidebarOpen && touchStart < 30) {
      setSidebarOpen(true);
    }
    if (isLeftSwipe && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [touchStart, touchEnd, sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = api.getToken();

      if (!storedToken) {
        router.push('/login');
        return;
      }

      try {
        const { user, workspaces } = await api.getMe();
        setUser(user);
        setWorkspaces(workspaces);
        if (workspaces.length > 0) {
          setCurrentWorkspace(workspaces[0]);
        }

        // Fetch analyses
        const { analyses } = await api.getAnalyses();
        setAnalyses(analyses);
        setLocalAnalyses(analyses);
      } catch (error) {
        console.error('Auth check failed:', error);
        api.setToken(null);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [router, setUser, setWorkspaces, setCurrentWorkspace, setAnalyses]);

  const handleNewAnalysis = async () => {
    try {
      const { analysis } = await api.createAnalysis({
        title: 'New Analysis',
      });
      setLocalAnalyses((prev) => [analysis, ...prev]);
      if (isMobile) setSidebarOpen(false);
      router.push(`/dashboard/chat/${analysis.id}`);
    } catch (error) {
      console.error('Failed to create analysis:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-foreground-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrandingProvider>
      <div
        className="flex h-[100dvh] bg-background overflow-hidden"
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchMove={isMobile ? onTouchMove : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
      >
        {/* Mobile Header - Claude style */}
        <AnimatePresence>
          {isMobile && (
            <motion.header
              initial={{ y: -56 }}
              animate={{ y: 0 }}
              className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-md px-3 safe-area-top"
            >
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-background-tertiary active:scale-95 transition-all"
                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              >
                <AnimatePresence mode="wait">
                  {sidebarOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
                  <span className="text-xs font-bold text-white">P</span>
                </div>
                <span className="text-sm font-semibold">Parse</span>
              </div>

              <button
                onClick={handleNewAnalysis}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-background-tertiary active:scale-95 transition-all"
                aria-label="New analysis"
              >
                <Plus className="h-5 w-5" />
              </button>
            </motion.header>
          )}
        </AnimatePresence>

        {/* Sidebar Overlay for Mobile - smooth fade */}
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar - slide in from left on mobile */}
        <motion.div
          className={cn(
            'z-50 flex-shrink-0',
            isMobile && 'fixed inset-y-0 left-0'
          )}
          initial={isMobile ? { x: '-100%' } : false}
          animate={isMobile ? { x: sidebarOpen ? 0 : '-100%' } : {}}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <Sidebar
            analyses={analyses}
            onNewAnalysis={handleNewAnalysis}
          />
        </motion.div>

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 overflow-hidden flex flex-col',
            isMobile && 'pt-14'
          )}
        >
          {children}
        </main>
      </div>
    </BrandingProvider>
  );
}
