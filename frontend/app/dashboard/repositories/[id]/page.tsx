'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Plus, FileText, MessageSquare, GitCompare, Folder,
  MoreHorizontal, Trash2, Pencil, Check, X, Search, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Menu, MenuItem } from '@/components/ui/dropdown';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

type TabType = 'analyses' | 'documents' | 'comparisons';

export default function RepositoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const repositoryId = params.id as string;

  const [repository, setRepository] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('analyses');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Add item modals
  const [showAddAnalysis, setShowAddAnalysis] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddComparison, setShowAddComparison] = useState(false);

  // Available items to add
  const [availableAnalyses, setAvailableAnalyses] = useState<any[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [availableComparisons, setAvailableComparisons] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRepository();
  }, [repositoryId]);

  const fetchRepository = async () => {
    try {
      const { repository } = await api.getRepository(repositoryId);
      setRepository(repository);
      setEditName(repository.name);
      setEditDescription(repository.description || '');
    } catch (error) {
      console.error('Failed to fetch repository:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;

    try {
      const { repository: updated } = await api.updateRepository(repositoryId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setRepository({ ...repository, ...updated });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update repository:', error);
    }
  };

  const handleOpenAddAnalysis = async () => {
    try {
      const { analyses } = await api.getAnalyses();
      // Filter out analyses already in the repository
      const existingIds = new Set(repository.analyses.map((a: any) => a.id));
      setAvailableAnalyses(analyses.filter((a: any) => !existingIds.has(a.id)));
      setShowAddAnalysis(true);
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
    }
  };

  const handleOpenAddDocument = async () => {
    try {
      const { documents } = await api.getDocuments();
      const existingIds = new Set(repository.documents.map((d: any) => d.id));
      setAvailableDocuments(documents.filter((d: any) => !existingIds.has(d.id)));
      setShowAddDocument(true);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleOpenAddComparison = async () => {
    try {
      const { sessions } = await api.getCompareSessions();
      const existingIds = new Set(repository.comparisons.map((c: any) => c.id));
      setAvailableComparisons(sessions.filter((c: any) => !existingIds.has(c.id)));
      setShowAddComparison(true);
    } catch (error) {
      console.error('Failed to fetch comparisons:', error);
    }
  };

  const handleAddAnalysis = async (analysisId: string) => {
    try {
      await api.addAnalysisToRepository(repositoryId, analysisId);
      await fetchRepository();
      setShowAddAnalysis(false);
    } catch (error) {
      console.error('Failed to add analysis:', error);
    }
  };

  const handleAddDocument = async (documentId: string) => {
    try {
      await api.addDocumentToRepository(repositoryId, documentId);
      await fetchRepository();
      setShowAddDocument(false);
    } catch (error) {
      console.error('Failed to add document:', error);
    }
  };

  const handleAddComparison = async (comparisonId: string) => {
    try {
      await api.addComparisonToRepository(repositoryId, comparisonId);
      await fetchRepository();
      setShowAddComparison(false);
    } catch (error) {
      console.error('Failed to add comparison:', error);
    }
  };

  const handleRemoveAnalysis = async (analysisId: string) => {
    try {
      await api.removeAnalysisFromRepository(repositoryId, analysisId);
      setRepository({
        ...repository,
        analyses: repository.analyses.filter((a: any) => a.id !== analysisId),
      });
    } catch (error) {
      console.error('Failed to remove analysis:', error);
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    try {
      await api.removeDocumentFromRepository(repositoryId, documentId);
      setRepository({
        ...repository,
        documents: repository.documents.filter((d: any) => d.id !== documentId),
      });
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  };

  const handleRemoveComparison = async (comparisonId: string) => {
    try {
      await api.removeComparisonFromRepository(repositoryId, comparisonId);
      setRepository({
        ...repository,
        comparisons: repository.comparisons.filter((c: any) => c.id !== comparisonId),
      });
    } catch (error) {
      console.error('Failed to remove comparison:', error);
    }
  };

  const filteredItems = (items: any[], type: string) => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const name = type === 'documents' ? item.name : item.title;
      return name?.toLowerCase().includes(query);
    });
  };

  const tabs = [
    { id: 'analyses' as TabType, label: 'Analyses', icon: MessageSquare, count: repository?.analyses?.length || 0 },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText, count: repository?.documents?.length || 0 },
    { id: 'comparisons' as TabType, label: 'Comparisons', icon: GitCompare, count: repository?.comparisons?.length || 0 },
  ];

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-background-secondary rounded" />
            <div className="h-4 w-96 bg-background-secondary rounded" />
            <div className="h-64 bg-background-secondary rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!repository) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl p-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="mb-8">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold h-12"
                  placeholder="Repository name"
                />
                <Button size="icon-sm" onClick={handleSaveEdit}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
              />
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${repository.color}20` }}
                >
                  <Folder className="h-7 w-7" style={{ color: repository.color }} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{repository.name}</h1>
                  {repository.description && (
                    <p className="mt-1 text-foreground-secondary">{repository.description}</p>
                  )}
                  <p className="mt-1 text-sm text-foreground-tertiary">
                    Created {formatDate(repository.createdAt)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-secondary hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className="ml-1 rounded-full bg-background-tertiary px-2 py-0.5 text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Add */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => {
              if (activeTab === 'analyses') handleOpenAddAnalysis();
              else if (activeTab === 'documents') handleOpenAddDocument();
              else handleOpenAddComparison();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {activeTab === 'analyses' ? 'Analysis' : activeTab === 'documents' ? 'Document' : 'Comparison'}
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'analyses' && (
          <div className="space-y-3">
            {filteredItems(repository.analyses || [], 'analyses').length > 0 ? (
              filteredItems(repository.analyses || [], 'analyses').map((analysis: any) => (
                <Card
                  key={analysis.id}
                  className="group cursor-pointer transition-all hover:border-primary/50"
                  onClick={() => router.push(`/dashboard/chat/${analysis.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{analysis.title}</h3>
                        <p className="text-sm text-foreground-tertiary">
                          {analysis._count?.messages || 0} messages · {formatDate(analysis.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/chat/${analysis.id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Menu
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <MenuItem
                          icon={<Trash2 className="h-4 w-4" />}
                          variant="danger"
                          onClick={() => handleRemoveAnalysis(analysis.id)}
                        >
                          Remove from repository
                        </MenuItem>
                      </Menu>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium">No analyses yet</h3>
                <p className="mt-1 text-sm text-foreground-tertiary">
                  Add analyses to this repository to keep them organized
                </p>
                <Button className="mt-4" onClick={handleOpenAddAnalysis}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Analysis
                </Button>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-3">
            {filteredItems(repository.documents || [], 'documents').length > 0 ? (
              filteredItems(repository.documents || [], 'documents').map((doc: any) => (
                <Card
                  key={doc.id}
                  className="group cursor-pointer transition-all hover:border-primary/50"
                  onClick={() => router.push(`/dashboard/documents?view=${doc.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-teal/20">
                        <FileText className="h-5 w-5 text-accent-teal" />
                      </div>
                      <div>
                        <h3 className="font-medium">{doc.name}</h3>
                        <p className="text-sm text-foreground-tertiary">
                          {doc.type?.toUpperCase()} · {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Menu
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <MenuItem
                        icon={<Trash2 className="h-4 w-4" />}
                        variant="danger"
                        onClick={() => handleRemoveDocument(doc.id)}
                      >
                        Remove from repository
                      </MenuItem>
                    </Menu>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-teal/20">
                  <FileText className="h-6 w-6 text-accent-teal" />
                </div>
                <h3 className="font-medium">No documents yet</h3>
                <p className="mt-1 text-sm text-foreground-tertiary">
                  Add documents to this repository to keep them organized
                </p>
                <Button className="mt-4" onClick={handleOpenAddDocument}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Document
                </Button>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'comparisons' && (
          <div className="space-y-3">
            {filteredItems(repository.comparisons || [], 'comparisons').length > 0 ? (
              filteredItems(repository.comparisons || [], 'comparisons').map((comparison: any) => (
                <Card
                  key={comparison.id}
                  className="group cursor-pointer transition-all hover:border-primary/50"
                  onClick={() => router.push(`/dashboard/compare?session=${comparison.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-coral/20">
                        <GitCompare className="h-5 w-5 text-accent-coral" />
                      </div>
                      <div>
                        <h3 className="font-medium">{comparison.title}</h3>
                        <p className="text-sm text-foreground-tertiary">
                          {comparison._count?.items || 0} items · {formatDate(comparison.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Menu
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <MenuItem
                        icon={<Trash2 className="h-4 w-4" />}
                        variant="danger"
                        onClick={() => handleRemoveComparison(comparison.id)}
                      >
                        Remove from repository
                      </MenuItem>
                    </Menu>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-coral/20">
                  <GitCompare className="h-6 w-6 text-accent-coral" />
                </div>
                <h3 className="font-medium">No comparisons yet</h3>
                <p className="mt-1 text-sm text-foreground-tertiary">
                  Add comparisons to this repository to keep them organized
                </p>
                <Button className="mt-4" onClick={handleOpenAddComparison}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Comparison
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add Analysis Modal */}
      <Modal
        isOpen={showAddAnalysis}
        onClose={() => setShowAddAnalysis(false)}
        title="Add Analysis"
        description="Select an analysis to add to this repository"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableAnalyses.length > 0 ? (
            availableAnalyses.map((analysis) => (
              <Card
                key={analysis.id}
                className="cursor-pointer transition-all hover:border-primary/50"
                onClick={() => handleAddAnalysis(analysis.id)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{analysis.title}</h4>
                    <p className="text-xs text-foreground-tertiary">
                      {analysis._count?.messages || 0} messages
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-foreground-tertiary" />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-foreground-tertiary py-8">
              No analyses available to add
            </p>
          )}
        </div>
      </Modal>

      {/* Add Document Modal */}
      <Modal
        isOpen={showAddDocument}
        onClose={() => setShowAddDocument(false)}
        title="Add Document"
        description="Select a document to add to this repository"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableDocuments.length > 0 ? (
            availableDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="cursor-pointer transition-all hover:border-primary/50"
                onClick={() => handleAddDocument(doc.id)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-teal/20">
                    <FileText className="h-4 w-4 text-accent-teal" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{doc.name}</h4>
                    <p className="text-xs text-foreground-tertiary">
                      {doc.type?.toUpperCase()}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-foreground-tertiary" />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-foreground-tertiary py-8">
              No documents available to add
            </p>
          )}
        </div>
      </Modal>

      {/* Add Comparison Modal */}
      <Modal
        isOpen={showAddComparison}
        onClose={() => setShowAddComparison(false)}
        title="Add Comparison"
        description="Select a comparison to add to this repository"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableComparisons.length > 0 ? (
            availableComparisons.map((comparison) => (
              <Card
                key={comparison.id}
                className="cursor-pointer transition-all hover:border-primary/50"
                onClick={() => handleAddComparison(comparison.id)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-coral/20">
                    <GitCompare className="h-4 w-4 text-accent-coral" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{comparison.title}</h4>
                    <p className="text-xs text-foreground-tertiary">
                      {comparison._count?.items || 0} items
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-foreground-tertiary" />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-foreground-tertiary py-8">
              No comparisons available to add
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
