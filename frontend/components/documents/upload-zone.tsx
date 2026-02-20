'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, FileText, Image, Table2, Loader2 } from 'lucide-react';
import { cn, formatFileSize, getFileIcon } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
}

// Supported file extensions for display purposes
const supportedExtensions = ['.pdf', '.csv', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.json'];

interface FilePreview {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
}

export function UploadZone({
  onUpload,
  maxFiles = 10,
  maxSize = 500 * 1024 * 1024, // 500MB
  className,
}: UploadZoneProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Clear previous errors
    setError(null);

    // Handle rejected files with user-visible error
    if (rejectedFiles.length > 0) {
      const errorMessages = rejectedFiles.map(f => {
        const errors = f.errors.map((e: any) => e.message).join(', ');
        return `${f.file.name}: ${errors}`;
      });
      setError(errorMessages.join('\n'));
      console.log('Rejected files:', rejectedFiles.map(f => ({
        name: f.file.name,
        type: f.file.type,
        errors: f.errors
      })));
    }

    // Add accepted files
    if (acceptedFiles.length > 0) {
      const newFiles = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
      }));
      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));
    }
  }, [maxFiles]);

  // Custom validator that checks by file extension (more reliable than MIME type)
  const fileValidator = (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'csv', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'json'];

    if (!ext || !allowedExtensions.includes(ext)) {
      return {
        code: 'file-invalid-type',
        message: `File type .${ext || 'unknown'} is not supported`
      };
    }
    return null;
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxSize,
    maxFiles: maxFiles - files.length > 0 ? maxFiles - files.length : 1,
    validator: fileValidator,
    // Accept all common document types - validation is done by extension
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'text/plain': ['.txt'],
      'application/json': ['.json'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const file = prev[index];
      URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      await onUpload(files.map((f) => f.file));
      setFiles([]);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5" />;
    if (type.includes('csv') || type.includes('excel') || type.includes('spreadsheet')) {
      return <Table2 className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          isDragActive && !isDragReject && 'border-primary bg-primary/5',
          isDragReject && 'border-red-500 bg-red-500/5',
          !isDragActive && 'border-border hover:border-primary/50 hover:bg-background-secondary'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-xl transition-colors',
              isDragActive ? 'bg-primary/20' : 'bg-background-tertiary'
            )}
          >
            <Upload
              className={cn(
                'h-7 w-7 transition-colors',
                isDragActive ? 'text-primary' : 'text-foreground-tertiary'
              )}
            />
          </div>
          <div>
            <p className="text-foreground font-medium">
              {isDragActive
                ? 'Drop files here'
                : 'Drag & drop files or click to browse'}
            </p>
            <p className="mt-1 text-sm text-foreground-tertiary">
              PDF, CSV, Excel, Images, JSON, TXT up to {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          <p className="font-medium mb-1">Upload Error:</p>
          <p className="whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              className="text-foreground-tertiary"
            >
              Clear all
            </Button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg bg-background-secondary p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-tertiary text-foreground-secondary">
                  {getFileTypeIcon(file.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file.file.name}</p>
                  <p className="text-xs text-foreground-tertiary">
                    {formatFileSize(file.file.size)}
                  </p>
                </div>
                {file.error ? (
                  <span className="text-xs text-red-400">{file.error}</span>
                ) : file.uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-foreground-tertiary hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
            loading={uploading}
          >
            Upload {files.length} file{files.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
