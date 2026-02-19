'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Paperclip, Plus, Pencil, Check, X, Download, Eye, FolderPlus, Folder, FileText, Image, ChevronDown } from 'lucide-react';
import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentListItem } from '@/components/documents/document-card';
import { UploadZone } from '@/components/documents/upload-zone';
import { Menu, MenuItem } from '@/components/ui/dropdown';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string; avatar?: string };
  createdAt: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;
  const { user, currentWorkspace } = useStore();

  const [analysis, setAnalysis] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [userRole, setUserRole] = useState<string>('viewer');
  const [showSaveToRepo, setShowSaveToRepo] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [savingToRepo, setSavingToRepo] = useState(false);

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Comments state
  const [messageComments, setMessageComments] = useState<Record<string, Comment[]>>({});

  // Check if user can edit (admin or editor)
  const canEdit = userRole === 'admin' || userRole === 'editor';

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const { analysis, userRole: role } = await api.getAnalysis(analysisId);
        setAnalysis(analysis);
        setUserRole(role);
        setEditedTitle(analysis.title);

        // Parse message metadata (including charts) from JSON strings
        const parsedMessages = (analysis.messages || []).map((msg: any) => ({
          ...msg,
          metadata: msg.metadata ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : null,
        }));
        setMessages(parsedMessages);
        setDocuments(analysis.documents?.map((d: any) => d.document) || []);

        // Fetch available documents for adding
        const { documents: allDocs } = await api.getDocuments();
        setAvailableDocs(allDocs);
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [analysisId, router]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || sending) return;

    // Optimistically add user message
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user' as const,
      content,
      createdAt: new Date().toISOString(),
      user: { name: user?.name || 'You' },
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setSending(true);

    try {
      const { userMessage, assistantMessage, chart } = await api.sendMessage(
        analysisId,
        content
      );

      // If a chart was generated, attach it to the assistant message metadata
      let messageWithChart = assistantMessage;
      if (chart) {
        const chartData = {
          type: chart.type,
          title: chart.title,
          data: typeof chart.data === 'string' ? JSON.parse(chart.data) : chart.data,
        };
        messageWithChart = {
          ...assistantMessage,
          metadata: { chart: chartData },
        };
      }

      // Replace temp message and add assistant response with inline chart
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        return [...filtered, userMessage, messageWithChart];
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setSending(false);
    }
  };

  const handleAddDocument = async (documentId: string) => {
    try {
      const { analysisDocument } = await api.addDocumentToAnalysis(
        analysisId,
        documentId
      );
      setDocuments((prev) => [...prev, analysisDocument.document]);
      setShowDocuments(false);
    } catch (error) {
      console.error('Failed to add document:', error);
    }
  };

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      try {
        const { document } = await api.uploadDocument(file, currentWorkspace?.id);
        setAvailableDocs((prev) => [document, ...prev]);
        // Automatically add to analysis
        await handleAddDocument(document.id);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    setShowUpload(false);
  };

  const handleRemoveDocument = async (documentId: string) => {
    try {
      await api.removeDocumentFromAnalysis(analysisId, documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  };

  const handleEditTitle = async () => {
    if (!editedTitle.trim() || editedTitle === analysis?.title) {
      setIsEditingTitle(false);
      setEditedTitle(analysis?.title || '');
      return;
    }

    try {
      await api.updateAnalysis(analysisId, { title: editedTitle.trim() });
      setAnalysis((prev: any) => ({ ...prev, title: editedTitle.trim() }));
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Failed to update title:', error);
      setEditedTitle(analysis?.title || '');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const { message } = await api.updateMessage(analysisId, messageId, newContent);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: message.content, isEdited: true }
            : m
        )
      );
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  };

  const handleAddComment = async (messageId: string, content: string) => {
    try {
      const { comment } = await api.addMessageComment(analysisId, messageId, content);
      setMessageComments((prev) => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), comment],
      }));
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      setMessageComments((prev) => {
        const updated = { ...prev };
        for (const messageId in updated) {
          updated[messageId] = updated[messageId].filter((c) => c.id !== commentId);
        }
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await api.exportAnalysisPdf(analysisId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${analysis?.title || 'analysis'}_export.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportChartsAsImage = async (format: 'png' | 'jpeg') => {
    setExporting(true);
    try {
      // Find all chart containers in the page
      const chartElements = document.querySelectorAll('[data-chart-container]');

      if (chartElements.length === 0) {
        alert('No charts found to export');
        setExporting(false);
        return;
      }

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      for (let i = 0; i < chartElements.length; i++) {
        const chartEl = chartElements[i] as HTMLElement;
        const canvas = await html2canvas(chartEl, {
          backgroundColor: '#0a0a0f',
          scale: 2,
        });

        const link = document.createElement('a');
        link.download = `${analysis?.title || 'chart'}_${i + 1}.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.95 : undefined);
        link.click();
      }
    } catch (error) {
      console.error(`Failed to export charts as ${format.toUpperCase()}:`, error);
    } finally {
      setExporting(false);
    }
  };

  const handleOpenSaveToRepo = async () => {
    try {
      const { repositories } = await api.getRepositories();
      setRepositories(repositories);
      setShowSaveToRepo(true);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    }
  };

  const handleSaveToRepository = async (repositoryId: string) => {
    setSavingToRepo(true);
    try {
      await api.addAnalysisToRepository(repositoryId, analysisId);
      setShowSaveToRepo(false);
    } catch (error: any) {
      if (error.message?.includes('already')) {
        alert('This analysis is already in the selected repository');
      } else {
        console.error('Failed to save to repository:', error);
      }
    } finally {
      setSavingToRepo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Minimal Header */}
      <header className="flex h-12 items-center justify-between border-b border-border/50 px-2 md:px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditTitle();
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                    setEditedTitle(analysis?.title || '');
                  }
                }}
                className="h-8 max-w-xs"
                autoFocus
              />
              <button
                className="p-1.5 rounded hover:bg-background-tertiary"
                onClick={handleEditTitle}
              >
                <Check className="h-4 w-4 text-green-500" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-background-tertiary"
                onClick={() => {
                  setIsEditingTitle(false);
                  setEditedTitle(analysis?.title || '');
                }}
              >
                <X className="h-4 w-4 text-red-500" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-sm font-medium text-foreground truncate">
                {analysis?.title || 'New Analysis'}
              </h1>
              {canEdit && (
                <button
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-background-tertiary transition-all"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <Pencil className="h-3 w-3 text-foreground-tertiary" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!canEdit && (
            <span className="hidden sm:flex items-center gap-1 rounded-full bg-background-secondary px-2 py-0.5 text-xs text-foreground-tertiary mr-2">
              <Eye className="h-3 w-3" />
              View only
            </span>
          )}
          <button
            onClick={handleOpenSaveToRepo}
            className="p-2 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary transition-colors"
            title="Save to Repository"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
          <Menu
            trigger={
              <button
                disabled={exporting}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50"
                title="Download"
              >
                <Download className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </button>
            }
          >
            <MenuItem
              icon={<FileText className="h-4 w-4" />}
              onClick={handleExportPdf}
            >
              Download as PDF
            </MenuItem>
            <MenuItem
              icon={<Image className="h-4 w-4" />}
              onClick={() => handleExportChartsAsImage('png')}
            >
              Download Charts as PNG
            </MenuItem>
            <MenuItem
              icon={<Image className="h-4 w-4" />}
              onClick={() => handleExportChartsAsImage('jpeg')}
            >
              Download Charts as JPEG
            </MenuItem>
          </Menu>
          <button
            onClick={() => setShowDocuments(true)}
            className="p-2 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary transition-colors"
            title="Documents"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          {documents.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {documents.length}
            </span>
          )}
        </div>
      </header>

        {/* Messages */}
        <MessageList
          messages={messages}
          loading={sending}
          userName={user?.name}
          currentUserId={user?.id}
          messageComments={messageComments}
          onEditMessage={canEdit ? handleEditMessage : undefined}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          readOnly={!canEdit}
        />

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        onAttach={() => setShowDocuments(true)}
        attachedFiles={documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
        }))}
        onRemoveFile={canEdit ? handleRemoveDocument : undefined}
        disabled={sending || !canEdit}
        placeholder={canEdit ? 'Ask about your data...' : 'View only - you cannot send messages'}
      />

      {/* Documents Modal */}
      <Modal
        isOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
        title="Manage Documents"
        description="Add or upload documents for this analysis"
        size="lg"
      >
        <div className="space-y-4">
          {/* Attached Documents */}
          {documents.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground-secondary">
                Attached to Analysis
              </h3>
              <div className="space-y-1 rounded-lg bg-background-tertiary p-2">
                {documents.map((doc) => (
                  <DocumentListItem
                    key={doc.id}
                    document={doc}
                    selected
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available Documents */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground-secondary">
                Available Documents
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDocuments(false);
                  setShowUpload(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Upload New
              </Button>
            </div>
            {availableDocs.filter(
              (d) => !documents.find((doc) => doc.id === d.id)
            ).length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg bg-background-tertiary p-2">
                {availableDocs
                  .filter((d) => !documents.find((doc) => doc.id === d.id))
                  .map((doc) => (
                    <DocumentListItem
                      key={doc.id}
                      document={doc}
                      onSelect={() => handleAddDocument(doc.id)}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-tertiary">
                No other documents available. Upload a new one!
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Documents"
        description="Upload files to analyze"
        size="lg"
      >
        <UploadZone onUpload={handleUpload} />
      </Modal>

      {/* Save to Repository Modal */}
      <Modal
        isOpen={showSaveToRepo}
        onClose={() => setShowSaveToRepo(false)}
        title="Save to Repository"
        description="Add this analysis to a repository for organization"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {repositories.length > 0 ? (
            repositories.map((repo) => (
              <Card
                key={repo.id}
                className="cursor-pointer transition-all hover:border-primary/50"
                onClick={() => !savingToRepo && handleSaveToRepository(repo.id)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${repo.color}20` }}
                  >
                    <Folder className="h-5 w-5" style={{ color: repo.color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{repo.name}</h4>
                    {repo.description && (
                      <p className="text-sm text-foreground-tertiary line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  <Plus className="h-4 w-4 text-foreground-tertiary" />
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-purple/20">
                <Folder className="h-6 w-6 text-accent-purple" />
              </div>
              <p className="text-foreground-tertiary mb-4">No repositories yet</p>
              <Button onClick={() => {
                setShowSaveToRepo(false);
                router.push('/dashboard');
              }}>
                Create Repository
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
