'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Search,
  FileText,
  Tag,
  Users,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Loader2,
  X,
  TrendingUp,
  Filter,
  Lightbulb,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchResult {
  id: string;
  type: 'document' | 'insight';
  documentId: string;
  documentName: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  matchType: 'semantic' | 'keyword' | 'theme' | 'entity' | 'keyphrase';
  metadata?: {
    themes?: string[];
    entities?: string[];
    sentiment?: string;
  };
}

interface SearchQuery {
  original: string;
  expanded: string[];
  intent: string;
  entities: string[];
  themes: string[];
}

interface SemanticSearchProps {
  workspaceId?: string;
  onSelectDocument?: (documentId: string) => void;
  compact?: boolean;
}

const MATCH_TYPE_ICONS: Record<string, any> = {
  semantic: Sparkles,
  keyword: Search,
  theme: Tag,
  entity: Users,
  keyphrase: MessageSquare,
};

const MATCH_TYPE_COLORS: Record<string, string> = {
  semantic: 'text-purple-500 bg-purple-500/10',
  keyword: 'text-blue-500 bg-blue-500/10',
  theme: 'text-green-500 bg-green-500/10',
  entity: 'text-amber-500 bg-amber-500/10',
  keyphrase: 'text-cyan-500 bg-cyan-500/10',
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'text-green-500',
  negative: 'text-red-500',
  neutral: 'text-foreground-tertiary',
  mixed: 'text-amber-500',
};

export function SemanticSearch({ workspaceId, onSelectDocument, compact = false }: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState<SearchQuery | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [includeUnanalyzed, setIncludeUnanalyzed] = useState(true);
  const [filterMatchType, setFilterMatchType] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  const performSearch = useCallback(async (searchText: string) => {
    if (!searchText.trim()) {
      setResults([]);
      setSearchQuery(null);
      setSearched(false);
      setTotalMatches(0);
      return;
    }

    try {
      setLoading(true);
      const data = await api.semanticSearch(searchText, {
        workspaceId,
        limit: 20,
        includeUnanalyzed,
      });

      setResults(data.results);
      setSearchQuery(data.query);
      setTotalMatches(data.totalMatches);
      setSearched(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, includeUnanalyzed]);

  // Auto-search on debounced query change
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setSearchQuery(null);
      setSearched(false);
    }
  }, [debouncedQuery, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearchQuery(null);
    setSearched(false);
    setTotalMatches(0);
  };

  const filteredResults = filterMatchType
    ? results.filter(r => r.matchType === filterMatchType)
    : results;

  const highlightSnippet = (snippet: string, terms: string[]) => {
    if (!terms.length) return snippet;

    let highlighted = snippet;
    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-primary/30 text-foreground rounded px-0.5">$1</mark>');
    }
    return highlighted;
  };

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by meaning, topic, or keyword..."
            className="pl-10 pr-20"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1 hover:bg-background-tertiary rounded"
            >
              <X className="h-4 w-4 text-foreground-tertiary" />
            </button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              showFilters && 'bg-background-tertiary'
            )}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mt-2">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeUnanalyzed"
                  checked={includeUnanalyzed}
                  onChange={(e) => setIncludeUnanalyzed(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="includeUnanalyzed" className="text-sm">
                  Include unanalyzed documents
                </label>
              </div>

              <div>
                <p className="text-xs text-foreground-tertiary mb-2">Filter by match type:</p>
                <div className="flex flex-wrap gap-2">
                  {['semantic', 'keyword', 'theme', 'entity', 'keyphrase'].map((type) => {
                    const Icon = MATCH_TYPE_ICONS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFilterMatchType(filterMatchType === type ? null : type)}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded text-xs capitalize transition-colors',
                          filterMatchType === type
                            ? MATCH_TYPE_COLORS[type]
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
            </CardContent>
          </Card>
        )}
      </form>

      {/* Query Expansion Info */}
      {searchQuery && searchQuery.expanded.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-foreground-secondary">
              Also searching for:{' '}
              <span className="text-foreground">
                {searchQuery.expanded.slice(0, 5).join(', ')}
                {searchQuery.expanded.length > 5 && ` +${searchQuery.expanded.length - 5} more`}
              </span>
            </p>
            {searchQuery.intent !== 'exploratory' && (
              <p className="text-xs text-foreground-tertiary mt-1">
                Query intent: <span className="capitalize">{searchQuery.intent}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-foreground-secondary">Searching...</span>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-secondary">
              {filteredResults.length === 0 ? (
                'No results found'
              ) : (
                <>
                  {filteredResults.length} of {totalMatches} results
                  {filterMatchType && ` (filtered by ${filterMatchType})`}
                </>
              )}
            </p>
          </div>

          {filteredResults.length === 0 && query && (
            <Card className="p-6 text-center">
              <Search className="h-8 w-8 mx-auto text-foreground-tertiary mb-3" />
              <p className="text-foreground-secondary mb-2">No documents match your search</p>
              <p className="text-sm text-foreground-tertiary">
                Try different keywords or analyze more documents for better semantic matching
              </p>
            </Card>
          )}

          <div className="space-y-2">
            {filteredResults.map((result) => {
              const MatchIcon = MATCH_TYPE_ICONS[result.matchType];

              return (
                <Card
                  key={result.id}
                  className={cn(
                    'hover:border-primary/50 transition-colors cursor-pointer',
                    compact && 'p-3'
                  )}
                  onClick={() => onSelectDocument?.(result.documentId)}
                >
                  <CardContent className={cn('p-4', compact && 'p-0')}>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-background-tertiary flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-foreground-tertiary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{result.documentName}</h4>
                          <span
                            className={cn(
                              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                              MATCH_TYPE_COLORS[result.matchType]
                            )}
                          >
                            <MatchIcon className="h-3 w-3" />
                            {result.matchType}
                          </span>
                          <span className="text-xs text-foreground-tertiary">
                            Score: {Math.round(result.relevanceScore)}
                          </span>
                        </div>

                        <p
                          className="text-sm text-foreground-secondary line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: highlightSnippet(
                              result.snippet,
                              searchQuery?.expanded || [searchQuery?.original || '']
                            ),
                          }}
                        />

                        {/* Metadata Tags */}
                        {result.metadata && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {result.metadata.sentiment && (
                              <span
                                className={cn(
                                  'text-xs capitalize',
                                  SENTIMENT_COLORS[result.metadata.sentiment]
                                )}
                              >
                                <TrendingUp className="inline h-3 w-3 mr-1" />
                                {result.metadata.sentiment}
                              </span>
                            )}

                            {result.metadata.themes?.slice(0, 2).map((theme) => (
                              <span
                                key={theme}
                                className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500"
                              >
                                {theme}
                              </span>
                            ))}

                            {result.metadata.entities?.slice(0, 2).map((entity) => (
                              <span
                                key={entity}
                                className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500"
                              >
                                {entity}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-foreground-tertiary flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !searched && !query && (
        <div className={cn('text-center', compact ? 'py-6' : 'py-12')}>
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Semantic Search</h3>
          <p className="text-sm text-foreground-secondary max-w-sm mx-auto">
            Search across all your documents by meaning, not just keywords.
            Our AI understands context, synonyms, and related concepts.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['market trends', 'customer feedback', 'quarterly results', 'product roadmap'].map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="px-3 py-1.5 rounded-full bg-background-secondary hover:bg-background-tertiary text-sm transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
