'use client';

import { useState, useEffect } from 'react';
import { Brain, FileText, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { SemanticInsightsPanel } from '@/components/insights/semantic-insights-panel';
import { cn } from '@/lib/utils';

export default function InsightsPage() {
  const { currentWorkspace } = useStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'documents' | 'analyses'>('documents');

  useEffect(() => {
    fetchData();
  }, [currentWorkspace]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, analysesRes] = await Promise.all([
        api.getDocuments(currentWorkspace?.id),
        api.getAnalyses(currentWorkspace?.id),
      ]);
      setDocuments(docsRes.documents);
      setAnalyses(analysesRes.analyses);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocument = (id: string) => {
    setSelectedDocument(id);
    setSelectedAnalysis(null);
  };

  const handleSelectAnalysis = (id: string) => {
    setSelectedAnalysis(id);
    setSelectedDocument(null);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Semantic Insights</h1>
              <p className="text-sm text-foreground-secondary">
                AI-powered analysis of your documents
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[350px,1fr]">
          {/* Left Panel - Document/Analysis Selection */}
          <div className="space-y-4">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-background-secondary p-1">
              <button
                onClick={() => setViewMode('documents')}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'documents'
                    ? 'bg-background text-foreground'
                    : 'text-foreground-secondary hover:text-foreground'
                )}
              >
                Documents
              </button>
              <button
                onClick={() => setViewMode('analyses')}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'analyses'
                    ? 'bg-background text-foreground'
                    : 'text-foreground-secondary hover:text-foreground'
                )}
              >
                Analyses
              </button>
            </div>

            {/* List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {viewMode === 'documents' ? 'Select Document' : 'Select Analysis'}
                </CardTitle>
                <CardDescription>
                  Choose an item to view its semantic insights
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto">
                  {viewMode === 'documents' ? (
                    documents.length === 0 ? (
                      <div className="p-4 text-center text-sm text-foreground-tertiary">
                        No documents uploaded yet
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {documents.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => handleSelectDocument(doc.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-tertiary transition-colors',
                              selectedDocument === doc.id && 'bg-primary/5'
                            )}
                          >
                            <FileText className="h-4 w-4 text-foreground-tertiary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.name}</p>
                              <p className="text-xs text-foreground-tertiary">
                                {doc.type} • {(doc.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 text-foreground-tertiary transition-transform',
                                selectedDocument === doc.id && 'text-primary'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    )
                  ) : analyses.length === 0 ? (
                    <div className="p-4 text-center text-sm text-foreground-tertiary">
                      No analyses created yet
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {analyses.map((analysis) => (
                        <button
                          key={analysis.id}
                          onClick={() => handleSelectAnalysis(analysis.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-tertiary transition-colors',
                            selectedAnalysis === analysis.id && 'bg-primary/5'
                          )}
                        >
                          <Brain className="h-4 w-4 text-foreground-tertiary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{analysis.title}</p>
                            <p className="text-xs text-foreground-tertiary">
                              {analysis._count?.documents || 0} documents
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 text-foreground-tertiary transition-transform',
                              selectedAnalysis === analysis.id && 'text-primary'
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Insights Display */}
          <Card>
            <CardContent className="p-6">
              {selectedDocument ? (
                <SemanticInsightsPanel documentId={selectedDocument} />
              ) : selectedAnalysis ? (
                <SemanticInsightsPanel analysisId={selectedAnalysis} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Select an Item</h3>
                  <p className="text-sm text-foreground-secondary max-w-sm">
                    Choose a document or analysis from the left panel to view AI-extracted
                    semantic insights including themes, entities, key phrases, and sentiment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
