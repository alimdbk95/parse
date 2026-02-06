'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, BarChart3, Link2, File, X, MessageSquare, Send, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { ChartRenderer } from '@/components/charts/chart-renderer';
import { ChartCustomizer } from '@/components/charts/chart-customizer';
import { Avatar } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { useStore } from '@/lib/store';

const compareTabs = [
  { id: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { id: 'charts', label: 'Charts', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'links', label: 'Links', icon: <Link2 className="h-4 w-4" /> },
];

interface CompareItem {
  id: string;
  type: 'document' | 'chart' | 'link' | 'pdf';
  title: string;
  content?: string;
  data?: any;
  url?: string;
  description?: string;
  image?: string;
  comments?: any[];
}

export default function ComparePage() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Comments
  const [activeCommentItem, setActiveCommentItem] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Record<string, any[]>>({});

  // Chart customization
  const [chartConfig, setChartConfig] = useState<{
    type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
    colors: string[];
    background: 'dark' | 'light' | 'transparent';
    showLegend: boolean;
    showGrid: boolean;
    title: string;
  }>({
    type: 'bar',
    colors: ['#f97066', '#47d4c1', '#3b82f6', '#a3e635', '#f472b6'],
    background: 'dark',
    showLegend: true,
    showGrid: true,
    title: 'Comparison',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, chartsRes] = await Promise.all([
          api.getDocuments(),
          api.getCharts(),
        ]);
        setDocuments(docsRes.documents);
        setCharts(
          chartsRes.charts.map((c: any) => ({
            ...c,
            data: typeof c.data === 'string' ? JSON.parse(c.data) : c.data,
            config: typeof c.config === 'string' ? JSON.parse(c.config) : c.config,
          }))
        );
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addToCompare = (item: any, type: 'document' | 'chart') => {
    if (compareItems.length >= 4) {
      alert('Maximum 4 items can be compared at once');
      return;
    }

    const newItem: CompareItem = {
      id: `${type}-${item.id}`,
      type,
      title: item.name || item.title,
      content: type === 'document' ? item.content : undefined,
      data: type === 'chart' ? item.data : undefined,
    };

    setCompareItems((prev) => [...prev, newItem]);
    setShowAddModal(false);
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;

    setLinkLoading(true);
    try {
      const metadata = await api.fetchLinkMetadata(linkUrl);

      const newItem: CompareItem = {
        id: `link-${Date.now()}`,
        type: 'link',
        title: metadata.title || linkUrl,
        url: metadata.url,
        description: metadata.description,
        image: metadata.image,
      };

      setCompareItems((prev) => [...prev, newItem]);
      setLinkUrl('');
      setShowLinkModal(false);
    } catch (error) {
      console.error('Failed to fetch link:', error);
      // Add basic link even if metadata fetch fails
      const newItem: CompareItem = {
        id: `link-${Date.now()}`,
        type: 'link',
        title: linkUrl,
        url: linkUrl,
      };
      setCompareItems((prev) => [...prev, newItem]);
      setLinkUrl('');
      setShowLinkModal(false);
    } finally {
      setLinkLoading(false);
    }
  };

  const removeFromCompare = (itemId: string) => {
    setCompareItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const addComment = (itemId: string) => {
    if (!newComment.trim()) return;

    const comment = {
      id: `comment-${Date.now()}`,
      content: newComment,
      author: { name: user?.name || 'You' },
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), comment],
    }));
    setNewComment('');
  };

  const deleteComment = (itemId: string, commentId: string) => {
    setComments((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((c) => c.id !== commentId),
    }));
  };

  const renderCompareItem = (item: CompareItem) => {
    const itemComments = comments[item.id] || [];

    return (
      <Card key={item.id} className="relative flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {item.type === 'document' && <FileText className="h-4 w-4 text-accent-teal shrink-0" />}
              {item.type === 'chart' && <BarChart3 className="h-4 w-4 text-accent-coral shrink-0" />}
              {item.type === 'link' && <Link2 className="h-4 w-4 text-accent-purple shrink-0" />}
              {item.type === 'pdf' && <File className="h-4 w-4 text-primary shrink-0" />}
              <CardTitle className="text-base truncate">{item.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => removeFromCompare(item.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Content */}
          {item.type === 'document' && (
            <div className="rounded-lg bg-background-tertiary p-3 flex-1 overflow-auto max-h-64">
              <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                {item.content?.slice(0, 1000) || 'Document content preview not available'}
                {(item.content?.length || 0) > 1000 && '...'}
              </p>
            </div>
          )}

          {item.type === 'chart' && item.data && (
            <div className="flex-1">
              <ChartRenderer
                type={chartConfig.type}
                data={item.data}
                colors={chartConfig.colors}
                background={chartConfig.background}
                showLegend={chartConfig.showLegend}
                showGrid={chartConfig.showGrid}
                height={200}
              />
            </div>
          )}

          {item.type === 'link' && (
            <div className="rounded-lg bg-background-tertiary p-3 flex-1">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              {item.description && (
                <p className="text-sm text-foreground-secondary mb-3">
                  {item.description.slice(0, 200)}
                  {item.description.length > 200 && '...'}
                </p>
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open link
              </a>
            </div>
          )}

          {/* Comments Section */}
          <div className="mt-3 border-t border-border pt-3">
            <button
              className="flex items-center gap-1 text-xs text-foreground-tertiary hover:text-foreground transition-colors"
              onClick={() => setActiveCommentItem(activeCommentItem === item.id ? null : item.id)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {itemComments.length > 0 ? `${itemComments.length} comments` : 'Add comment'}
            </button>

            {activeCommentItem === item.id && (
              <div className="mt-2 space-y-2">
                {/* Existing comments */}
                {itemComments.map((comment) => (
                  <div key={comment.id} className="flex gap-2 p-2 bg-background-secondary rounded-lg">
                    <Avatar name={comment.author.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{comment.author.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => deleteComment(item.id, comment.id)}
                        >
                          <Trash2 className="h-3 w-3 text-foreground-tertiary" />
                        </Button>
                      </div>
                      <p className="text-xs text-foreground-secondary mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))}

                {/* Add comment input */}
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addComment(item.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => addComment(item.id)}
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getFilteredItems = () => {
    if (activeTab === 'documents') {
      return documents.filter((d) => !compareItems.find((ci) => ci.id === `document-${d.id}`));
    }
    if (activeTab === 'charts') {
      return charts.filter((c) => !compareItems.find((ci) => ci.id === `chart-${c.id}`));
    }
    return [];
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Compare</h1>
              <p className="mt-1 text-foreground-secondary">
                Compare documents, charts, PDFs, and links side by side
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowLinkModal(true)} variant="secondary">
                <Link2 className="mr-2 h-4 w-4" />
                Add Link
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Comparison Grid */}
          {compareItems.length > 0 ? (
            <div className={cn(
              'grid gap-4 mb-8',
              compareItems.length === 1 && 'grid-cols-1 max-w-2xl',
              compareItems.length === 2 && 'grid-cols-1 md:grid-cols-2',
              compareItems.length === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
              compareItems.length >= 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
            )}>
              {compareItems.map(renderCompareItem)}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-background-secondary">
                  <Plus className="h-8 w-8 text-foreground-tertiary" />
                </div>
                <h3 className="text-lg font-medium">Start comparing</h3>
                <p className="mt-1 text-foreground-secondary">
                  Add documents, charts, or links to compare them side by side
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="secondary" onClick={() => setShowLinkModal(true)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Add Link
                  </Button>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Add Section */}
          {compareItems.length > 0 && compareItems.length < 4 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Quick Add</h2>
                <Tabs
                  tabs={compareTabs}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                />
              </div>

              {activeTab === 'links' ? (
                <Card className="p-4">
                  <div className="flex gap-3">
                    <Input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="Paste a URL to compare..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addLink();
                      }}
                    />
                    <Button onClick={addLink} disabled={!linkUrl.trim() || linkLoading}>
                      {linkLoading ? 'Loading...' : 'Add'}
                    </Button>
                  </div>
                </Card>
              ) : loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-background-secondary" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {getFilteredItems().slice(0, 8).map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer transition-all hover:border-primary/50"
                      onClick={() => addToCompare(item, activeTab === 'documents' ? 'document' : 'chart')}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                            activeTab === 'documents'
                              ? 'bg-accent-teal/20 text-accent-teal'
                              : 'bg-accent-coral/20 text-accent-coral'
                          )}
                        >
                          {activeTab === 'documents' ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <BarChart3 className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{item.name || item.title}</p>
                          <p className="text-xs text-foreground-tertiary">
                            {activeTab === 'documents' ? item.type?.toUpperCase() : item.type}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-foreground-tertiary" />
                      </CardContent>
                    </Card>
                  ))}
                  {getFilteredItems().length === 0 && (
                    <div className="col-span-full text-center py-8 text-foreground-secondary">
                      No {activeTab} available to add
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart Customizer */}
      {compareItems.some((item) => item.type === 'chart') && (
        <ChartCustomizer
          config={chartConfig}
          onChange={(config) => setChartConfig((prev) => ({ ...prev, ...config }))}
        />
      )}

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Item to Compare"
        description="Select a document or chart to add to your comparison"
        size="lg"
      >
        <div className="space-y-4">
          <Tabs
            tabs={compareTabs.slice(0, 2)} // Only documents and charts
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="max-h-96 overflow-y-auto space-y-2">
            {activeTab === 'documents' ? (
              documents.length > 0 ? (
                documents.map((doc) => {
                  const isAdded = compareItems.find((ci) => ci.id === `document-${doc.id}`);
                  return (
                    <Card
                      key={doc.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        isAdded ? 'opacity-50' : 'hover:border-primary/50'
                      )}
                      onClick={() => !isAdded && addToCompare(doc, 'document')}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-teal/20 text-accent-teal">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{doc.name}</p>
                          <p className="text-xs text-foreground-tertiary">
                            {doc.type?.toUpperCase()} · {formatDate(doc.createdAt)}
                          </p>
                        </div>
                        {isAdded ? (
                          <span className="text-xs text-foreground-tertiary">Added</span>
                        ) : (
                          <Plus className="h-4 w-4 text-foreground-tertiary" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-center py-8 text-foreground-secondary">
                  No documents available. Upload some first!
                </p>
              )
            ) : (
              charts.length > 0 ? (
                charts.map((chart) => {
                  const isAdded = compareItems.find((ci) => ci.id === `chart-${chart.id}`);
                  return (
                    <Card
                      key={chart.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        isAdded ? 'opacity-50' : 'hover:border-primary/50'
                      )}
                      onClick={() => !isAdded && addToCompare(chart, 'chart')}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-coral/20 text-accent-coral">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{chart.title}</p>
                          <p className="text-xs text-foreground-tertiary">
                            {chart.type} chart · {formatDate(chart.createdAt)}
                          </p>
                        </div>
                        {isAdded ? (
                          <span className="text-xs text-foreground-tertiary">Added</span>
                        ) : (
                          <Plus className="h-4 w-4 text-foreground-tertiary" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-center py-8 text-foreground-secondary">
                  No charts available. Create some from analyses first!
                </p>
              )
            )}
          </div>
        </div>
      </Modal>

      {/* Add Link Modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Add Link to Compare"
        description="Enter a URL to fetch and compare"
      >
        <div className="space-y-4">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com/article"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addLink();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowLinkModal(false)}>
              Cancel
            </Button>
            <Button onClick={addLink} disabled={!linkUrl.trim() || linkLoading}>
              {linkLoading ? 'Fetching...' : 'Add Link'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
