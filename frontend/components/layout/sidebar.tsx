'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Plus,
  ChevronLeft,
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

interface SidebarProps {
  analyses?: any[];
  onNewAnalysis?: () => void;
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/dashboard/repositories', icon: Folder, label: 'Repositories' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ analyses = [], onNewAnalysis }: SidebarProps) {
  const pathname = usePathname();
  const { user, sidebarOpen, setSidebarOpen, logout, currentWorkspace } = useStore();
  const [showAnalyses, setShowAnalyses] = useState(true);

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
        <div className="space-y-1">
          {navItems.map((item) => {
            let isActive: boolean;
            if ((item as any).exact) {
              isActive = pathname === item.href;
            } else if (item.href === '/dashboard/chat') {
              isActive = pathname.startsWith('/dashboard/chat');
            } else if (item.href === '/dashboard/repositories') {
              isActive = pathname.startsWith('/dashboard/repositories');
            } else {
              isActive = pathname.startsWith(item.href);
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>

        {/* Recent Analyses */}
        {sidebarOpen && analyses.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowAnalyses(!showAnalyses)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground-tertiary"
            >
              Recent Analyses
              <ChevronLeft
                className={cn(
                  'h-3 w-3 transition-transform',
                  showAnalyses && '-rotate-90'
                )}
              />
            </button>
            <AnimatePresence>
              {showAnalyses && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {analyses.slice(0, 10).map((analysis) => (
                    <Link
                      key={analysis.id}
                      href={`/dashboard/chat/${analysis.id}`}
                      className={cn(
                        'block truncate rounded-lg px-3 py-2 text-sm transition-colors',
                        pathname === `/dashboard/chat/${analysis.id}`
                          ? 'bg-background-tertiary text-foreground'
                          : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                      )}
                    >
                      {analysis.title}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
