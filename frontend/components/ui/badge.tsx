'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-background-tertiary text-foreground-secondary',
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  outline: 'bg-transparent border-border text-foreground-secondary',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-foreground-secondary',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  outline: 'bg-foreground-secondary',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            dotStyles[variant]
          )}
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Status badge with predefined states
type StatusType = 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'draft' | 'running' | 'paused';

const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'default', label: 'Inactive' },
  pending: { variant: 'warning', label: 'Pending' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'error', label: 'Failed' },
  draft: { variant: 'default', label: 'Draft' },
  running: { variant: 'info', label: 'Running' },
  paused: { variant: 'warning', label: 'Paused' },
};

interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'md', showDot = true, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} size={size} dot={showDot} className={className}>
      {config.label}
    </Badge>
  );
}

// Count badge (for notifications, etc.)
interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: BadgeVariant;
  className?: string;
}

export function CountBadge({ count, max = 99, variant = 'error', className }: CountBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xs font-medium',
        variant === 'error' && 'bg-red-500 text-white',
        variant === 'info' && 'bg-blue-500 text-white',
        variant === 'success' && 'bg-green-500 text-white',
        variant === 'warning' && 'bg-yellow-500 text-black',
        variant === 'default' && 'bg-foreground text-background',
        className
      )}
    >
      {displayCount}
    </span>
  );
}
