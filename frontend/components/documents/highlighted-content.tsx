'use client';

import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Highlight {
  id: string;
  type: string;
  text: string;
  startOffset: number;
  endOffset: number;
  importance: string;
  category?: string;
  explanation?: string;
}

interface HighlightedContentProps {
  content: string;
  highlights: Highlight[];
  activeHighlightId?: string | null;
  onHighlightClick?: (highlight: Highlight) => void;
  onTextSelect?: (selection: { text: string; startOffset: number; endOffset: number }) => void;
  className?: string;
}

const HIGHLIGHT_COLORS: Record<string, Record<string, string>> = {
  fact: {
    critical: 'bg-blue-500/30 hover:bg-blue-500/40',
    high: 'bg-blue-500/25 hover:bg-blue-500/35',
    medium: 'bg-blue-500/15 hover:bg-blue-500/25',
    low: 'bg-blue-500/10 hover:bg-blue-500/15',
  },
  statistic: {
    critical: 'bg-green-500/30 hover:bg-green-500/40',
    high: 'bg-green-500/25 hover:bg-green-500/35',
    medium: 'bg-green-500/15 hover:bg-green-500/25',
    low: 'bg-green-500/10 hover:bg-green-500/15',
  },
  claim: {
    critical: 'bg-amber-500/30 hover:bg-amber-500/40',
    high: 'bg-amber-500/25 hover:bg-amber-500/35',
    medium: 'bg-amber-500/15 hover:bg-amber-500/25',
    low: 'bg-amber-500/10 hover:bg-amber-500/15',
  },
  definition: {
    critical: 'bg-purple-500/30 hover:bg-purple-500/40',
    high: 'bg-purple-500/25 hover:bg-purple-500/35',
    medium: 'bg-purple-500/15 hover:bg-purple-500/25',
    low: 'bg-purple-500/10 hover:bg-purple-500/15',
  },
  quote: {
    critical: 'bg-cyan-500/30 hover:bg-cyan-500/40',
    high: 'bg-cyan-500/25 hover:bg-cyan-500/35',
    medium: 'bg-cyan-500/15 hover:bg-cyan-500/25',
    low: 'bg-cyan-500/10 hover:bg-cyan-500/15',
  },
  conclusion: {
    critical: 'bg-pink-500/30 hover:bg-pink-500/40',
    high: 'bg-pink-500/25 hover:bg-pink-500/35',
    medium: 'bg-pink-500/15 hover:bg-pink-500/25',
    low: 'bg-pink-500/10 hover:bg-pink-500/15',
  },
};

const ACTIVE_RING: Record<string, string> = {
  fact: 'ring-2 ring-blue-500',
  statistic: 'ring-2 ring-green-500',
  claim: 'ring-2 ring-amber-500',
  definition: 'ring-2 ring-purple-500',
  quote: 'ring-2 ring-cyan-500',
  conclusion: 'ring-2 ring-pink-500',
};

interface ContentSegment {
  text: string;
  highlight?: Highlight;
  startOffset: number;
}

export function HighlightedContent({
  content,
  highlights,
  activeHighlightId,
  onHighlightClick,
  onTextSelect,
  className,
}: HighlightedContentProps) {
  const [tooltipHighlight, setTooltipHighlight] = useState<Highlight | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Build segments with highlights applied
  const segments = useMemo(() => {
    if (!highlights.length) {
      return [{ text: content, startOffset: 0 }];
    }

    // Sort highlights by start offset
    const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

    const result: ContentSegment[] = [];
    let currentOffset = 0;

    for (const highlight of sortedHighlights) {
      // Add text before this highlight
      if (highlight.startOffset > currentOffset) {
        result.push({
          text: content.slice(currentOffset, highlight.startOffset),
          startOffset: currentOffset,
        });
      }

      // Add the highlighted segment
      if (highlight.endOffset > currentOffset) {
        const start = Math.max(highlight.startOffset, currentOffset);
        result.push({
          text: content.slice(start, highlight.endOffset),
          highlight,
          startOffset: start,
        });
        currentOffset = highlight.endOffset;
      }
    }

    // Add remaining text after last highlight
    if (currentOffset < content.length) {
      result.push({
        text: content.slice(currentOffset),
        startOffset: currentOffset,
      });
    }

    return result;
  }, [content, highlights]);

  const handleMouseUp = useCallback(() => {
    if (!onTextSelect) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    // Find the offset in the original content
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    const container = document.getElementById('highlighted-content-container');
    if (!container) return;

    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preCaretRange.toString().length;
    const endOffset = startOffset + text.length;

    onTextSelect({ text, startOffset, endOffset });
  }, [onTextSelect]);

  const handleHighlightMouseEnter = (
    highlight: Highlight,
    event: React.MouseEvent
  ) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltipHighlight(highlight);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const handleHighlightMouseLeave = () => {
    setTooltipHighlight(null);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Tooltip */}
      {tooltipHighlight && (
        <div
          className="fixed z-50 max-w-xs px-3 py-2 rounded-lg bg-foreground text-background text-xs shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium capitalize">{tooltipHighlight.type}</span>
            <span
              className={cn(
                'px-1 py-0.5 rounded text-[10px] capitalize',
                tooltipHighlight.importance === 'critical'
                  ? 'bg-red-500/30'
                  : tooltipHighlight.importance === 'high'
                  ? 'bg-amber-500/30'
                  : tooltipHighlight.importance === 'medium'
                  ? 'bg-blue-500/30'
                  : 'bg-foreground/20'
              )}
            >
              {tooltipHighlight.importance}
            </span>
          </div>
          {tooltipHighlight.explanation && (
            <p className="text-[11px] opacity-90">{tooltipHighlight.explanation}</p>
          )}
        </div>
      )}

      {/* Content */}
      <div
        id="highlighted-content-container"
        className="whitespace-pre-wrap font-mono text-sm leading-relaxed"
        onMouseUp={handleMouseUp}
      >
        {segments.map((segment, index) => {
          if (!segment.highlight) {
            return <span key={index}>{segment.text}</span>;
          }

          const { highlight } = segment;
          const typeColors = HIGHLIGHT_COLORS[highlight.type] || HIGHLIGHT_COLORS.fact;
          const colorClass = typeColors[highlight.importance] || typeColors.medium;
          const isActive = activeHighlightId === highlight.id;

          return (
            <span
              key={index}
              className={cn(
                'cursor-pointer rounded px-0.5 transition-all',
                colorClass,
                isActive && ACTIVE_RING[highlight.type]
              )}
              onClick={() => onHighlightClick?.(highlight)}
              onMouseEnter={(e) => handleHighlightMouseEnter(highlight, e)}
              onMouseLeave={handleHighlightMouseLeave}
              data-highlight-id={highlight.id}
            >
              {segment.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
