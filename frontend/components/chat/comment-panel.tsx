'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, Trash2, Pencil, Check, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string; avatar?: string };
  createdAt: string;
  messageId?: string;
}

interface CommentThread {
  messageId: string;
  messagePreview: string;
  comments: Comment[];
}

interface CommentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  threads: CommentThread[];
  currentUserId?: string;
  onAddComment: (messageId: string, content: string) => Promise<void>;
  onUpdateComment: (messageId: string, commentId: string, content: string) => Promise<void>;
  onDeleteComment: (messageId: string, commentId: string) => Promise<void>;
  onScrollToMessage?: (messageId: string) => void;
}

export function CommentPanel({
  isOpen,
  onClose,
  threads,
  currentUserId,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onScrollToMessage,
}: CommentPanelProps) {
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opening a thread
  useEffect(() => {
    if (activeThread && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeThread]);

  const handleSubmitComment = async (messageId: string) => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddComment(messageId, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (messageId: string, commentId: string) => {
    if (!editingContent.trim()) return;
    try {
      await onUpdateComment(messageId, commentId, editingContent.trim());
      setEditingCommentId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDeleteComment = async (messageId: string, commentId: string) => {
    try {
      await onDeleteComment(messageId, commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const totalComments = threads.reduce((acc, t) => acc + t.comments.length, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-background border-l border-border shadow-2xl",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Comments</h2>
                {totalComments > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {totalComments}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-foreground-tertiary" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No comments yet</h3>
                  <p className="text-sm text-foreground-tertiary max-w-[240px]">
                    Click on the comment button on any AI response to start a discussion
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {threads.map((thread) => (
                    <div key={thread.messageId} className="group">
                      {/* Thread Header - Message Preview */}
                      <button
                        onClick={() => {
                          setActiveThread(activeThread === thread.messageId ? null : thread.messageId);
                          if (onScrollToMessage) {
                            onScrollToMessage(thread.messageId);
                          }
                        }}
                        className="w-full p-4 text-left hover:bg-background-secondary/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">P</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">Parse AI</span>
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                                {thread.comments.length} {thread.comments.length === 1 ? 'comment' : 'comments'}
                              </span>
                            </div>
                            <p className="text-sm text-foreground-secondary line-clamp-2">
                              {thread.messagePreview}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Thread Comments */}
                      <AnimatePresence>
                        {activeThread === thread.messageId && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-background-secondary/30"
                          >
                            <div className="px-4 py-3 space-y-3">
                              {/* Comments List */}
                              {thread.comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="group/comment flex gap-3"
                                >
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-accent-purple/60 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-white">
                                      {comment.author?.name?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{comment.author?.name}</span>
                                      <span className="text-xs text-foreground-tertiary">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    {editingCommentId === comment.id ? (
                                      <div className="mt-1 flex gap-2">
                                        <input
                                          type="text"
                                          value={editingContent}
                                          onChange={(e) => setEditingContent(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleUpdateComment(thread.messageId, comment.id);
                                            if (e.key === 'Escape') {
                                              setEditingCommentId(null);
                                              setEditingContent('');
                                            }
                                          }}
                                          className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleUpdateComment(thread.messageId, comment.id)}
                                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        >
                                          <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingCommentId(null);
                                            setEditingContent('');
                                          }}
                                          className="p-1.5 text-foreground-tertiary hover:bg-background-tertiary rounded-lg transition-colors"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="mt-0.5 text-sm text-foreground-secondary">
                                        {comment.content}
                                      </p>
                                    )}
                                  </div>
                                  {/* Comment Actions */}
                                  {currentUserId === comment.author?.id && editingCommentId !== comment.id && (
                                    <div className="flex items-start gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditingContent(comment.content);
                                        }}
                                        className="p-1.5 text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
                                        title="Edit"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(thread.messageId, comment.id)}
                                        className="p-1.5 text-foreground-tertiary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Add Comment Input */}
                              <div className="flex items-center gap-2 pt-2">
                                <input
                                  ref={inputRef}
                                  type="text"
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSubmitComment(thread.messageId);
                                    }
                                  }}
                                  placeholder="Reply..."
                                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 placeholder:text-foreground-tertiary"
                                  style={{ fontSize: '16px' }}
                                  disabled={isSubmitting}
                                />
                                <motion.button
                                  onClick={() => handleSubmitComment(thread.messageId)}
                                  disabled={!newComment.trim() || isSubmitting}
                                  whileTap={{ scale: 0.9 }}
                                  className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    newComment.trim()
                                      ? "bg-primary text-white hover:bg-primary/90"
                                      : "bg-background-tertiary text-foreground-tertiary"
                                  )}
                                >
                                  {isSubmitting ? (
                                    <motion.div
                                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                    />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            {threads.length > 0 && (
              <div className="p-3 border-t border-border bg-background-secondary/30">
                <p className="text-xs text-foreground-tertiary text-center">
                  Click on a thread to expand and reply
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
