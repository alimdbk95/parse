'use client';

import { FileText, Image, Table2, File, MoreVertical, Download, Trash2, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Menu, MenuItem, MenuDivider } from '@/components/ui/dropdown';
import { Button } from '@/components/ui/button';
import { formatDate, formatFileSize, cn } from '@/lib/utils';

interface DocumentCardProps {
  document: {
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: string;
    uploadedBy?: {
      name: string;
    };
  };
  onView?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  selected?: boolean;
}

export function DocumentCard({
  document,
  onView,
  onDownload,
  onDelete,
  onSelect,
  selected = false,
}: DocumentCardProps) {
  const getIcon = () => {
    const type = document.type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(type)) {
      return <Image className="h-6 w-6" />;
    }
    if (type === 'pdf') {
      return <FileText className="h-6 w-6" />;
    }
    if (['csv', 'xls', 'xlsx'].includes(type)) {
      return <Table2 className="h-6 w-6" />;
    }
    return <File className="h-6 w-6" />;
  };

  const getTypeColor = () => {
    const type = document.type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(type)) {
      return 'bg-accent-pink/20 text-accent-pink';
    }
    if (type === 'pdf') {
      return 'bg-accent-coral/20 text-accent-coral';
    }
    if (['csv', 'xls', 'xlsx'].includes(type)) {
      return 'bg-accent-teal/20 text-accent-teal';
    }
    return 'bg-primary/20 text-primary';
  };

  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all hover:border-primary/50',
        selected && 'border-primary bg-primary/5'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            getTypeColor()
          )}
        >
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate pr-8">{document.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-foreground-tertiary">
            <span className="uppercase">{document.type}</span>
            <span>·</span>
            <span>{formatFileSize(document.size)}</span>
          </div>
          <p className="mt-2 text-xs text-foreground-tertiary">
            Uploaded {formatDate(document.createdAt)}
            {document.uploadedBy && ` by ${document.uploadedBy.name}`}
          </p>
        </div>

        <Menu
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
        >
          {onView && (
            <MenuItem
              icon={<Eye className="h-4 w-4" />}
              onClick={() => onView()}
            >
              View
            </MenuItem>
          )}
          {onDownload && (
            <MenuItem
              icon={<Download className="h-4 w-4" />}
              onClick={() => onDownload()}
            >
              Download
            </MenuItem>
          )}
          {onDelete && (
            <>
              <MenuDivider />
              <MenuItem
                icon={<Trash2 className="h-4 w-4" />}
                variant="danger"
                onClick={() => onDelete()}
              >
                Delete
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      {selected && (
        <div className="absolute right-3 top-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </Card>
  );
}

interface DocumentListItemProps extends DocumentCardProps {}

export function DocumentListItem({
  document,
  onView,
  onDownload,
  onDelete,
  onSelect,
  selected = false,
}: DocumentListItemProps) {
  const getIcon = () => {
    const type = document.type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(type)) {
      return <Image className="h-4 w-4" />;
    }
    if (type === 'pdf') {
      return <FileText className="h-4 w-4" />;
    }
    if (['csv', 'xls', 'xlsx'].includes(type)) {
      return <Table2 className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors cursor-pointer',
        'hover:bg-background-secondary',
        selected && 'bg-primary/10'
      )}
      onClick={onSelect}
    >
      <div className="text-foreground-secondary">{getIcon()}</div>
      <span className="flex-1 truncate text-sm">{document.name}</span>
      <span className="text-xs text-foreground-tertiary">{formatFileSize(document.size)}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
        {onView && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
