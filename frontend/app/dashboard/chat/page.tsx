'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, MessageSquare, ArrowRight, Pencil, Check, X, Trash2,
  Search, Folder, FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

const REPO_COLORS = [
  '#7C9FF5', '#E879B9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'
];

export default function ChatListPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // New chat with repository
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  // Create repository modal
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoColor, setNewRepoColor] = useState(REPO_COLORS[0]);
  const [creatingRepo, setCreatingRepo] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analysesRes, reposRes] = await Promise.all([
        api.getAnalyses(),
        api.getRepositories(),
      ]);
      setAnalyses(analysesRes.analyses);
      setRepositories(reposRes.repositories);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnalysis = async () => {
    setCreating(true);
    try {
      const { analysis } = await api.createAnalysis({
        title: newChatTitle.trim() || 'New Analysis',
      });

      // If a repository is selected, add the analysis to it
      if (selectedRepoId) {
        await api.addAnalysisToRepository(selectedRepoId, analysis.id);
      }

      router.push(`/dashboard/chat/${analysis.id}`);
    } catch (error) {
      console.error('Failed to create analysis:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleQuickCreate = async () => {
    setCreating(true);
    try {
      const { analysis } = await api.createAnalysis({ title: 'New Analysis' });
      router.push(`/dashboard/chat/${analysis.id}`);
    } catch (error) {
      console.error('Failed to create analysis:', error);
    } finally {
      setCreating(false);
    }
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
      setSelectedRepoId(repository.id);
      setShowCreateRepo(false);
      setNewRepoName('');
      setNewRepoDescription('');
      setNewRepoColor(REPO_COLORS[0]);
    } catch (error) {
      console.error('Failed to create repository:', error);
    } finally {
      setCreatingRepo(false);
    }
  };

  const handleRename = async (analysisId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await api.updateAnalysis(analysisId, { title: editTitle.trim() });
      setAnalyses((prev) =>
        prev.map((a) => (a.id === analysisId ? { ...a, title: editTitle.trim() } : a))
      );
    } catch (error) {
      console.error('Failed to rename analysis:', error);
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (analysisId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this analysis?')) {
      return;
    }

    try {
      await api.deleteAnalysis(analysisId);
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
    } catch (error) {
      console.error('Failed to delete analysis:', error);
    }
  };

  const filteredAnalyses = analyses.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl p-4 md:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-background-secondary rounded" />
            <div className="h-12 bg-background-secondary rounded" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-background-secondary rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl p-8">
        {/* Header */}
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Analyses</h1>
            <p className="text-sm md:text-base text-foreground-secondary">
              Start a new analysis or continue an existing one
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setShowNewChat(true)} className="w-full sm:w-auto">
              <FolderPlus className="mr-2 h-4 w-4" />
              New with Repository
            </Button>
            <Button onClick={handleQuickCreate} loading={creating} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Quick Start
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 md:mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" />
          <Input
            placeholder="Search analyses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Analyses List */}
        {filteredAnalyses.length > 0 ? (
          <div className="space-y-3">
            {filteredAnalyses.map((analysis) => (
              <Card
                key={analysis.id}
                className="group cursor-pointer transition-all hover:border-primary/50"
                onClick={() => editingId !== analysis.id && router.push(`/dashboard/chat/${analysis.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 shrink-0">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === analysis.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(analysis.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleRename(analysis.id)}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                            }}
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
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(analysis.id);
                                setEditTitle(analysis.title);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 text-foreground-tertiary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => handleDelete(analysis.id, e)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-foreground-tertiary hover:text-red-500" />
                            </Button>
                          </div>
                          <p className="text-sm text-foreground-tertiary">
                            {analysis._count?.messages || 0} messages · {formatDate(analysis.updatedAt)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {editingId !== analysis.id && (
                    <ArrowRight className="h-4 w-4 text-foreground-tertiary ml-4 shrink-0" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium">
              {searchQuery ? 'No analyses found' : 'No analyses yet'}
            </h3>
            <p className="mt-2 text-foreground-tertiary">
              {searchQuery
                ? 'Try a different search term'
                : 'Start your first analysis to begin extracting insights'}
            </p>
            {!searchQuery && (
              <Button className="mt-6" onClick={handleQuickCreate} loading={creating}>
                <Plus className="mr-2 h-4 w-4" />
                Create Analysis
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* New Chat with Repository Modal */}
      <Modal
        isOpen={showNewChat}
        onClose={() => {
          setShowNewChat(false);
          setNewChatTitle('');
          setSelectedRepoId(null);
        }}
        title="New Analysis"
        description="Create a new analysis and optionally add it to a repository"
      >
        <div className="space-y-4">
          <Input
            label="Title (optional)"
            placeholder="e.g., Q4 Sales Analysis"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
          />

          <div>
            <label className="mb-2 block text-sm font-medium">
              Add to Repository (optional)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => setSelectedRepoId(selectedRepoId === repo.id ? null : repo.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    selectedRepoId === repo.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${repo.color}20` }}
                  >
                    <Folder className="h-4 w-4" style={{ color: repo.color }} />
                  </div>
                  <span className="font-medium">{repo.name}</span>
                </div>
              ))}
              <button
                onClick={() => setShowCreateRepo(true)}
                className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/50 w-full transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-tertiary">
                  <Plus className="h-4 w-4 text-foreground-tertiary" />
                </div>
                <span className="text-foreground-secondary">Create new repository</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowNewChat(false);
                setNewChatTitle('');
                setSelectedRepoId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAnalysis} loading={creating}>
              Create Analysis
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Repository Modal */}
      <Modal
        isOpen={showCreateRepo}
        onClose={() => setShowCreateRepo(false)}
        title="Create Repository"
        description="Create a new repository to organize your work"
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
                  style={{ backgroundColor: color }}
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
