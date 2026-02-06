'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    isAuthenticated,
    token,
    setUser,
    setWorkspaces,
    setCurrentWorkspace,
    setAnalyses,
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
    <div className="flex h-screen bg-background">
      <Sidebar analyses={analyses} onNewAnalysis={handleNewAnalysis} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
