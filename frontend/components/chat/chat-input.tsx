'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { ArrowUp, Paperclip, X } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
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

  return (
    <div className="border-t border-border bg-background">
      <div className="max-w-3xl mx-auto p-4">
        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-1.5 text-sm border border-border"
              >
                <Paperclip className="h-3.5 w-3.5 text-foreground-tertiary" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                {onRemoveFile && (
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="text-foreground-tertiary hover:text-foreground ml-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input container - Claude-style */}
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background-secondary p-2">
          {/* Attach button */}
          {onAttach && (
            <button
              onClick={onAttach}
              className="flex-shrink-0 p-2 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary transition-colors"
              title="Attach files"
            >
              <Paperclip className="h-5 w-5" />
            </button>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 resize-none bg-transparent py-2 px-2 text-foreground',
              'placeholder:text-foreground-tertiary',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'max-h-[200px] min-h-[40px]'
            )}
          />

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg transition-all',
              message.trim() && !disabled
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-background-tertiary text-foreground-tertiary cursor-not-allowed'
            )}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-foreground-tertiary">
          Paste CSV, JSON, or tabular data directly, or upload documents. Press Enter to send.
        </p>
      </div>
    </div>
  );
}
