'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['/', 'K'], description: 'Open search' },
      { keys: ['G', 'H'], description: 'Go to dashboard' },
      { keys: ['G', 'D'], description: 'Go to documents' },
      { keys: ['G', 'S'], description: 'Go to settings' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['/', 'N'], description: 'New analysis' },
      { keys: ['/', 'U'], description: 'Upload document' },
      { keys: ['/', 'S'], description: 'Save' },
      { keys: ['Esc'], description: 'Close modal / Cancel' },
    ],
  },
  {
    title: 'Chat',
    shortcuts: [
      { keys: ['Enter'], description: 'Send message' },
      { keys: ['Shift', 'Enter'], description: 'New line' },
      { keys: ['/', 'Up'], description: 'Edit last message' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: ['/', 'Z'], description: 'Undo' },
      { keys: ['/', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['/', 'C'], description: 'Copy' },
      { keys: ['/', 'V'], description: 'Paste' },
    ],
  },
];

function KeyboardKey({ children }: { children: string }) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  // Replace command symbol based on platform
  let displayKey = children;
  if (children === '/') {
    displayKey = isMac ? '⌘' : 'Ctrl';
  }

  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5',
        'rounded-md border border-border bg-background-tertiary',
        'text-xs font-mono text-foreground-secondary'
      )}
    >
      {displayKey}
    </kbd>
  );
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] overflow-hidden"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Command className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                  <X className="w-5 h-5 text-foreground-tertiary" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {shortcutGroups.map((group) => (
                    <div key={group.title}>
                      <h3 className="text-sm font-medium text-foreground-tertiary uppercase tracking-wider mb-3">
                        {group.title}
                      </h3>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background-secondary transition-colors"
                          >
                            <span className="text-sm text-foreground-secondary">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <KeyboardKey key={keyIndex}>{key}</KeyboardKey>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-background-secondary/30">
                <p className="text-xs text-foreground-tertiary text-center">
                  Press <KeyboardKey>?</KeyboardKey> to toggle this menu
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to manage keyboard shortcuts modal
export function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
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
