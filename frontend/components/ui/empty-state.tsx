'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  FolderOpen,
  BarChart2,
  Search,
  Upload,
  Plus,
  Sparkles,
  FlaskConical,
  Layout,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

type EmptyStateType =
  | 'documents'
  | 'analyses'
  | 'charts'
  | 'repositories'
  | 'search'
  | 'experiments'
  | 'templates'
  | 'generic';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const emptyStateConfig: Record<
  EmptyStateType,
  { icon: typeof FileText; title: string; description: string; gradient: string }
> = {
  documents: {
    icon: FileText,
    title: 'No documents yet',
    description: 'Upload your first document to start analyzing data and extracting insights.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  analyses: {
    icon: MessageSquare,
    title: 'No analyses yet',
    description: 'Start a new analysis to chat with AI about your documents and generate insights.',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  charts: {
    icon: BarChart2,
    title: 'No charts yet',
    description: 'Create visualizations from your data to better understand patterns and trends.',
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
  repositories: {
    icon: FolderOpen,
    title: 'No repositories yet',
    description: 'Create a repository to organize related documents and analyses together.',
    gradient: 'from-orange-500/20 to-amber-500/20',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
    gradient: 'from-slate-500/20 to-gray-500/20',
  },
  experiments: {
    icon: FlaskConical,
    title: 'No experiments yet',
    description: 'Design experiments to test hypotheses and analyze results with statistical rigor.',
    gradient: 'from-violet-500/20 to-indigo-500/20',
  },
  templates: {
    icon: Layout,
    title: 'No templates yet',
    description: 'Create reusable templates to standardize your analysis workflows.',
    gradient: 'from-rose-500/20 to-red-500/20',
  },
  generic: {
    icon: Sparkles,
    title: 'Nothing here yet',
    description: 'Get started by creating your first item.',
    gradient: 'from-primary/20 to-accent-purple/20',
  },
};

export function EmptyState({
  type = 'generic',
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-2xl',
        'border border-dashed border-border bg-background-secondary/30',
        className
      )}
    >
      {/* Icon with gradient background */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="relative mb-6"
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-xl opacity-60',
            `bg-gradient-to-br ${config.gradient}`
          )}
        />
        <div
          className={cn(
            'relative w-16 h-16 rounded-2xl flex items-center justify-center',
            'bg-background-secondary border border-border'
          )}
        >
          <Icon className="w-8 h-8 text-foreground-secondary" />
        </div>
      </motion.div>

      {/* Text */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {title || config.title}
      </motion.h3>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-foreground-secondary max-w-sm mb-6"
      >
        {description || config.description}
      </motion.p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3"
        >
          {action && (
            <Button onClick={action.onClick}>
              {action.icon || <Plus className="w-4 h-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent-purple/5 rounded-full blur-3xl" />
      </div>
    </motion.div>
  );
}

// Quick action cards for empty states
interface QuickActionProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

export function QuickAction({ icon, title, description, onClick }: QuickActionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-start gap-4 p-4 rounded-xl text-left w-full',
        'bg-background-secondary border border-border',
        'hover:border-primary/30 hover:bg-background-tertiary transition-colors'
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="text-sm text-foreground-secondary mt-0.5">{description}</p>
      </div>
    </motion.button>
  );
}

export function EmptyStateWithActions({
  type = 'generic',
  actions,
  className,
}: {
  type?: EmptyStateType;
  actions: QuickActionProps[];
  className?: string;
}) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('p-6', className)}
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-14 h-14 rounded-xl bg-background-secondary border border-border flex items-center justify-center mx-auto mb-4"
        >
          <Icon className="w-7 h-7 text-foreground-secondary" />
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{config.title}</h3>
        <p className="text-foreground-secondary">{config.description}</p>
      </div>

      <div className="grid gap-3 max-w-md mx-auto">
        {actions.map((action, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <QuickAction {...action} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
