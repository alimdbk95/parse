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
    <div className="border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto p-4">
        {/* Attached files */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {attachedFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-1.5 text-sm border border-border hover:border-primary/50 transition-all hover:shadow-sm"
                >
                  <Paperclip className="h-3.5 w-3.5 text-foreground-tertiary" />
                  <span className="truncate max-w-[200px] text-foreground-secondary">{file.name}</span>
                  {onRemoveFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(file.id);
                      }}
                      className="p-0.5 rounded text-foreground-tertiary hover:text-red-400 hover:bg-red-400/10 transition-colors"
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

        {/* Input container */}
        <motion.div
          className={cn(
            "relative flex items-end gap-2 rounded-2xl border p-2 transition-all duration-200",
            isFocused
              ? "border-primary/50 bg-background-secondary shadow-lg shadow-primary/5"
              : "border-border bg-background-secondary hover:border-border/80"
          )}
          animate={{
            borderColor: isFocused ? 'rgba(59, 130, 246, 0.5)' : undefined,
          }}
        >
          {/* Attach button */}
          {onAttach && (
            <motion.button
              onClick={onAttach}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 p-2 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary transition-colors"
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
              'flex-1 resize-none bg-transparent py-2 px-2 text-foreground',
              'placeholder:text-foreground-tertiary',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'max-h-[200px] min-h-[40px]',
              'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'
            )}
          />

          {/* Send button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.05 } : {}}
            whileTap={canSend ? { scale: 0.95 } : {}}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg transition-all duration-200',
              canSend
                ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20'
                : 'bg-background-tertiary text-foreground-tertiary cursor-not-allowed'
            )}
          >
            <motion.div
              animate={canSend ? { rotate: 0 } : { rotate: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowUp className="h-5 w-5" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Helper text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-center text-xs text-foreground-tertiary"
        >
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Paste CSV, JSON, or tabular data directly, or upload documents.
          </span>
          <span className="hidden sm:inline"> Press </span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 mx-1 rounded bg-background-tertiary text-[10px] font-medium">Enter</kbd>
          <span className="hidden sm:inline">to send</span>
        </motion.p>
      </div>
    </div>
  );
}
