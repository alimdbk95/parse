'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Grid, List, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { DocumentCard } from '@/components/documents/document-card';
import { UploadZone } from '@/components/documents/upload-zone';
import { Tabs } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'pdf', label: 'PDF' },
  { id: 'csv', label: 'CSV' },
  { id: 'excel', label: 'Excel' },
  { id: 'image', label: 'Images' },
];

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspace } = useStore();

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteDoc, setDeleteDoc] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { documents } = await api.getDocuments(currentWorkspace?.id);
      setDocuments(documents);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      try {
        const { document } = await api.uploadDocument(file, currentWorkspace?.id);
        setDocuments((prev) => [document, ...prev]);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    setShowUpload(false);
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);

    try {
      await api.deleteDocument(deleteDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      setDeleteDoc(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleStartAnalysis = async (documentId: string) => {
    try {
      const { analysis } = await api.createAnalysis({
        title: 'New Analysis',
        documentIds: [documentId],
      });
      router.push(`/dashboard/chat/${analysis.id}`);
    } catch (error) {
      console.error('Failed to create analysis:', error);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    // Search filter
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (activeFilter !== 'all') {
      const type = doc.type.toLowerCase();
      if (activeFilter === 'pdf' && type !== 'pdf') return false;
      if (activeFilter === 'csv' && type !== 'csv') return false;
      if (activeFilter === 'excel' && !['xls', 'xlsx'].includes(type)) return false;
      if (activeFilter === 'image' && !['png', 'jpg', 'jpeg', 'gif'].includes(type))
        return false;
    }

    return true;
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-4 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Documents</h1>
            <p className="mt-1 text-sm md:text-base text-foreground-secondary">
              Manage and organize your research documents
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="overflow-x-auto">
            <Tabs
              tabs={filterTabs}
              activeTab={activeFilter}
              onChange={setActiveFilter}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 md:w-64">
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex rounded-lg border border-border shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Documents Grid/List */}
        {loading ? (
          <div
            className={cn(
              'gap-4',
              viewMode === 'grid'
                ? 'grid sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'
            )}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-background-secondary"
              />
            ))}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div
            className={cn(
              'gap-4',
              viewMode === 'grid'
                ? 'grid sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'
            )}
          >
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={() => handleStartAnalysis(doc.id)}
                onDelete={() => setDeleteDoc(doc)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-background-secondary">
              <FileText className="h-8 w-8 text-foreground-tertiary" />
            </div>
            <h3 className="text-lg font-medium">No documents found</h3>
            <p className="mt-1 text-foreground-secondary">
              {searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first document to get started'}
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <Button className="mt-4" onClick={() => setShowUpload(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Documents"
        description="Add documents to your library"
        size="lg"
      >
        <UploadZone onUpload={handleUpload} />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteDoc?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
