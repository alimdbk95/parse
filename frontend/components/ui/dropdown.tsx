'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownItem {
  label: string;
  value: string;
  icon?: ReactNode;
  description?: string;
}

interface DropdownProps {
  items: DropdownItem[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function Dropdown({
  items,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => item.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm transition-colors',
          'hover:border-border-hover focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          !selectedItem && 'text-foreground-tertiary'
        )}
      >
        <span className="flex items-center gap-2">
          {selectedItem?.icon}
          {selectedItem?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-foreground-tertiary transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background-secondary shadow-lg"
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {items.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange?.(item.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                    'hover:bg-background-tertiary',
                    item.value === value && 'bg-primary/10 text-primary'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <div className="text-left">
                      <div>{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-foreground-tertiary">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {item.value === value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
}

export function Menu({ trigger, children, align = 'right' }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border bg-background-secondary py-1 shadow-lg',
              align === 'right' ? 'right-0' : 'left-0'
            )}
            onClick={() => setIsOpen(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MenuItemProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export function MenuItem({
  children,
  icon,
  onClick,
  variant = 'default',
  disabled = false,
}: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
        'hover:bg-background-tertiary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'danger' && 'text-red-400 hover:bg-red-500/10'
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-border" />;
}
