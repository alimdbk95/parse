'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
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
      <div className="flex h-screen bg-background">
        {/* Mobile Header */}
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background-secondary px-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-background-tertiary"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm font-medium">Parse</span>
            <div className="w-10" />
          </div>
        )}

        {/* Sidebar Overlay for Mobile */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            'z-50',
            isMobile && 'fixed inset-y-0 left-0 transition-transform duration-300',
            isMobile && !sidebarOpen && '-translate-x-full'
          )}
        >
          <Sidebar analyses={analyses} onNewAnalysis={handleNewAnalysis} />
        </div>

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 overflow-hidden',
            isMobile && 'pt-14'
          )}
        >
          {children}
        </main>
      </div>
    </BrandingProvider>
  );
}
