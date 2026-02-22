'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageItem } from './message-item';
import { BarChart3, FileText, TrendingUp, Lightbulb, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onChartDataChange?: (messageId: string, newChartData: any) => Promise<void>;
  readOnly?: boolean;
}

export function MessageList({
  messages,
  loading = false,
  userName = 'You',
  onRetry,
  onEditMessage,
  onChartDataChange,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(messages.length);

  // Check if user is near the bottom of the scroll
  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;

    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom && messages.length > 0);
  }, [messages.length]);

  // Auto-scroll when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (messages.length > lastMessageCount || loading) {
      if (isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setLastMessageCount(messages.length);
  }, [messages.length, loading, isNearBottom, lastMessageCount]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollPosition);
    return () => container.removeEventListener('scroll', checkScrollPosition);
  }, [checkScrollPosition]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const capabilities = [
    {
      icon: FileText,
      title: 'Analyze Documents',
      description: 'Upload PDFs, CSVs, or Excel files to extract insights',
    },
    {
      icon: BarChart3,
      title: 'Paste & Visualize',
      description: 'Paste CSV, JSON, or tabular data directly to analyze',
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
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-smooth relative overscroll-contain"
    >
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center p-8">
          <motion.div
            className="text-center max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo/Brand */}
            <motion.div
              className="mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-purple shadow-lg shadow-primary/20">
                <span className="text-2xl font-bold text-white">P</span>
              </div>
            </motion.div>

            <motion.h1
              className="text-3xl font-semibold text-foreground mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              How can I help you analyze today?
            </motion.h1>
            <motion.p
              className="text-foreground-secondary text-lg mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              Upload documents, paste data, or ask questions to begin your analysis
            </motion.p>

            {/* Capability cards */}
            <div className="grid grid-cols-2 gap-4 text-left">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-4 rounded-xl border border-border bg-background-secondary/50 hover:bg-background-secondary hover:border-primary/30 transition-all cursor-default"
                >
                  <cap.icon className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-foreground mb-1">{cap.title}</h3>
                  <p className="text-sm text-foreground-tertiary">{cap.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="pb-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: 0.3,
                  delay: index === messages.length - 1 ? 0 : 0,
                }}
                layout
              >
                <MessageItem
                  message={message}
                  userName={userName}
                  isLatest={index === messages.length - 1}
                  onRetry={
                    message.role === 'assistant' && onRetry
                      ? () => onRetry(message.id)
                      : undefined
                  }
                  onEdit={
                    message.role === 'assistant' && onEditMessage
                      ? (messageId, newContent) => onEditMessage(messageId, newContent)
                      : undefined
                  }
                  onChartDataChange={onChartDataChange}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div
                className="py-6 bg-background-secondary/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="max-w-3xl mx-auto px-6">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
                      <span className="text-xs font-bold text-white">P</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">Parse</span>
                  </div>
                  <div className="pl-8 mt-4">
                    <div className="flex items-center gap-3">
                      {/* Animated thinking indicator */}
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-2 w-2 rounded-full bg-primary"
                            animate={{
                              y: [0, -8, 0],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                      <motion.span
                        className="text-sm text-foreground-tertiary"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Analyzing...
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} className="h-px" />

      {/* Scroll to bottom button - responsive positioning */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToBottom}
            className={cn(
              "fixed bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 z-20",
              "flex items-center gap-2 px-3 py-2 sm:px-4 rounded-full",
              "bg-background-secondary/95 backdrop-blur-md border border-border",
              "text-sm text-foreground-secondary active:text-foreground",
              "shadow-lg active:shadow-xl transition-all active:bg-background-secondary"
            )}
          >
            <ArrowDown className="h-4 w-4" />
            <span className="hidden sm:inline">Scroll to bottom</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
