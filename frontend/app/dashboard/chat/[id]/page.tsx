'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Paperclip, Plus, Pencil, Check, X, Download, Eye } from 'lucide-react';
import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DocumentListItem } from '@/components/documents/document-card';
import { UploadZone } from '@/components/documents/upload-zone';
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleEditTitle}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditedTitle(analysis?.title || '');
                  }}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="font-semibold truncate">{analysis?.title || 'Analysis'}</h1>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 text-foreground-tertiary" />
                  </Button>
                )}
              </div>
            )}
            {documents.length > 0 && !isEditingTitle && (
              <span className="rounded-full bg-background-secondary px-2 py-0.5 text-xs text-foreground-tertiary shrink-0">
                {documents.length} doc{documents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!canEdit && (
              <span className="flex items-center gap-1 rounded-full bg-background-secondary px-2 py-0.5 text-xs text-foreground-tertiary">
                <Eye className="h-3 w-3" />
                View only
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              <Download className="mr-1 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDocuments(true)}
            >
              <Paperclip className="mr-1 h-4 w-4" />
              Documents
            </Button>
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
          disabled={sending || !canEdit}
          attachedFiles={documents.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
          }))}
          placeholder={canEdit ? undefined : 'View only - you cannot send messages'}
        />
      </div>

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
    </div>
  );
}
