'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  MessageSquare,
  FileText,
  Folder,
  Clock,
  ArrowRight,
  Command,
  BarChart2,
  FlaskConical,
  Layout,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface SearchResult {
  id: string;
  type: 'analysis' | 'document' | 'repository' | 'experiment' | 'chart' | 'template';
  title: string;
  subtitle?: string;
  content?: string;
  highlights?: Array<{ field: string; snippet: string }>;
  score?: number;
  url: string;
  updatedAt?: string;
  createdAt?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentItems, setRecentItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQueryId, setSearchQueryId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      loadRecentItems();
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Load recent items from localStorage
  const loadRecentItems = () => {
    try {
      const stored = localStorage.getItem('parse_recent_searches');
      if (stored) {
        setRecentItems(JSON.parse(stored).slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  };

  // Save to recent items
  const saveToRecent = (item: SearchResult) => {
    try {
      const stored = localStorage.getItem('parse_recent_searches');
      let recent: SearchResult[] = stored ? JSON.parse(stored) : [];
      // Remove if already exists
      recent = recent.filter((r) => r.id !== item.id);
      // Add to front
      recent.unshift(item);
      // Keep only last 10
      recent = recent.slice(0, 10);
      localStorage.setItem('parse_recent_searches', JSON.stringify(recent));
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }
  };

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearchQueryId(null);
      return;
    }

    setLoading(true);
    try {
      const response = await api.search(searchQuery);
      setResults(response.results);
      setSearchQueryId(response.searchQueryId);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setSearchQueryId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query ? results : recentItems;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          handleSelect(items[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Handle selection
  const handleSelect = async (item: SearchResult) => {
    // Track the click for analytics
    if (searchQueryId) {
      try {
        await api.recordSearchClick(searchQueryId, item.id, item.type);
      } catch (error) {
        console.error('Failed to record search click:', error);
      }
    }
    saveToRecent(item);
    onClose();
    router.push(item.url);
  };

  // Get icon component based on result type
  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'analysis':
        return MessageSquare;
      case 'document':
        return FileText;
      case 'repository':
        return Folder;
      case 'experiment':
        return FlaskConical;
      case 'chart':
        return BarChart2;
      case 'template':
        return Layout;
      default:
        return FileText;
    }
  };

  const displayItems = query ? results : recentItems;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-xl z-50 px-4"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <Search className="h-5 w-5 text-foreground-tertiary flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search conversations, documents, repositories..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-foreground-tertiary outline-none text-base"
                  style={{ fontSize: '16px' }}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded-lg hover:bg-background-tertiary transition-colors"
                  >
                    <X className="h-4 w-4 text-foreground-tertiary" />
                  </button>
                )}
                <div className="flex items-center gap-1 text-xs text-foreground-tertiary">
                  <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary font-mono">esc</kbd>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <motion.div
                      className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    <p className="mt-3 text-sm text-foreground-tertiary">Searching...</p>
                  </div>
                ) : displayItems.length > 0 ? (
                  <div className="p-2">
                    {!query && (
                      <div className="px-3 py-2 text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                        Recent
                      </div>
                    )}
                    {displayItems.map((item, index) => {
                      const Icon = getIcon(item.type);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                            selectedIndex === index
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-background-tertiary'
                          )}
                        >
                          <div
                            className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
                              selectedIndex === index
                                ? 'bg-primary/20'
                                : 'bg-background-secondary'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-sm text-foreground-tertiary truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          {selectedIndex === index && (
                            <ArrowRight className="h-4 w-4 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : query ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-foreground-tertiary" />
                    </div>
                    <p className="text-foreground-secondary">No results found</p>
                    <p className="text-sm text-foreground-tertiary mt-1">
                      Try a different search term
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-foreground-tertiary" />
                    </div>
                    <p className="text-foreground-secondary">No recent searches</p>
                    <p className="text-sm text-foreground-tertiary mt-1">
                      Start typing to search
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background-secondary/30">
                <div className="flex items-center gap-4 text-xs text-foreground-tertiary">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary font-mono">↑</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary font-mono">↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary font-mono">↵</kbd>
                    select
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-foreground-tertiary">
                  <Command className="h-3 w-3" />
                  <span>K to open</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
