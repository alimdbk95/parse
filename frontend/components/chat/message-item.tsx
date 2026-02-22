'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Pencil, X, Save } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChartRenderer } from '@/components/charts/chart-renderer';

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
  onChartDataChange?: (messageId: string, newChartData: any) => Promise<void>;
  comments?: any[];
  isStreaming?: boolean;
  isLatest?: boolean;
}

export function MessageItem({
  message,
  userName = 'You',
  onRetry,
  onEdit,
  onChartDataChange,
  isStreaming = false,
  isLatest = false,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [localChartData, setLocalChartData] = useState<any>(null);
  const [displayedContent, setDisplayedContent] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const hasAnimatedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isUser = message.role === 'user';
  const chartData = localChartData || message.metadata?.chart;

  // Typing animation for new assistant messages
  useEffect(() => {
    if (!isUser && isLatest && !hasAnimatedRef.current && message.content) {
      hasAnimatedRef.current = true;
      setIsAnimating(true);
      setDisplayedContent('');
      setShowActions(false);

      let index = 0;
      const content = message.content;
      const chunkSize = 3; // Characters per tick for faster animation
      const delay = 10; // ms between ticks

      const animate = () => {
        if (index < content.length) {
          const nextIndex = Math.min(index + chunkSize, content.length);
          setDisplayedContent(content.slice(0, nextIndex));
          index = nextIndex;
          animationRef.current = setTimeout(animate, delay);
        } else {
          setIsAnimating(false);
          setShowActions(true);
        }
      };

      animate();

      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
      };
    } else if (!isUser) {
      // For older messages, show immediately
      setDisplayedContent(message.content);
      setShowActions(true);
      hasAnimatedRef.current = true;
    }
  }, [message.content, isUser, isLatest]);

  // Reset animation ref when message changes
  useEffect(() => {
    hasAnimatedRef.current = false;
  }, [message.id]);

  const handleChartDataChange = async (newData: any[]) => {
    const updatedChart = {
      ...chartData,
      data: newData,
    };
    setLocalChartData(updatedChart);

    if (onChartDataChange) {
      await onChartDataChange(message.id, updatedChart);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditedContent(message.content);
    setIsEditing(true);
    // Focus textarea after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveEdit = async () => {
    if (!onEdit || editedContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(message.id, editedContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    }
    // Cancel on Escape
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedContent, isEditing]);

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    lines.forEach((line, i) => {
      // Table handling
      if (line.startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        if (!line.includes('---')) {
          const cells = line.split('|').filter(Boolean).map(c => c.trim());
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        // End of table
        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {tableRows[0]?.map((cell, j) => (
                    <th key={j} className="px-4 py-2 text-left font-medium text-foreground">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-border/50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-foreground-secondary">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableRows = [];
      }

      // Headers with **
      if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <h3 key={i} className="text-lg font-semibold text-foreground mt-6 mb-3">
            {line.replace(/\*\*/g, '')}
          </h3>
        );
        return;
      }

      // Bold headers like "**Key Insights:**"
      if (line.match(/^\*\*.*:\*\*$/)) {
        elements.push(
          <h4 key={i} className="font-semibold text-foreground mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </h4>
        );
        return;
      }

      // Bullet list items
      if (line.startsWith('- ') || line.startsWith('• ')) {
        elements.push(
          <div key={i} className="flex gap-2 ml-2 mb-1">
            <span className="text-primary mt-1.5">•</span>
            <span className="text-foreground-secondary leading-relaxed">
              {renderInlineFormatting(line.replace(/^[-•]\s/, ''))}
            </span>
          </div>
        );
        return;
      }

      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\./)?.[1];
        elements.push(
          <div key={i} className="flex gap-3 ml-2 mb-1">
            <span className="text-primary font-medium min-w-[20px]">{num}.</span>
            <span className="text-foreground-secondary leading-relaxed">
              {renderInlineFormatting(line.replace(/^\d+\.\s/, ''))}
            </span>
          </div>
        );
        return;
      }

      // Code blocks
      if (line.startsWith('```')) {
        return;
      }

      // Regular text
      if (line.trim()) {
        elements.push(
          <p key={i} className="text-foreground-secondary leading-relaxed mb-3">
            {renderInlineFormatting(line)}
          </p>
        );
      } else if (i > 0 && lines[i - 1]?.trim()) {
        elements.push(<div key={i} className="h-2" />);
      }
    });

    // Handle any remaining table
    if (inTable && tableRows.length > 0) {
      elements.push(
        <div key="table-final" className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {tableRows[0]?.map((cell, j) => (
                  <th key={j} className="px-4 py-2 text-left font-medium text-foreground">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2 text-foreground-secondary">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return elements;
  };

  const renderInlineFormatting = (text: string) => {
    // Handle **bold** formatting
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Content to display - either animated or full
  const contentToRender = isUser ? message.content : (displayedContent || message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'py-4 sm:py-6 group',
        isUser ? 'bg-transparent' : 'bg-background-secondary/30'
      )}
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-6">
        {isUser ? (
          // User message - simple, right-aligned feel with animation
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-primary/10 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 max-w-[90%] sm:max-w-[85%] active:bg-primary/15 transition-colors">
              <p className="text-foreground text-sm sm:text-base">{message.content}</p>
            </div>
          </motion.div>
        ) : (
          // Assistant message - full width, Claude-style with typing animation
          <div className="space-y-4">
            {/* Assistant label with edit button */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
                  <span className="text-xs font-bold text-white">P</span>
                </div>
                <span className="text-sm font-medium text-foreground">Parse</span>
                {isAnimating && (
                  <motion.div
                    className="flex gap-0.5 ml-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{
                          opacity: [0.3, 1, 0.3],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Edit button - visible in top right */}
              {onEdit && showActions && !isEditing && !isAnimating && (
                <motion.button
                  onClick={handleStartEdit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
                    "text-foreground-tertiary hover:text-foreground",
                    "bg-background-tertiary/50 hover:bg-background-tertiary",
                    "border border-transparent hover:border-border",
                    "transition-all duration-200"
                  )}
                  title="Edit response"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </motion.button>
              )}
            </motion.div>

            {/* Content */}
            <div className="pl-0 sm:pl-8">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <textarea
                      ref={textareaRef}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={cn(
                        "w-full min-h-[120px] p-3 rounded-lg",
                        "bg-background-secondary border border-border",
                        "text-foreground text-sm sm:text-base leading-relaxed",
                        "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
                        "resize-none transition-all",
                        "placeholder:text-foreground-tertiary"
                      )}
                      style={{ fontSize: '16px' }} // Prevents iOS zoom
                      placeholder="Edit the response..."
                      disabled={isSaving}
                    />
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <p className="hidden sm:block text-xs text-foreground-tertiary">
                        <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary text-[10px] font-medium">
                          {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
                        </kbd>
                        {' '}to save,{' '}
                        <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary text-[10px] font-medium">Esc</kbd>
                        {' '}to cancel
                      </p>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-sm text-foreground-secondary hover:text-foreground hover:bg-background-tertiary active:bg-background-tertiary transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          onClick={handleSaveEdit}
                          disabled={isSaving || editedContent.trim() === message.content}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                            editedContent.trim() !== message.content
                              ? "bg-primary text-white active:bg-primary/80"
                              : "bg-background-tertiary text-foreground-tertiary"
                          )}
                        >
                          {isSaving ? (
                            <>
                              <motion.div
                                className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {renderContent(contentToRender)}
                    {isAnimating && (
                      <motion.span
                        className="inline-block w-0.5 h-4 bg-primary ml-0.5"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    )}
                    {message.isEdited && !isAnimating && (
                      <span className="text-xs text-foreground-tertiary ml-1">(edited)</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chart - animate in after content */}
            <AnimatePresence>
              {chartData && !isAnimating && (
                <motion.div
                  className="pl-0 sm:pl-8 mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="rounded-xl border border-border bg-card p-3 sm:p-4 active:border-primary/30 transition-colors overflow-hidden">
                    <h4 className="mb-3 font-medium text-foreground text-sm sm:text-base">{chartData.title}</h4>
                    <div className="-mx-2 sm:mx-0">
                      <ChartRenderer
                        type={chartData.type}
                        data={chartData.data}
                        height={250}
                        enableEdit={true}
                        onDataChange={handleChartDataChange}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions - fade in after animation completes, hide when editing */}
            <AnimatePresence>
              {showActions && !isEditing && (
                <motion.div
                  className="pl-0 sm:pl-8 flex items-center gap-0.5 sm:gap-1 mt-3 sm:mt-4"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.button
                    onClick={handleCopy}
                    whileTap={{ scale: 0.9 }}
                    className="p-2.5 sm:p-2 rounded-lg text-foreground-tertiary hover:text-foreground active:bg-background-tertiary transition-colors"
                    title="Copy"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Copy className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                  <motion.button
                    onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "p-2.5 sm:p-2 rounded-lg transition-colors",
                      feedback === 'up'
                        ? "text-green-500 bg-green-500/10"
                        : "text-foreground-tertiary active:bg-background-tertiary"
                    )}
                    title="Good response"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "p-2.5 sm:p-2 rounded-lg transition-colors",
                      feedback === 'down'
                        ? "text-red-500 bg-red-500/10"
                        : "text-foreground-tertiary active:bg-background-tertiary"
                    )}
                    title="Bad response"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </motion.button>
                  {onRetry && (
                    <motion.button
                      onClick={onRetry}
                      whileTap={{ scale: 0.9, rotate: 180 }}
                      transition={{ duration: 0.3 }}
                      className="p-2.5 sm:p-2 rounded-lg text-foreground-tertiary active:bg-background-tertiary transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
