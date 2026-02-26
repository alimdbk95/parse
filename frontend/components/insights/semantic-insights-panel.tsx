'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Tag,
  Users,
  MessageSquare,
  FileText,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SemanticInsightsPanelProps {
  documentId?: string;
  analysisId?: string;
  compact?: boolean;
}

interface Insight {
  id: string;
  type: string;
  label: string;
  value?: string;
  confidence?: number;
  context?: string;
}

interface InsightsData {
  themes: Insight[];
  entities: Insight[];
  keyphrases: Insight[];
  sentiment?: Insight;
  summary?: Insight;
}

export function SemanticInsightsPanel({
  documentId,
  analysisId,
  compact = false,
}: SemanticInsightsPanelProps) {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [aggregated, setAggregated] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['themes', 'summary']);
  const [documentName, setDocumentName] = useState<string>('');

  useEffect(() => {
    if (documentId || analysisId) {
      fetchInsights();
    }
  }, [documentId, analysisId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      if (documentId) {
        const data = await api.getDocumentInsights(documentId);
        setInsights(data.insights);
        setDocumentName(data.documentName);
      } else if (analysisId) {
        const data = await api.getAnalysisInsights(analysisId);
        setInsights(data.insights as any);
        setAggregated(data.aggregated);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      if (documentId) {
        const data = await api.analyzeDocument(documentId, analysisId);
        setInsights(data.insights);
        setDocumentName(data.documentName);
      } else if (analysisId) {
        await api.analyzeAllDocuments(analysisId);
        await fetchInsights();
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-green-500 bg-green-500/10';
      case 'negative':
        return 'text-red-500 bg-red-500/10';
      case 'neutral':
        return 'text-foreground-secondary bg-background-tertiary';
      case 'mixed':
        return 'text-amber-500 bg-amber-500/10';
      default:
        return 'text-foreground-secondary bg-background-tertiary';
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-foreground-tertiary';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const hasInsights =
    insights &&
    (insights.themes?.length > 0 ||
      insights.entities?.length > 0 ||
      insights.keyphrases?.length > 0 ||
      insights.sentiment ||
      insights.summary);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'text-sm')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Semantic Analysis</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-4 w-4" />
              {hasInsights ? 'Re-analyze' : 'Analyze'}
            </>
          )}
        </Button>
      </div>

      {documentName && (
        <p className="text-sm text-foreground-secondary">
          Insights for: <span className="font-medium">{documentName}</span>
        </p>
      )}

      {!hasInsights ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Brain className="h-8 w-8 mx-auto text-foreground-tertiary mb-2" />
          <p className="text-foreground-secondary mb-3">
            No semantic analysis available yet
          </p>
          <Button onClick={handleAnalyze} disabled={analyzing}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Analyze Document
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          {insights?.summary && (
            <div className="rounded-lg border border-border bg-background-secondary overflow-hidden">
              <button
                onClick={() => toggleSection('summary')}
                className="w-full flex items-center justify-between p-3 hover:bg-background-tertiary/50"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Summary</span>
                </div>
                {expandedSections.includes('summary') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {expandedSections.includes('summary') && (
                <div className="px-3 pb-3">
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    {insights.summary.value}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sentiment */}
          {insights?.sentiment && (
            <div className="rounded-lg border border-border bg-background-secondary p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Sentiment</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium capitalize',
                    getSentimentColor(insights.sentiment.label)
                  )}
                >
                  {insights.sentiment.label}
                </span>
                {insights.sentiment.confidence && (
                  <span className="text-xs text-foreground-tertiary">
                    {Math.round(insights.sentiment.confidence * 100)}% confident
                  </span>
                )}
              </div>
              {insights.sentiment.value && (
                <p className="text-sm text-foreground-secondary mt-2">
                  {insights.sentiment.value}
                </p>
              )}
            </div>
          )}

          {/* Themes */}
          {insights?.themes && insights.themes.length > 0 && (
            <div className="rounded-lg border border-border bg-background-secondary overflow-hidden">
              <button
                onClick={() => toggleSection('themes')}
                className="w-full flex items-center justify-between p-3 hover:bg-background-tertiary/50"
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Themes</span>
                  <span className="text-xs text-foreground-tertiary">
                    ({insights.themes.length})
                  </span>
                </div>
                {expandedSections.includes('themes') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {expandedSections.includes('themes') && (
                <div className="px-3 pb-3 space-y-2">
                  {insights.themes.map((theme, index) => (
                    <div
                      key={theme.id || index}
                      className="flex items-center gap-3 p-2 rounded bg-background-tertiary/50"
                    >
                      <div className="flex-1">
                        <span className="font-medium">{theme.label}</span>
                        {theme.context && (
                          <p className="text-xs text-foreground-tertiary mt-0.5">
                            {theme.context}
                          </p>
                        )}
                      </div>
                      {theme.confidence !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', getConfidenceColor(theme.confidence))}
                              style={{ width: `${theme.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-foreground-tertiary">
                            {Math.round(theme.confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Entities */}
          {insights?.entities && insights.entities.length > 0 && (
            <div className="rounded-lg border border-border bg-background-secondary overflow-hidden">
              <button
                onClick={() => toggleSection('entities')}
                className="w-full flex items-center justify-between p-3 hover:bg-background-tertiary/50"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">Entities</span>
                  <span className="text-xs text-foreground-tertiary">
                    ({insights.entities.length})
                  </span>
                </div>
                {expandedSections.includes('entities') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {expandedSections.includes('entities') && (
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {insights.entities.map((entity, index) => (
                      <span
                        key={entity.id || index}
                        className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs"
                      >
                        {entity.label}
                        {entity.value && (
                          <span className="ml-1 text-foreground-tertiary">({entity.value})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Key Phrases */}
          {insights?.keyphrases && insights.keyphrases.length > 0 && (
            <div className="rounded-lg border border-border bg-background-secondary overflow-hidden">
              <button
                onClick={() => toggleSection('keyphrases')}
                className="w-full flex items-center justify-between p-3 hover:bg-background-tertiary/50"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-cyan-500" />
                  <span className="font-medium">Key Phrases</span>
                  <span className="text-xs text-foreground-tertiary">
                    ({insights.keyphrases.length})
                  </span>
                </div>
                {expandedSections.includes('keyphrases') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {expandedSections.includes('keyphrases') && (
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {insights.keyphrases.map((phrase, index) => (
                      <span
                        key={phrase.id || index}
                        className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-500 text-xs"
                      >
                        {phrase.label}
                        {phrase.value && (
                          <span className="ml-1 text-foreground-tertiary">x{phrase.value}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aggregated themes for analysis view */}
          {aggregated?.themes && aggregated.themes.length > 0 && (
            <div className="rounded-lg border border-border bg-background-secondary overflow-hidden">
              <button
                onClick={() => toggleSection('aggregated')}
                className="w-full flex items-center justify-between p-3 hover:bg-background-tertiary/50"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">Cross-Document Themes</span>
                  <span className="text-xs text-foreground-tertiary">
                    (across {aggregated.documentCount} documents)
                  </span>
                </div>
                {expandedSections.includes('aggregated') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {expandedSections.includes('aggregated') && (
                <div className="px-3 pb-3 space-y-2">
                  {aggregated.themes.map((theme: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-background-tertiary/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{theme.label}</span>
                        <span className="text-xs text-foreground-tertiary px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {theme.count}x
                        </span>
                      </div>
                      <span className="text-xs text-foreground-tertiary">
                        {Math.round(theme.confidence * 100)}% avg confidence
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
