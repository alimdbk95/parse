'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Highlighter,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Quote,
  BookOpen,
  CheckCircle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Highlight {
  id: string;
  type: string;
  text: string;
  startOffset: number;
  endOffset: number;
  importance: string;
  category?: string;
  explanation?: string;
  confidence?: number;
  isUserAdded: boolean;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

interface HighlightStats {
  total: number;
  aiGenerated: number;
  userAdded: number;
  byType: Record<string, number>;
  byImportance: Record<string, number>;
  byCategory: Record<string, number>;
}

interface SmartHighlightsProps {
  documentId: string;
  content: string;
  onHighlightClick?: (highlight: Highlight) => void;
}

const TYPE_ICONS: Record<string, any> = {
  fact: CheckCircle,
  statistic: TrendingUp,
  claim: AlertTriangle,
  definition: BookOpen,
  quote: Quote,
  conclusion: Sparkles,
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fact: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  statistic: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  claim: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  definition: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  quote: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
  conclusion: { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/30' },
};

const IMPORTANCE_COLORS: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-amber-500',
  medium: 'border-l-blue-500',
  low: 'border-l-foreground-tertiary',
};

export function SmartHighlights({ documentId, content, onHighlightClick }: SmartHighlightsProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [stats, setStats] = useState<HighlightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterImportance, setFilterImportance] = useState<string | null>(null);
  const [expandedHighlight, setExpandedHighlight] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchHighlights();
  }, [documentId]);

  const fetchHighlights = async () => {
    try {
      setLoading(true);
      const data = await api.getDocumentHighlights(documentId);
      setHighlights(data.highlights);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    try {
      setExtracting(true);
      await api.extractHighlights(documentId);
      await fetchHighlights();
    } catch (error) {
      console.error('Failed to extract highlights:', error);
    } finally {
      setExtracting(false);
    }
  };

  const handleDelete = async (highlightId: string) => {
    try {
      await api.deleteHighlight(highlightId);
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  const filteredHighlights = useMemo(() => {
    return highlights.filter((h) => {
      if (filterType && h.type !== filterType) return false;
      if (filterImportance && h.importance !== filterImportance) return false;
      return true;
    });
  }, [highlights, filterType, filterImportance]);

  const groupedByType = useMemo(() => {
    const grouped: Record<string, Highlight[]> = {};
    for (const h of filteredHighlights) {
      if (!grouped[h.type]) grouped[h.type] = [];
      grouped[h.type].push(h);
    }
    return grouped;
  }, [filteredHighlights]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Highlighter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Smart Highlights</h3>
          {stats && (
            <span className="text-xs text-foreground-tertiary">
              ({stats.total} total)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && 'bg-background-tertiary')}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExtract}
            disabled={extracting}
          >
            {extracting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                {highlights.length > 0 ? 'Re-analyze' : 'Analyze'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div>
              <p className="text-xs text-foreground-tertiary mb-2">Filter by type:</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(TYPE_ICONS).map((type) => {
                  const Icon = TYPE_ICONS[type];
                  const colors = TYPE_COLORS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setFilterType(filterType === type ? null : type)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs capitalize transition-colors',
                        filterType === type
                          ? `${colors.bg} ${colors.text}`
                          : 'bg-background-tertiary hover:bg-background-secondary'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs text-foreground-tertiary mb-2">Filter by importance:</p>
              <div className="flex flex-wrap gap-2">
                {['critical', 'high', 'medium', 'low'].map((importance) => (
                  <button
                    key={importance}
                    onClick={() =>
                      setFilterImportance(filterImportance === importance ? null : importance)
                    }
                    className={cn(
                      'px-2 py-1 rounded text-xs capitalize transition-colors border-l-2',
                      filterImportance === importance
                        ? `bg-background-secondary ${IMPORTANCE_COLORS[importance]}`
                        : `bg-background-tertiary hover:bg-background-secondary ${IMPORTANCE_COLORS[importance]}`
                    )}
                  >
                    {importance}
                  </button>
                ))}
              </div>
            </div>

            {(filterType || filterImportance) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterType(null);
                  setFilterImportance(null);
                }}
                className="w-full"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {['critical', 'high', 'medium', 'low'].map((importance) => {
            const count = stats.byImportance[importance] || 0;
            return (
              <div
                key={importance}
                className={cn(
                  'p-2 rounded border-l-2 bg-background-secondary',
                  IMPORTANCE_COLORS[importance]
                )}
              >
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-foreground-tertiary capitalize">{importance}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* No Highlights State */}
      {highlights.length === 0 && (
        <Card className="p-6 text-center">
          <Highlighter className="h-10 w-10 mx-auto text-foreground-tertiary mb-3" />
          <h4 className="font-medium mb-2">No Highlights Yet</h4>
          <p className="text-sm text-foreground-secondary mb-4">
            Click "Analyze" to automatically detect key facts, statistics, claims, and more.
          </p>
          <Button onClick={handleExtract} disabled={extracting}>
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze Document
          </Button>
        </Card>
      )}

      {/* Highlights List */}
      {filteredHighlights.length > 0 && (
        <div className="space-y-3">
          {Object.entries(groupedByType).map(([type, typeHighlights]) => {
            const Icon = TYPE_ICONS[type] || CheckCircle;
            const colors = TYPE_COLORS[type] || TYPE_COLORS.fact;

            return (
              <div key={type} className="space-y-2">
                <div className={cn('flex items-center gap-2 px-2 py-1 rounded', colors.bg)}>
                  <Icon className={cn('h-4 w-4', colors.text)} />
                  <span className={cn('text-sm font-medium capitalize', colors.text)}>
                    {type}s ({typeHighlights.length})
                  </span>
                </div>

                {typeHighlights.map((highlight) => (
                  <Card
                    key={highlight.id}
                    className={cn(
                      'border-l-2 cursor-pointer hover:border-primary/50 transition-colors',
                      IMPORTANCE_COLORS[highlight.importance]
                    )}
                    onClick={() => {
                      setExpandedHighlight(
                        expandedHighlight === highlight.id ? null : highlight.id
                      );
                      onHighlightClick?.(highlight);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{highlight.text}</p>

                          {expandedHighlight === highlight.id && (
                            <div className="mt-2 space-y-2">
                              {highlight.explanation && (
                                <p className="text-xs text-foreground-secondary">
                                  <span className="font-medium">Why important:</span>{' '}
                                  {highlight.explanation}
                                </p>
                              )}

                              <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
                                {highlight.category && (
                                  <span className="px-1.5 py-0.5 rounded bg-background-tertiary">
                                    {highlight.category}
                                  </span>
                                )}
                                {highlight.confidence && (
                                  <span>
                                    {Math.round(highlight.confidence * 100)}% confidence
                                  </span>
                                )}
                                {highlight.isUserAdded && (
                                  <span className="text-primary">User added</span>
                                )}
                              </div>

                              {highlight.isUserAdded && (
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(highlight.id);
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded capitalize',
                              highlight.importance === 'critical'
                                ? 'bg-red-500/10 text-red-500'
                                : highlight.importance === 'high'
                                ? 'bg-amber-500/10 text-amber-500'
                                : highlight.importance === 'medium'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-foreground-tertiary/10 text-foreground-tertiary'
                            )}
                          >
                            {highlight.importance}
                          </span>
                          {expandedHighlight === highlight.id ? (
                            <ChevronDown className="h-4 w-4 text-foreground-tertiary" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-foreground-tertiary" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
