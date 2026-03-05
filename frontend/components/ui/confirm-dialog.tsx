'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  loading?: boolean;
  icon?: ReactNode;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
    buttonVariant: 'default' as const,
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    buttonVariant: 'default' as const,
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    buttonVariant: 'success' as const,
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 pb-0">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                      config.iconBg
                    )}
                  >
                    {icon || <Icon className={cn('w-6 h-6', config.iconColor)} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    {description && (
                      <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-background-tertiary transition-colors"
                  >
                    <X className="w-5 h-5 text-foreground-tertiary" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 p-6">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                  {cancelText}
                </Button>
                <Button
                  variant={config.buttonVariant}
                  onClick={onConfirm}
                  loading={loading}
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for managing confirm dialog state
import { useState, useCallback } from 'react';

interface UseConfirmDialogOptions {
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export function useConfirmDialog(options: UseConfirmDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await options.onConfirm();
      close();
    } finally {
      setLoading(false);
    }
  }, [options.onConfirm, close]);

  const dialogProps = {
    isOpen,
    onClose: close,
    onConfirm: handleConfirm,
    loading,
    title: options.title,
    description: options.description,
    confirmText: options.confirmText,
    cancelText: options.cancelText,
    variant: options.variant,
  };

  return {
    open,
    close,
    dialogProps,
    ConfirmDialog: () => <ConfirmDialog {...dialogProps} />,
  };
}
