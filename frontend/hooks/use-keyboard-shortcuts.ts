'use client';

import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyHandler;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  handler: KeyHandler,
  options: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    preventDefault?: boolean;
  } = {}
) {
  const { ctrl, meta, shift, alt, preventDefault = true } = options;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      const ctrlMatch = ctrl ? event.ctrlKey : !event.ctrlKey || meta;
      const metaMatch = meta ? event.metaKey : !event.metaKey || ctrl;
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
      const altMatch = alt ? event.altKey : !event.altKey;

      // For shortcuts that want either ctrl or meta (cross-platform)
      const modifierMatch = (ctrl || meta)
        ? (event.ctrlKey || event.metaKey)
        : ctrlMatch && metaMatch;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        modifierMatch &&
        shiftMatch &&
        altMatch
      ) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, handler, ctrl, meta, shift, alt, preventDefault]);
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except Escape)
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const ctrlOrMeta = shortcut.ctrl || shortcut.meta;
        const modifierMatch = ctrlOrMeta
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;

        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          modifierMatch &&
          shiftMatch &&
          altMatch
        ) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Common shortcut patterns
export const SHORTCUTS = {
  SEARCH: { key: 'k', meta: true },
  NEW: { key: 'n', meta: true },
  SAVE: { key: 's', meta: true },
  ESCAPE: { key: 'Escape' },
  ENTER: { key: 'Enter' },
  DELETE: { key: 'Backspace', meta: true },
  UNDO: { key: 'z', meta: true },
  REDO: { key: 'z', meta: true, shift: true },
} as const;
