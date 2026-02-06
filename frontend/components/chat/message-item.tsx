'use client';

import { motion } from 'framer-motion';
import { Copy, Check, RefreshCw, Pencil, X, Save, MessageSquare, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatTime } from '@/lib/utils';
import { ChartRenderer } from '@/components/charts/chart-renderer';

interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string; avatar?: string };
  createdAt: string;
}

interface MessageItemProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: any;
    createdAt: string;
    isEdited?: boolean;
    user?: { name: string };
  };
  userName?: string;
  currentUserId?: string;
  onRetry?: () => void;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onAddComment?: (messageId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  comments?: Comment[];
}

export function MessageItem({
  message,
  userName = 'You',
  currentUserId,
  onRetry,
  onEdit,
  onAddComment,
  onDeleteComment,
  comments = [],
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const isUser = message.role === 'user';
  const chartData = message.metadata?.chart;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = async () => {
    if (!onEdit || !editedContent.trim() || editedContent === message.content) {
      setIsEditing(false);
      setEditedContent(message.content);
      return;
    }

    setSaving(true);
    try {
      await onEdit(message.id, editedContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save edit:', error);
      setEditedContent(message.content);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const handleAddComment = async () => {
    if (!onAddComment || !newComment.trim()) return;

    setAddingComment(true);
    try {
      await onAddComment(message.id, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  const renderContent = (content: string) => {
    if (isEditing) {
      return (
        <div className="space-y-3">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full min-h-[150px] p-3 rounded-lg bg-background-tertiary border border-border text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Edit the response..."
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={saving || !editedContent.trim()}
              className="h-8"
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={saving}
              className="h-8"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    // Simple markdown-like rendering
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="font-semibold mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <li key={i} className="ml-4 text-foreground-secondary">
            {line.replace(/^[-•]\s/, '')}
          </li>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={i} className="ml-4 text-foreground-secondary list-decimal">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      }
      // Table rows
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(Boolean).map(c => c.trim());
        if (line.includes('---')) return null;
        return (
          <tr key={i} className="border-b border-border">
            {cells.map((cell, j) => (
              <td key={j} className="px-3 py-2 text-sm">{cell}</td>
            ))}
          </tr>
        );
      }
      // Regular text
      if (line.trim()) {
        return (
          <p key={i} className="text-foreground-secondary mb-2">
            {line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                 .split(/(<strong>.*?<\/strong>)/)
                 .map((part, j) => {
                   if (part.startsWith('<strong>')) {
                     return <strong key={j} className="text-foreground">{part.replace(/<\/?strong>/g, '')}</strong>;
                   }
                   return part;
                 })}
          </p>
        );
      }
      return <br key={i} />;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-4 px-4 py-6', isUser && 'bg-background-secondary/50')}
    >
      <Avatar
        name={isUser ? userName : 'Parse'}
        size="sm"
        className={cn(!isUser && 'bg-primary')}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? message.user?.name || userName : 'Parse'}
          </span>
          <span className="text-xs text-foreground-tertiary">
            {formatTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-xs text-foreground-tertiary">(edited)</span>
          )}
        </div>

        <div className="prose prose-invert max-w-none">
          {renderContent(message.content)}
        </div>

        {/* Chart */}
        {chartData && !isEditing && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <h4 className="mb-3 font-medium">{chartData.title}</h4>
            <ChartRenderer
              type={chartData.type}
              data={chartData.data}
              height={300}
            />
          </div>
        )}

        {/* Actions */}
        {!isUser && !isEditing && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-foreground-tertiary hover:text-foreground h-7 px-2"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>

            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-foreground-tertiary hover:text-foreground h-7 px-2"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}

            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="text-foreground-tertiary hover:text-foreground h-7 px-2"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Regenerate
              </Button>
            )}

            {onAddComment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="text-foreground-tertiary hover:text-foreground h-7 px-2"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                {comments.length > 0 ? `${comments.length} Comments` : 'Comment'}
              </Button>
            )}
          </div>
        )}

        {/* Comments Section */}
        {showComments && !isUser && (
          <div className="mt-4 pl-4 border-l-2 border-border space-y-3">
            {/* Existing comments */}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar name={comment.author.name} size="sm" />
                <div className="flex-1 min-w-0 bg-background-secondary rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{comment.author.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-foreground-tertiary">
                        {formatTime(comment.createdAt)}
                      </span>
                      {onDeleteComment && comment.author.id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => onDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3 text-foreground-tertiary hover:text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground-secondary mt-1">{comment.content}</p>
                </div>
              </div>
            ))}

            {/* Add comment input */}
            {onAddComment && (
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  disabled={addingComment}
                />
                <Button
                  size="sm"
                  className="h-9 px-3"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addingComment}
                >
                  {addingComment ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
