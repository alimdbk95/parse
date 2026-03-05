'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  MessageSquare,
  Settings,
  Plus,
  FolderOpen,
  BarChart2,
  Upload,
  LogOut,
  Moon,
  Sun,
  Home,
  FlaskConical,
  Layout,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string[];
  action: () => void;
  category: 'navigation' | 'actions' | 'settings';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewAnalysis?: () => void;
  onUpload?: () => void;
  onToggleTheme?: () => void;
  onLogout?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNewAnalysis,
  onUpload,
  onToggleTheme,
  onLogout,
}: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'home',
        label: 'Go to Dashboard',
        icon: <Home className="w-4 h-4" />,
        shortcut: ['G', 'H'],
        action: () => router.push('/dashboard'),
        category: 'navigation',
      },
      {
        id: 'documents',
        label: 'Go to Documents',
        icon: <FileText className="w-4 h-4" />,
        shortcut: ['G', 'D'],
        action: () => router.push('/dashboard/documents'),
        category: 'navigation',
      },
      {
        id: 'repositories',
        label: 'Go to Repositories',
        icon: <FolderOpen className="w-4 h-4" />,
        action: () => router.push('/dashboard/repositories'),
        category: 'navigation',
      },
      {
        id: 'experiments',
        label: 'Go to Experiments',
        icon: <FlaskConical className="w-4 h-4" />,
        action: () => router.push('/dashboard/experiments'),
        category: 'navigation',
      },
      {
        id: 'templates',
        label: 'Go to Templates',
        icon: <Layout className="w-4 h-4" />,
        action: () => router.push('/dashboard/templates'),
        category: 'navigation',
      },
      {
        id: 'settings',
        label: 'Go to Settings',
        icon: <Settings className="w-4 h-4" />,
        shortcut: ['G', 'S'],
        action: () => router.push('/dashboard/settings'),
        category: 'navigation',
      },
      // Actions
      {
        id: 'new-analysis',
        label: 'New Analysis',
        description: 'Start a new AI-powered analysis',
        icon: <Plus className="w-4 h-4" />,
        shortcut: ['⌘', 'N'],
        action: () => onNewAnalysis?.(),
        category: 'actions',
      },
      {
        id: 'upload',
        label: 'Upload Document',
        description: 'Upload a file for analysis',
        icon: <Upload className="w-4 h-4" />,
        shortcut: ['⌘', 'U'],
        action: () => onUpload?.(),
        category: 'actions',
      },
      // Settings
      {
        id: 'theme',
        label: 'Toggle Dark Mode',
        icon: <Moon className="w-4 h-4" />,
        action: () => onToggleTheme?.(),
        category: 'settings',
      },
      {
        id: 'logout',
        label: 'Sign Out',
        icon: <LogOut className="w-4 h-4" />,
        action: () => onLogout?.(),
        category: 'settings',
      },
    ],
    [router, onNewAnalysis, onUpload, onToggleTheme, onLogout]
  );

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      actions: [],
      settings: [],
    };
    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  const executeCommand = (cmd: CommandItem) => {
    cmd.action();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl z-50 px-4"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <Command className="w-5 h-5 text-foreground-tertiary" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-foreground-tertiary outline-none"
                />
                <kbd className="px-2 py-1 rounded bg-background-tertiary text-xs text-foreground-tertiary font-mono">
                  ESC
                </kbd>
              </div>

              {/* Commands List */}
              <div className="max-h-[400px] overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-foreground-secondary">
                    No commands found
                  </div>
                ) : (
                  <>
                    {Object.entries(groupedCommands).map(
                      ([category, items]) =>
                        items.length > 0 && (
                          <div key={category} className="mb-2">
                            <div className="px-3 py-2 text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                              {category}
                            </div>
                            {items.map((cmd) => {
                              const globalIndex = filteredCommands.indexOf(cmd);
                              const isSelected = globalIndex === selectedIndex;

                              return (
                                <button
                                  key={cmd.id}
                                  onClick={() => executeCommand(cmd)}
                                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                                  className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                                    isSelected
                                      ? 'bg-primary/10 text-primary'
                                      : 'hover:bg-background-tertiary'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                      isSelected
                                        ? 'bg-primary/20'
                                        : 'bg-background-secondary'
                                    )}
                                  >
                                    {cmd.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{cmd.label}</p>
                                    {cmd.description && (
                                      <p className="text-sm text-foreground-tertiary truncate">
                                        {cmd.description}
                                      </p>
                                    )}
                                  </div>
                                  {cmd.shortcut && (
                                    <div className="flex items-center gap-1">
                                      {cmd.shortcut.map((key, i) => (
                                        <kbd
                                          key={i}
                                          className="px-1.5 py-0.5 rounded bg-background-tertiary text-xs font-mono text-foreground-tertiary"
                                        >
                                          {key}
                                        </kbd>
                                      ))}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background-secondary/30">
                <div className="flex items-center gap-4 text-xs text-foreground-tertiary">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary font-mono">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary font-mono">↵</kbd>
                    select
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to manage command palette
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
