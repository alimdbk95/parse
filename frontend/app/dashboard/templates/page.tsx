'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  Copy,
  Trash2,
  MoreHorizontal,
  Layout,
  Lock,
  Globe,
  Clock,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function TemplatesPage() {
  const router = useRouter();
  const { currentWorkspace } = useStore();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { templates } = await api.getTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;

    try {
      setCreating(true);
      const { template } = await api.createTemplate({
        name: newTemplateName,
        description: newTemplateDesc,
        workspaceId: currentWorkspace?.id,
      });
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      router.push(`/dashboard/templates/${template.id}`);
    } catch (error) {
      console.error('Failed to create template:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const { template } = await api.duplicateTemplate(id);
      setTemplates([template, ...templates]);
      setActiveMenu(null);
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
      setActiveMenu(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'chart':
        return '📊';
      case 'text':
        return '📝';
      case 'heading':
        return '📌';
      case 'image':
        return '🖼️';
      case 'table':
        return '📋';
      default:
        return '📄';
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Templates</h1>
            <p className="mt-1 text-sm text-foreground-secondary">
              Create reusable report templates with charts and text
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-background-tertiary p-4">
              <Layout className="h-8 w-8 text-foreground-tertiary" />
            </div>
            <h3 className="text-lg font-medium">No templates yet</h3>
            <p className="mt-1 text-sm text-foreground-secondary">
              Create your first template to start building reports
            </p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="group cursor-pointer transition-all hover:border-foreground-tertiary"
                onClick={() => router.push(`/dashboard/templates/${template.id}`)}
              >
                <CardContent className="p-4">
                  {/* Preview area */}
                  <div className="mb-3 aspect-[4/3] rounded-lg bg-background-tertiary flex items-center justify-center overflow-hidden">
                    {template.sections?.length > 0 ? (
                      <div className="flex flex-wrap gap-1 p-2">
                        {template.sections.slice(0, 6).map((section: any, i: number) => (
                          <div
                            key={i}
                            className={cn(
                              'h-6 rounded bg-background flex items-center justify-center text-xs',
                              section.width === 'full' ? 'w-full' : 'w-[48%]'
                            )}
                          >
                            {getSectionIcon(section.type)}
                          </div>
                        ))}
                        {template.sections.length > 6 && (
                          <div className="w-full text-center text-xs text-foreground-tertiary">
                            +{template.sections.length - 6} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <FileText className="h-12 w-12 text-foreground-tertiary" />
                    )}
                  </div>

                  {/* Template info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{template.name}</h3>
                        {template.isPublic ? (
                          <Globe className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-foreground-tertiary flex-shrink-0" />
                        )}
                      </div>
                      {template.description && (
                        <p className="mt-0.5 text-sm text-foreground-secondary truncate">
                          {template.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-foreground-tertiary">
                        <span className="flex items-center gap-1">
                          <Layout className="h-3 w-3" />
                          {template._count?.sections || template.sections?.length || 0} sections
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Actions menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === template.id ? null : template.id);
                        }}
                        className="p-1 rounded hover:bg-background-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {activeMenu === template.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenu(null);
                            }}
                          />
                          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-background-secondary shadow-lg py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(template.id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-background-tertiary"
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(template.id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-background-tertiary"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Template"
        description="Create a new reusable report template"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Q4 Report Template"
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={newTemplateDesc}
            onChange={(e) => setNewTemplateDesc(e.target.value)}
            placeholder="Template for quarterly reports..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!newTemplateName.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
