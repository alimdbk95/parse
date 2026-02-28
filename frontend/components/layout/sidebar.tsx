'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Search,
  Command,
  Layout,
  Brain,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Logo, LogoIcon } from '@/components/ui/logo';
import { Menu, MenuItem, MenuDivider } from '@/components/ui/dropdown';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

interface SidebarProps {
  analyses?: any[];
  onNewAnalysis?: () => void;
  onOpenSearch?: () => void;
}

export function Sidebar({ analyses = [], onNewAnalysis, onOpenSearch }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, sidebarOpen, setSidebarOpen, logout, currentWorkspace, workspaces, setCurrentWorkspace, isMobile } = useStore();
  const [showChats, setShowChats] = useState(true);
  const [showRepositories, setShowRepositories] = useState(true);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close workspace dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(event.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
    };

    if (showWorkspaceDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWorkspaceDropdown]);

  const isDashboardActive = pathname === '/dashboard';
  const isSettingsActive = pathname.startsWith('/dashboard/settings');

  const handleLinkClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleWorkspaceSwitch = (workspace: any) => {
    setCurrentWorkspace(workspace);
    setShowWorkspaceDropdown(false);
    // Navigate to dashboard when switching workspaces
    router.push('/dashboard');
  };

  const handleCreateWorkspace = () => {
    setShowWorkspaceDropdown(false);
    router.push('/dashboard/settings?tab=workspace&action=create');
  };

  // Get other workspaces (excluding current)
  const otherWorkspaces = workspaces.filter(w => w.id !== currentWorkspace?.id);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? '85vw' : sidebarOpen ? 280 : 72 }}
      className={cn(
        "flex flex-col border-r border-border bg-background-secondary",
        isMobile ? "h-[100dvh] max-w-[320px] pt-14 safe-area-top" : "h-screen"
      )}
    >
      {/* Header - hidden on mobile (using top header instead) */}
      {!isMobile && (
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            {sidebarOpen ? (
              <Logo size="sm" />
            ) : (
              <LogoIcon size={36} />
            )}
          </Link>
          <div className="flex items-center gap-1">
            {sidebarOpen && <NotificationCenter />}
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
        </div>
      )}

      {/* Workspace Name with Dropdown */}
      <div ref={workspaceDropdownRef} className="px-3 py-2 relative">
        {sidebarOpen ? (
          <button
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-background-tertiary/50 hover:bg-background-tertiary transition-colors"
          >
            <Users className="h-4 w-4 text-foreground-secondary flex-shrink-0" />
            <span className="text-sm font-medium truncate flex-1 text-left">{currentWorkspace?.name || 'Workspace'}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-foreground-tertiary transition-transform',
                showWorkspaceDropdown && 'rotate-180'
              )}
            />
          </button>
        ) : (
          <button
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="flex items-center justify-center w-full"
          >
            <div className="h-9 w-9 rounded-lg bg-background-tertiary/50 hover:bg-background-tertiary transition-colors flex items-center justify-center">
              <Users className="h-4 w-4 text-foreground-secondary" />
            </div>
          </button>
        )}

        {/* Workspace Dropdown */}
        <AnimatePresence>
          {showWorkspaceDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-50 mt-1 py-1 rounded-lg border border-border bg-background-secondary shadow-lg",
                sidebarOpen ? "left-3 right-3" : "left-0 w-48"
              )}
            >
              {/* Other workspaces */}
              {otherWorkspaces.length > 0 && (
                <>
                  <div className="px-3 py-1.5">
                    <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Switch Workspace</span>
                  </div>
                  {otherWorkspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => handleWorkspaceSwitch(workspace)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-secondary hover:bg-background-tertiary hover:text-foreground transition-colors"
                    >
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{workspace.name}</span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-border" />
                </>
              )}

              {/* Create new workspace CTA */}
              <button
                onClick={handleCreateWorkspace}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="truncate flex-1 text-left">Create New Workspace</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Button */}
      <div className="px-3 py-1">
        <button
          onClick={onOpenSearch}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-background-tertiary/30 hover:bg-background-tertiary transition-colors text-foreground-tertiary hover:text-foreground",
            !sidebarOpen && "px-0 justify-center"
          )}
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          {sidebarOpen && (
            <>
              <span className="flex-1 text-left text-sm">Search...</span>
              <div className="flex items-center gap-0.5 text-xs opacity-60">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </>
          )}
        </button>
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
          onClick={handleLinkClick}
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

        {/* Conversations Section */}
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
                <span className="flex-1 text-left">Conversations</span>
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
                    onClick={handleLinkClick}
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
                    onClick={handleLinkClick}
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

        {/* Templates Link */}
        <div className="mt-2">
          <Link
            href="/dashboard/templates"
            onClick={handleLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/templates')
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
            )}
          >
            <Layout className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Templates
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Semantic Analysis Link */}
        <div className="mt-2">
          <Link
            href="/dashboard/insights"
            onClick={handleLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/insights')
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
            )}
          >
            <Brain className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Insights
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Experiment Design Link */}
        <div className="mt-2">
          <Link
            href="/dashboard/experiments"
            onClick={handleLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/experiments')
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
            )}
          >
            <FlaskConical className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Experiment Design
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Settings Link */}
        <div className="mt-2">
          <Link
            href="/dashboard/settings"
            onClick={handleLinkClick}
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
