'use client';

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delay?: number;
  className?: string;
  shortcut?: string;
}

const sideConfig = {
  top: {
    initial: { opacity: 0, y: 4, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 4, scale: 0.95 },
    position: 'bottom-full mb-2',
  },
  bottom: {
    initial: { opacity: 0, y: -4, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -4, scale: 0.95 },
    position: 'top-full mt-2',
  },
  left: {
    initial: { opacity: 0, x: 4, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 4, scale: 0.95 },
    position: 'right-full mr-2',
  },
  right: {
    initial: { opacity: 0, x: -4, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -4, scale: 0.95 },
    position: 'left-full ml-2',
  },
};

const alignConfig = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delay = 300,
  className,
  shortcut,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const config = sideConfig[side];

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 pointer-events-none',
              config.position,
              side === 'top' || side === 'bottom' ? alignConfig[align] : ''
            )}
          >
            <div
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap',
                'bg-foreground text-background shadow-lg',
                className
              )}
            >
              <span>{content}</span>
              {shortcut && (
                <kbd className="ml-2 px-1.5 py-0.5 rounded bg-background/20 text-xs font-mono">
                  {shortcut}
                </kbd>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Info tooltip with icon
interface InfoTooltipProps {
  content: ReactNode;
  className?: string;
}

export function InfoTooltip({ content, className }: InfoTooltipProps) {
  return (
    <Tooltip content={content} side="top">
      <button
        type="button"
        className={cn(
          'inline-flex items-center justify-center w-4 h-4 rounded-full',
          'bg-background-tertiary text-foreground-tertiary hover:text-foreground',
          'text-xs transition-colors',
          className
        )}
      >
        ?
      </button>
    </Tooltip>
  );
}
