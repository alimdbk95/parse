'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Paperclip, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachedFile {
  id: string;
  name: string;
  type: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onAttach?: () => void;
  attachedFiles?: AttachedFile[];
  onRemoveFile?: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onAttach,
  attachedFiles = [],
  onRemoveFile,
  disabled = false,
  placeholder = 'Ask about your data...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const canSend = message.trim() && !disabled;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom">
      <div className="max-w-3xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
        {/* Attached files - horizontal scroll on mobile */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1"
            >
              {attachedFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-1.5 text-sm border border-border hover:border-primary/50 transition-all flex-shrink-0"
                >
                  <Paperclip className="h-3.5 w-3.5 text-foreground-tertiary flex-shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[200px] text-foreground-secondary text-xs sm:text-sm">{file.name}</span>
                  {onRemoveFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(file.id);
                      }}
                      className="p-0.5 rounded text-foreground-tertiary hover:text-red-400 active:scale-95 transition-all"
                      title="Remove from analysis"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input container - Claude mobile style */}
        <motion.div
          className={cn(
            "relative flex items-end gap-1.5 sm:gap-2 rounded-2xl border p-1.5 sm:p-2 transition-all duration-200",
            isFocused
              ? "border-primary/50 bg-background-secondary shadow-lg shadow-primary/5"
              : "border-border bg-background-secondary"
          )}
        >
          {/* Attach button */}
          {onAttach && (
            <motion.button
              onClick={onAttach}
              whileTap={{ scale: 0.9 }}
              className="flex-shrink-0 p-2 sm:p-2.5 rounded-xl text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary active:bg-background-tertiary transition-colors"
              title="Attach files"
            >
              <Paperclip className="h-5 w-5" />
            </motion.button>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 resize-none bg-transparent py-2.5 px-1 sm:px-2 text-foreground text-[16px] sm:text-sm',
              'placeholder:text-foreground-tertiary',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'max-h-[120px] sm:max-h-[200px] min-h-[44px]',
              'scrollbar-none'
            )}
            style={{ fontSize: '16px' }} // Prevents iOS zoom on focus
          />

          {/* Send button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!canSend}
            whileTap={canSend ? { scale: 0.9 } : {}}
            className={cn(
              'flex-shrink-0 p-2.5 sm:p-2 rounded-xl transition-all duration-200',
              canSend
                ? 'bg-primary text-white active:bg-primary/80 shadow-md shadow-primary/20'
                : 'bg-background-tertiary text-foreground-tertiary'
            )}
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        </motion.div>

        {/* Helper text - simplified on mobile */}
        <p className="mt-2 text-center text-[11px] sm:text-xs text-foreground-tertiary">
          <span className="hidden sm:inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Paste CSV, JSON, or tabular data directly, or upload documents.
            <span className="mx-1">•</span>
            Press <kbd className="px-1.5 py-0.5 mx-1 rounded bg-background-tertiary text-[10px] font-medium">Enter</kbd> to send
          </span>
          <span className="sm:hidden inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Paste data or upload files to analyze
          </span>
        </p>
      </div>
    </div>
  );
}
