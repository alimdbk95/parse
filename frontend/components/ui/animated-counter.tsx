'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

export function AnimatedCounter({
  value,
  duration = 1,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  formatOptions,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  const display = useTransform(spring, (current) => {
    if (formatOptions) {
      return new Intl.NumberFormat('en-US', formatOptions).format(current);
    }
    return current.toFixed(decimals);
  });

  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  useEffect(() => {
    return display.on('change', (v) => setDisplayValue(v));
  }, [display]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

// Stat card with animated counter
interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  prefix,
  suffix,
  change,
  changeLabel,
  icon,
  className,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        'rounded-xl border border-border bg-background-secondary p-4',
        'hover:border-primary/30 transition-colors',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-foreground-secondary">{label}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          className="text-2xl font-bold text-foreground"
        />

        {change !== undefined && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              'text-sm font-medium flex items-center gap-1',
              isPositive && 'text-green-400',
              isNegative && 'text-red-400',
              !isPositive && !isNegative && 'text-foreground-tertiary'
            )}
          >
            {isPositive && '↑'}
            {isNegative && '↓'}
            {Math.abs(change)}%
            {changeLabel && (
              <span className="text-foreground-tertiary font-normal">
                {changeLabel}
              </span>
            )}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

// Percentage circle
interface PercentageCircleProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function PercentageCircle({
  value,
  size = 60,
  strokeWidth = 6,
  className,
  showLabel = true,
}: PercentageCircleProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const spring = useSpring(0, { duration: 1000, bounce: 0 });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  const strokeDashoffset = useTransform(
    spring,
    (v) => circumference - (v / 100) * circumference
  );

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    return spring.on('change', (v) => setDisplayValue(Math.round(v)));
  }, [spring]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg ref={ref} width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-background-tertiary"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-primary"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-semibold text-foreground">
          {displayValue}%
        </span>
      )}
    </div>
  );
}

// Usage meter (like storage usage)
interface UsageMeterProps {
  used: number;
  total: number;
  label?: string;
  unit?: string;
  className?: string;
}

export function UsageMeter({
  used,
  total,
  label,
  unit = '',
  className,
}: UsageMeterProps) {
  const percentage = Math.min((used / total) * 100, 100);
  const isWarning = percentage > 75;
  const isCritical = percentage > 90;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-secondary">{label}</span>
          <span className="text-foreground">
            <AnimatedCounter value={used} /> / {total} {unit}
          </span>
        </div>
      )}
      <div className="h-2 rounded-full bg-background-tertiary overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            isCritical
              ? 'bg-red-500'
              : isWarning
              ? 'bg-yellow-500'
              : 'bg-primary'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
