'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  placeholder = 'Ask Parse for more insights...',
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
    <div className="border-t border-border bg-background p-4">
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-1.5 text-sm"
            >
              <span className="truncate max-w-[200px]">{file.name}</span>
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="text-foreground-tertiary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* Attach button */}
        {onAttach && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAttach}
            className="text-foreground-tertiary hover:text-foreground flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        )}

        {/* Input area */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-3 text-foreground-tertiary">
            <Sparkles className="h-4 w-4" />
          </div>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-border bg-background-secondary py-3 pl-10 pr-4 text-sm',
              'placeholder:text-foreground-tertiary',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'max-h-[200px]'
            )}
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-2 text-center text-xs text-foreground-tertiary">
        Parse can analyze documents and generate visualizations. Press Enter to send.
      </p>
    </div>
  );
}
