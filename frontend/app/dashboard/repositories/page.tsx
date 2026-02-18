'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Search, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

const REPO_COLORS = [
  '#7C9FF5', '#E879B9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'
];

export default function RepositoriesPage() {
  const router = useRouter();
  const [repositories, setRepositories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(REPO_COLORS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const { repositories } = await api.getRepositories();
      setRepositories(repositories);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const { repository } = await api.createRepository({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
      });
      setRepositories((prev) => [repository, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      setNewColor(REPO_COLORS[0]);
    } catch (error) {
      console.error('Failed to create repository:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (repoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this repository?')) return;

    try {
      await api.deleteRepository(repoId);
      setRepositories((prev) => prev.filter((r) => r.id !== repoId));
    } catch (error) {
      console.error('Failed to delete repository:', error);
    }
  };

  const filteredRepositories = repositories.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl p-4 md:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-background-secondary rounded" />
            <div className="h-12 bg-background-secondary rounded" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-background-secondary rounded-xl" />
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
            <h1 className="text-xl md:text-2xl font-bold">Repositories</h1>
            <p className="text-sm md:text-base text-foreground-secondary">
              Organize your analyses, documents, and comparisons
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Repository
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4 md:mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Repositories Grid */}
        {filteredRepositories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {filteredRepositories.map((repo) => (
              <Card
                key={repo.id}
                className="group cursor-pointer transition-all hover:border-primary/50"
                onClick={() => router.push(`/dashboard/repositories/${repo.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${repo.color}20` }}
                    >
                      <Folder className="h-5 w-5" style={{ color: repo.color }} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/repositories/${repo.id}`);
                        }}
                        className="p-1.5 rounded hover:bg-background-tertiary"
                      >
                        <Pencil className="h-3.5 w-3.5 text-foreground-tertiary" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(repo.id, e)}
                        className="p-1.5 rounded hover:bg-background-tertiary"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-foreground-tertiary hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium mb-1">{repo.name}</h3>
                  {repo.description && (
                    <p className="text-sm text-foreground-tertiary line-clamp-2 mb-3">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-foreground-tertiary">
                    <span>
                      {repo._count?.analyses || 0} analyses · {repo._count?.documents || 0} docs
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
              <Folder className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium">
              {searchQuery ? 'No repositories found' : 'No repositories yet'}
            </h3>
            <p className="mt-2 text-foreground-tertiary">
              {searchQuery
                ? 'Try a different search term'
                : 'Create a repository to organize your work'}
            </p>
            {!searchQuery && (
              <Button className="mt-6" onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Repository
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Repository"
        description="Create a new repository to organize your work"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Q4 Research Project"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="What is this repository for?"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div>
            <label className="mb-2 block text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {REPO_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    newColor === color && 'ring-2 ring-offset-2 ring-offset-background'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Repository
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
