'use client';

import { useRef, useEffect } from 'react';
import { MessageItem } from './message-item';
import { BarChart3, FileText, TrendingUp, Lightbulb } from 'lucide-react';

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
  messageComments?: Record<string, any[]>;
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
  onRetry,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const capabilities = [
    {
      icon: FileText,
      title: 'Analyze Documents',
      description: 'Upload PDFs, CSVs, or Excel files to extract insights',
    },
    {
      icon: BarChart3,
      title: 'Generate Visualizations',
      description: 'Create charts and graphs from your data',
    },
    {
      icon: TrendingUp,
      title: 'Identify Trends',
      description: 'Discover patterns and trends in your research',
    },
    {
      icon: Lightbulb,
      title: 'Get Insights',
      description: 'Ask questions and get intelligent answers',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center max-w-2xl">
            {/* Logo/Brand */}
            <div className="mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-purple">
                <span className="text-2xl font-bold text-white">P</span>
              </div>
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-3">
              How can I help you analyze today?
            </h1>
            <p className="text-foreground-secondary text-lg mb-10">
              Upload documents or ask questions to begin your research analysis
            </p>

            {/* Capability cards */}
            <div className="grid grid-cols-2 gap-4 text-left">
              {capabilities.map((cap, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-border bg-background-secondary/50 hover:bg-background-secondary transition-colors"
                >
                  <cap.icon className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-foreground mb-1">{cap.title}</h3>
                  <p className="text-sm text-foreground-tertiary">{cap.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              userName={userName}
              onRetry={
                message.role === 'assistant' && onRetry
                  ? () => onRetry(message.id)
                  : undefined
              }
            />
          ))}

          {loading && (
            <div className="py-6 bg-background-secondary/30">
              <div className="max-w-3xl mx-auto px-6">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
                    <span className="text-xs font-bold text-white">P</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">Parse</span>
                </div>
                <div className="pl-8 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-foreground-tertiary">Analyzing...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
