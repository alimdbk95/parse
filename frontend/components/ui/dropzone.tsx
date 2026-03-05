'use client';

import { useState, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

interface FileWithStatus {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

export function Dropzone({
  onFilesSelected,
  accept,
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB default
  maxFiles = 10,
  disabled = false,
  className,
  children,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${formatFileSize(maxSize)}`;
    }
    if (accept) {
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const fileType = file.type;
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAccepted = acceptedTypes.some(
        (type) =>
          type === fileType ||
          type === fileExt ||
          (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '')))
      );
      if (!isAccepted) {
        return 'File type not supported';
      }
    }
    return null;
  };

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      if (!multiple && fileArray.length > 1) {
        fileArray.length = 1;
      }

      if (files.length + fileArray.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const validFiles: File[] = [];
      const newFileStatuses: FileWithStatus[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file);
        const fileStatus: FileWithStatus = {
          file,
          id: Math.random().toString(36).substring(7),
          status: error ? 'error' : 'pending',
          error: error || undefined,
        };
        newFileStatuses.push(fileStatus);
        if (!error) {
          validFiles.push(file);
        }
      });

      setFiles((prev) => [...prev, ...newFileStatuses]);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [files.length, maxFiles, multiple, onFilesSelected, accept, maxSize]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone area */}
      <motion.div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          scale: isDragOver ? 1.02 : 1,
          borderColor: isDragOver ? 'rgb(99 102 241)' : undefined,
        }}
        className={cn(
          'relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
          'border-border bg-background-secondary/50',
          'hover:border-primary/50 hover:bg-background-secondary',
          isDragOver && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {children || (
          <>
            <motion.div
              animate={{ y: isDragOver ? -4 : 0 }}
              className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4"
            >
              <Upload className="w-6 h-6 text-primary" />
            </motion.div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {isDragOver ? 'Drop files here' : 'Upload files'}
            </h3>
            <p className="text-sm text-foreground-secondary mb-4">
              Drag and drop files here, or click to browse
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-foreground-tertiary">
              {accept && <span>Accepts: {accept}</span>}
              {maxSize && <span>Max: {formatFileSize(maxSize)}</span>}
            </div>
          </>
        )}
      </motion.div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((fileStatus) => (
                <motion.div
                  key={fileStatus.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    fileStatus.status === 'error'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-background-secondary border-border'
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-background-tertiary flex items-center justify-center flex-shrink-0">
                    {fileStatus.status === 'uploading' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : fileStatus.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : fileStatus.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <File className="w-4 h-4 text-foreground-secondary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {fileStatus.file.name}
                    </p>
                    <p className="text-xs text-foreground-tertiary">
                      {fileStatus.error || formatFileSize(fileStatus.file.size)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFile(fileStatus.id)}
                    className="p-1 rounded-lg hover:bg-background-tertiary transition-colors"
                  >
                    <X className="w-4 h-4 text-foreground-tertiary" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Simple file icon component
export function FileIcon({ filename, className }: { filename: string; className?: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();

  const getColor = () => {
    switch (ext) {
      case 'pdf':
        return 'text-red-400';
      case 'doc':
      case 'docx':
        return 'text-blue-400';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'text-green-400';
      case 'ppt':
      case 'pptx':
        return 'text-orange-400';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'text-purple-400';
      default:
        return 'text-foreground-secondary';
    }
  };

  return <File className={cn('w-4 h-4', getColor(), className)} />;
}
