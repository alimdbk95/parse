'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, FileText, BarChart3, Users, Zap, ArrowRight, Pencil, Check, X, Trash2,
  FolderPlus, Folder, MessageSquare, GitCompare, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UploadZone } from '@/components/documents/upload-zone';
import { DocumentCard } from '@/components/documents/document-card';
import { Modal } from '@/components/ui/modal';
import { Menu, MenuItem, MenuDivider } from '@/components/ui/dropdown';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { formatDate, cn } from '@/lib/utils';

const quickActions = [
  {
    title: 'New Analysis',
    description: 'Start a new document analysis with AI',
    icon: Zap,
    color: 'bg-primary/20 text-primary',
    action: 'analysis',
  },
  {
    title: 'Upload Document',
    description: 'Add documents to your library',
    icon: FileText,
    color: 'bg-accent-teal/20 text-accent-teal',
    action: 'upload',
  },
  {
    title: 'Compare',
    description: 'Compare documents and charts',
    icon: GitCompare,
    color: 'bg-accent-coral/20 text-accent-coral',
    action: 'compare',
  },
  {
    title: 'New Repository',
    description: 'Create a folder for your project',
    icon: FolderPlus,
    color: 'bg-accent-purple/20 text-accent-purple',
    action: 'repository',
  },
];

