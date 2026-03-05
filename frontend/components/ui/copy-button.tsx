'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
}

const sizeStyles = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function CopyButton({
  text,
  className,
  size = 'md',
  variant = 'default',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'rounded-lg transition-all duration-200',
        variant === 'default' && 'bg-background-tertiary hover:bg-background-secondary',
        variant === 'ghost' && 'hover:bg-background-tertiary',
        copied ? 'text-green-400' : 'text-foreground-tertiary hover:text-foreground',
        sizeStyles[size],
        className
      )}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className={iconSizes[size]} />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className={iconSizes[size]} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

// Copy with text display
interface CopyFieldProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyField({ value, label, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      <div
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
          'bg-background-secondary border border-border',
          'hover:border-primary/30',
          copied && 'border-green-500/30 bg-green-500/5'
        )}
      >
        <code className="flex-1 text-sm text-foreground-secondary font-mono truncate">
          {value}
        </code>
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-green-400"
            >
              <Check className="h-4 w-4" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-foreground-tertiary"
            >
              <Copy className="h-4 w-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {copied && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 text-xs text-green-400"
          >
            Copied to clipboard!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
