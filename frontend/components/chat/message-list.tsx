'use client';

import { useRef, useEffect } from 'react';
import { MessageItem } from './message-item';
import { Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string; avatar?: string };
  createdAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  createdAt: string;
  isEdited?: boolean;
  user?: { name: string };
}

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
  userName?: string;
  currentUserId?: string;
  messageComments?: Record<string, Comment[]>;
  onRetry?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  onAddComment?: (messageId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  readOnly?: boolean;
}

export function MessageList({
  messages,
  loading = false,
  userName = 'You',
  currentUserId,
  messageComments = {},
  onRetry,
  onEditMessage,
  onAddComment,
  onDeleteComment,
  readOnly = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
            <p className="text-foreground-secondary text-sm">
              Upload documents or ask questions to begin your analysis. Parse will
              help you extract insights, generate charts, and understand your data.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              userName={userName}
              currentUserId={currentUserId}
              comments={messageComments[message.id] || []}
              onRetry={
                message.role === 'assistant' && onRetry
                  ? () => onRetry(message.id)
                  : undefined
              }
              onEdit={
                message.role === 'assistant' && onEditMessage
                  ? onEditMessage
                  : undefined
              }
              onAddComment={
                message.role === 'assistant' && onAddComment
                  ? onAddComment
                  : undefined
              }
              onDeleteComment={onDeleteComment}
            />
          ))}

          {loading && (
            <div className="flex gap-4 px-4 py-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <span className="text-xs font-medium text-white">P</span>
              </div>
              <div className="flex items-center gap-2 text-foreground-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Parse is thinking...</span>
              </div>
            </div>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