const REPO_COLORS = [
  '#7C9FF5', '#E879B9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, currentWorkspace } = useStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // New repository form
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoColor, setNewRepoColor] = useState(REPO_COLORS[0]);
  const [creatingRepo, setCreatingRepo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, analysesRes, reposRes] = await Promise.all([
          api.getDocuments(),
          api.getAnalyses(),
          api.getRepositories(),
        ]);
        setDocuments(docsRes.documents.slice(0, 4));
        setRecentAnalyses(analysesRes.analyses.slice(0, 5));
        setRepositories(reposRes.repositories);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'analysis':
        try {
          const { analysis } = await api.createAnalysis({ title: 'New Analysis' });
          router.push(`/dashboard/chat/${analysis.id}`);
        } catch (error) {
          console.error('Failed to create analysis:', error);
        }
        break;
      case 'upload':
        setShowUpload(true);
        break;
      case 'compare':
        router.push('/dashboard/compare');
        break;
      case 'repository':
        setShowCreateRepo(true);
        break;
    }
  };

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      try {
        const { document } = await api.uploadDocument(file, currentWorkspace?.id);
        setDocuments((prev) => [document, ...prev].slice(0, 4));
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    setShowUpload(false);
  };

  const handleCreateRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;

    setCreatingRepo(true);
    try {
      const { repository } = await api.createRepository({
        name: newRepoName.trim(),
        description: newRepoDescription.trim() || undefined,
        color: newRepoColor,
      });
      setRepositories((prev) => [repository, ...prev]);
      setShowCreateRepo(false);
      setNewRepoName('');
      setNewRepoDescription('');
      setNewRepoColor(REPO_COLORS[0]);
      router.push(`/dashboard/repositories/${repository.id}`);
    } catch (error) {
      console.error('Failed to create repository:', error);
    } finally {
      setCreatingRepo(false);
    }
  };

  const handleDeleteRepository = async (repoId: string) => {
    if (!confirm('Are you sure you want to delete this repository? This will not delete the contents, only remove them from the repository.')) {
      return;
    }

    try {
      await api.deleteRepository(repoId);
      setRepositories((prev) => prev.filter((r) => r.id !== repoId));
    } catch (error) {
      console.error('Failed to delete repository:', error);
    }
  };

  const startRename = (analysis: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(analysis.id);
    setEditTitle(analysis.title);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleRename = async (analysisId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await api.updateAnalysis(analysisId, { title: editTitle.trim() });
      setRecentAnalyses((prev) =>
        prev.map((a) => (a.id === analysisId ? { ...a, title: editTitle.trim() } : a))
      );
    } catch (error) {
      console.error('Failed to rename analysis:', error);
    } finally {
      setEditingId(null);
    }
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleDeleteAnalysis = async (analysisId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteAnalysis(analysisId);
      setRecentAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
    } catch (error) {
      console.error('Failed to delete analysis:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-2 text-foreground-secondary">
            Here's what's happening in your research workspace
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card
              key={action.action}
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg"
              onClick={() => handleQuickAction(action.action)}
            >
              <CardContent className="p-4">
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <h3 className="font-medium">{action.title}</h3>
                <p className="mt-1 text-sm text-foreground-tertiary">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Repositories Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Repositories</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateRepo(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Repository
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-background-secondary"
                />
              ))}
            </div>
          ) : repositories.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {repositories.map((repo) => (
                <Card
                  key={repo.id}
                  className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg"
                  onClick={() => router.push(`/dashboard/repositories/${repo.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${repo.color}20` }}
                        >
                          <Folder className="h-5 w-5" style={{ color: repo.color }} />
                        </div>
                        <div>
                          <h3 className="font-medium">{repo.name}</h3>
                          {repo.description && (
                            <p className="text-sm text-foreground-tertiary line-clamp-1">
                              {repo.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Menu
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <MenuItem
                          icon={<Trash2 className="h-4 w-4" />}
                          variant="danger"
                          onClick={() => handleDeleteRepository(repo.id)}
                        >
                          Delete
                        </MenuItem>
                      </Menu>
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-sm text-foreground-tertiary">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {repo._count?.analyses || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {repo._count?.documents || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitCompare className="h-3.5 w-3.5" />
                        {repo._count?.comparisons || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-purple/20">
                <Folder className="h-6 w-6 text-accent-purple" />
              </div>
              <h3 className="font-medium">No repositories yet</h3>
              <p className="mt-1 text-sm text-foreground-tertiary">
                Create repositories to organize your analyses, documents, and comparisons by project
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateRepo(true)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Repository
              </Button>
            </Card>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Analyses */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Analyses</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction('analysis')}
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl bg-background-secondary"
                  />
                ))}
              </div>
            ) : recentAnalyses.length > 0 ? (
              <div className="space-y-3">
                {recentAnalyses.map((analysis) => (
                  <Card
                    key={analysis.id}
                    className="group cursor-pointer transition-all hover:border-primary/50"
                    onClick={() => editingId !== analysis.id && router.push(`/dashboard/chat/${analysis.id}`)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        {editingId === analysis.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              ref={editInputRef}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(analysis.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="h-8 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(analysis.id);
                              }}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={cancelRename}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{analysis.title}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                                onClick={(e) => startRename(analysis, e)}
                              >
                                <Pencil className="h-3.5 w-3.5 text-foreground-tertiary hover:text-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                                onClick={(e) => handleDeleteAnalysis(analysis.id, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-foreground-tertiary hover:text-red-500" />
                              </Button>
                            </div>
                            <p className="text-sm text-foreground-tertiary">
                              {analysis._count?.messages || 0} messages ·{' '}
                              {formatDate(analysis.updatedAt)}
                            </p>
                          </>
                        )}
                      </div>
                      {editingId !== analysis.id && (
                        <ArrowRight className="h-4 w-4 text-foreground-tertiary ml-2" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium">No analyses yet</h3>
                <p className="mt-1 text-sm text-foreground-tertiary">
                  Start your first analysis to begin extracting insights
                </p>
                <Button
                  className="mt-4"
                  onClick={() => handleQuickAction('analysis')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Analysis
                </Button>
              </Card>
            )}
          </div>

          {/* Recent Documents */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Documents</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/documents')}>
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl bg-background-secondary"
                  />
                ))}
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onView={() => router.push(`/dashboard/documents?view=${doc.id}`)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-teal/20">
                  <FileText className="h-6 w-6 text-accent-teal" />
                </div>
                <h3 className="font-medium">No documents yet</h3>
                <p className="mt-1 text-sm text-foreground-tertiary">
                  Upload your first document to get started
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setShowUpload(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Documents"
        description="Add documents to your library for analysis"
        size="lg"
      >
        <UploadZone onUpload={handleUpload} />
      </Modal>

      {/* Create Repository Modal */}
      <Modal
        isOpen={showCreateRepo}
        onClose={() => setShowCreateRepo(false)}
        title="Create Repository"
        description="Organize your analyses, documents, and comparisons by project"
      >
        <form onSubmit={handleCreateRepository} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Q4 Research Project"
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="What is this repository for?"
            value={newRepoDescription}
            onChange={(e) => setNewRepoDescription(e.target.value)}
          />
          <div>
            <label className="mb-2 block text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {REPO_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewRepoColor(color)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    newRepoColor === color && 'ring-2 ring-offset-2 ring-offset-background'
                  )}
                  style={{ backgroundColor: color, outlineColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreateRepo(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creatingRepo}>
              Create Repository
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
