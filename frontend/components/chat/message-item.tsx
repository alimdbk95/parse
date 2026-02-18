'use client';

import { motion } from 'framer-motion';
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';
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
  comments?: any[];
}

export function MessageItem({
  message,
  userName = 'You',
  onRetry,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const isUser = message.role === 'user';
  const chartData = message.metadata?.chart;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'py-6',
        isUser ? 'bg-transparent' : 'bg-background-secondary/30'
      )}
    >
      <div className="max-w-3xl mx-auto px-6">
        {isUser ? (
          // User message - simple, right-aligned feel
          <div className="flex justify-end">
            <div className="bg-primary/10 rounded-2xl px-4 py-3 max-w-[85%]">
              <p className="text-foreground">{message.content}</p>
            </div>
          </div>
        ) : (
          // Assistant message - full width, Claude-style
          <div className="space-y-4">
            {/* Assistant label */}
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
                <span className="text-xs font-bold text-white">P</span>
              </div>
              <span className="text-sm font-medium text-foreground">Parse</span>
            </div>

            {/* Content */}
            <div className="pl-8">
              {renderContent(message.content)}
            </div>

            {/* Chart */}
            {chartData && (
              <div className="pl-8 mt-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="mb-3 font-medium text-foreground">{chartData.title}</h4>
                  <ChartRenderer
                    type={chartData.type}
                    data={chartData.data}
                    height={300}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pl-8 flex items-center gap-1 mt-4">
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary transition-colors"
                title="Copy"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  feedback === 'up'
                    ? "text-green-500 bg-green-500/10"
                    : "text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary"
                )}
                title="Good response"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  feedback === 'down'
                    ? "text-red-500 bg-red-500/10"
                    : "text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary"
                )}
                title="Bad response"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="p-2 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
