'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Settings,
  Plus,
  ChevronLeft,
  ChevronDown,
  Users,
  LogOut,
  LayoutDashboard,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Logo, LogoIcon } from '@/components/ui/logo';
import { Menu, MenuItem, MenuDivider } from '@/components/ui/dropdown';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

interface SidebarProps {
  analyses?: any[];
  onNewAnalysis?: () => void;
}

export function Sidebar({ analyses = [], onNewAnalysis }: SidebarProps) {
  const pathname = usePathname();
  const { user, sidebarOpen, setSidebarOpen, logout, currentWorkspace } = useStore();
  const [showChats, setShowChats] = useState(true);
  const [showRepositories, setShowRepositories] = useState(true);
  const [repositories, setRepositories] = useState<any[]>([]);

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const { repositories } = await api.getRepositories();
        setRepositories(repositories);
      } catch (error) {
        console.error('Failed to fetch repositories:', error);
      }
    };
    fetchRepositories();
  }, []);

  const isDashboardActive = pathname === '/dashboard';
  const isSettingsActive = pathname.startsWith('/dashboard/settings');

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 280 : 72 }}
      className="flex h-screen flex-col border-r border-border bg-background-secondary"
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          {sidebarOpen ? (
            <Logo size="sm" />
          ) : (
            <LogoIcon size={36} />
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-foreground-tertiary"
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              !sidebarOpen && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* New Analysis Button */}
      <div className="px-3 py-2">
        <Button
          onClick={onNewAnalysis}
          className={cn('w-full', !sidebarOpen && 'px-0')}
        >
          <Plus className="h-4 w-4" />
          {sidebarOpen && <span>New Analysis</span>}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isDashboardActive
              ? 'bg-primary/10 text-primary'
              : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Dashboard
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Chats Section */}
        <div className="mt-4">
          <button
            onClick={() => setShowChats(!showChats)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/chat')
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
            )}
          >
            <MessageSquare className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && (
              <>
                <span className="flex-1 text-left">Chats</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    !showChats && '-rotate-90'
                  )}
                />
              </>
            )}
          </button>

          <AnimatePresence>
            {sidebarOpen && showChats && analyses.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-4 mt-1 space-y-1 overflow-hidden border-l border-border pl-3"
              >
                {analyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    href={`/dashboard/chat/${analysis.id}`}
                    className={cn(
                      'block truncate rounded-lg px-3 py-1.5 text-sm transition-colors',
                      pathname === `/dashboard/chat/${analysis.id}`
                        ? 'bg-background-tertiary text-foreground'
                        : 'text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground'
                    )}
                  >
                    {analysis.title}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Repositories Section */}
        <div className="mt-2">
          <button
            onClick={() => setShowRepositories(!showRepositories)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/repositories')
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
            )}
          >
            <Folder className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && (
              <>
                <span className="flex-1 text-left">Repositories</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    !showRepositories && '-rotate-90'
                  )}
                />
              </>
            )}
          </button>

          <AnimatePresence>
            {sidebarOpen && showRepositories && repositories.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-4 mt-1 space-y-1 overflow-hidden border-l border-border pl-3"
              >
                {repositories.map((repo) => (
                  <Link
                    key={repo.id}
                    href={`/dashboard/repositories/${repo.id}`}
                    className={cn(
                      'flex items-center gap-2 truncate rounded-lg px-3 py-1.5 text-sm transition-colors',
                      pathname === `/dashboard/repositories/${repo.id}`
                        ? 'bg-background-tertiary text-foreground'
                        : 'text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground'
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: repo.color || '#7C9FF5' }}
                    />
                    <span className="truncate">{repo.name}</span>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings Link */}
        <div className="mt-2">
          <Link
            href="/dashboard/settings"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isSettingsActive
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </nav>

      {/* Workspace Selector */}
      {sidebarOpen && currentWorkspace && (
        <div className="border-t border-border px-3 py-2">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background-tertiary hover:text-foreground"
          >
            <Users className="h-4 w-4" />
            <span className="truncate">{currentWorkspace.name}</span>
          </Link>
        </div>
      )}

      {/* User Menu */}
      <div className="border-t border-border p-3">
        <Menu
          trigger={
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-background-tertiary">
              <Avatar name={user?.name || 'User'} size="sm" />
              {sidebarOpen && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-foreground-tertiary truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </button>
          }
          align="left"
        >
          <MenuItem icon={<Settings className="h-4 w-4" />}>Settings</MenuItem>
          <MenuDivider />
          <MenuItem
            icon={<LogOut className="h-4 w-4" />}
            variant="danger"
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
          >
            Log out
          </MenuItem>
        </Menu>
      </div>
    </motion.aside>
  );
}
