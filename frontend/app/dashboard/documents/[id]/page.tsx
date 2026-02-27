'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  MessageSquare,
  Brain,
  Highlighter,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmModal } from '@/components/ui/modal';
import { SmartHighlights } from '@/components/documents/smart-highlights';
import { HighlightedContent } from '@/components/documents/highlighted-content';
import { SemanticInsightsPanel } from '@/components/insights/semantic-insights-panel';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type TabType = 'content' | 'highlights' | 'insights';

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddHighlight, setShowAddHighlight] = useState(false);
  const [selectedText, setSelectedText] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const [docRes, contentRes, highlightsRes] = await Promise.all([
        api.getDocument(documentId),
        api.getDocumentContent(documentId),
        api.getDocumentHighlights(documentId),
      ]);

      setDocument(docRes.document);
      setContent(contentRes.content || '');
      setHighlights(highlightsRes.highlights);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    try {
      await api.downloadDocument(document.id, document.name);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    setDeleting(true);
    try {
      await api.deleteDocument(document.id);
      router.push('/dashboard/documents');
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!document) return;
    try {
      const { analysis } = await api.createAnalysis({
        title: `Analysis: ${document.name}`,
        documentIds: [document.id],
      });
      router.push(`/dashboard/chat/${analysis.id}`);
    } catch (error) {
      console.error('Failed to create analysis:', error);
    }
  };

  const handleHighlightClick = (highlight: any) => {
    setActiveHighlightId(highlight.id);
    // Scroll to highlight in content
    const element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleTextSelect = (selection: { text: string; startOffset: number; endOffset: number }) => {
    setSelectedText(selection);
    setShowAddHighlight(true);
  };

  const handleAddHighlight = async (type: string, importance: string) => {
    if (!selectedText) return;
    try {
      const { highlight } = await api.addHighlight(documentId, {
        text: selectedText.text,
        startOffset: selectedText.startOffset,
        endOffset: selectedText.endOffset,
        type,
        importance,
      });
      setHighlights((prev) => [...prev, highlight].sort((a, b) => a.startOffset - b.startOffset));
      setShowAddHighlight(false);
      setSelectedText(null);
    } catch (error) {
      console.error('Failed to add highlight:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-foreground-tertiary mb-4" />
        <p className="text-foreground-secondary">Document not found</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold truncate max-w-md">{document.name}</h1>
            <p className="text-xs text-foreground-tertiary">
              {document.type.toUpperCase()} • {(document.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleStartAnalysis}>
            <MessageSquare className="h-4 w-4 mr-1" />
            Analyze
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border px-4 flex items-center gap-1 shrink-0">
        {[
          { id: 'content' as TabType, label: 'Content', icon: FileText },
          { id: 'highlights' as TabType, label: 'Smart Highlights', icon: Highlighter },
          { id: 'insights' as TabType, label: 'Semantic Insights', icon: Brain },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-secondary hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'content' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr,350px] divide-x divide-border">
            {/* Document Content with Highlights */}
            <div className="overflow-y-auto p-6">
              {content ? (
                <HighlightedContent
                  content={content}
                  highlights={highlights}
                  activeHighlightId={activeHighlightId}
                  onHighlightClick={handleHighlightClick}
                  onTextSelect={handleTextSelect}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-foreground-tertiary mb-4" />
                  <p className="text-foreground-secondary">
                    No text content available for this document
                  </p>
                </div>
              )}
            </div>

            {/* Highlights Sidebar */}
            <div className="overflow-y-auto p-4 hidden lg:block">
              <SmartHighlights
                documentId={documentId}
                content={content}
                onHighlightClick={handleHighlightClick}
              />
            </div>
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <SmartHighlights
                documentId={documentId}
                content={content}
                onHighlightClick={handleHighlightClick}
              />
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-6">
                  <SemanticInsightsPanel documentId={documentId} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Add Highlight Modal */}
      {showAddHighlight && selectedText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Highlight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-foreground-secondary mb-2">Selected text:</p>
                <p className="p-3 rounded bg-background-secondary text-sm line-clamp-3">
                  "{selectedText.text}"
                </p>
              </div>

              <div>
                <p className="text-sm text-foreground-secondary mb-2">Type:</p>
                <div className="flex flex-wrap gap-2">
                  {['fact', 'statistic', 'claim', 'definition', 'quote', 'conclusion'].map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => handleAddHighlight(type, 'medium')}
                        className="px-3 py-1.5 rounded text-sm capitalize bg-background-tertiary hover:bg-primary/20 transition-colors"
                      >
                        {type}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddHighlight(false);
                    setSelectedText(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${document.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
