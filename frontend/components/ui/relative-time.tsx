'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RelativeTimeProps {
  date: string | Date;
  className?: string;
  updateInterval?: number; // in seconds
  showTooltip?: boolean;
}

export function RelativeTime({
  date,
  className,
  updateInterval = 60,
  showTooltip = true,
}: RelativeTimeProps) {
  const [relativeTime, setRelativeTime] = useState('');
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  useEffect(() => {
    const updateRelativeTime = () => {
      setRelativeTime(getRelativeTimeString(dateObj));
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, updateInterval * 1000);

    return () => clearInterval(interval);
  }, [dateObj, updateInterval]);

  const absoluteTime = dateObj.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (showTooltip) {
    return (
      <time
        dateTime={dateObj.toISOString()}
        title={absoluteTime}
        className={cn('cursor-help', className)}
      >
        {relativeTime}
      </time>
    );
  }

  return (
    <time dateTime={dateObj.toISOString()} className={className}>
      {relativeTime}
    </time>
  );
}

// Smart date display that shows different formats based on how recent the date is
interface SmartDateProps {
  date: string | Date;
  className?: string;
}

export function SmartDate({ date, className }: SmartDateProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let displayFormat: string;

  if (diffDays === 0) {
    // Today - show time
    displayFormat = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } else if (diffDays === 1) {
    // Yesterday
    displayFormat = 'Yesterday';
  } else if (diffDays < 7) {
    // This week - show day name
    displayFormat = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  } else if (dateObj.getFullYear() === now.getFullYear()) {
    // This year - show month and day
    displayFormat = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } else {
    // Older - show full date
    displayFormat = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const fullDate = dateObj.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <time
      dateTime={dateObj.toISOString()}
      title={fullDate}
      className={cn('cursor-help', className)}
    >
      {displayFormat}
    </time>
  );
}

// Duration display (e.g., "2h 30m")
interface DurationProps {
  seconds: number;
  className?: string;
  verbose?: boolean;
}

export function Duration({ seconds, className, verbose = false }: DurationProps) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let display: string;

  if (verbose) {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (secs > 0 && hours === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
    display = parts.join(', ') || '0 seconds';
  } else {
    if (hours > 0) {
      display = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      display = `${minutes}m ${secs}s`;
    } else {
      display = `${secs}s`;
    }
  }

  return <span className={className}>{display}</span>;
}

// Reading time estimate
interface ReadingTimeProps {
  text: string;
  wordsPerMinute?: number;
  className?: string;
}

export function ReadingTime({
  text,
  wordsPerMinute = 200,
  className,
}: ReadingTimeProps) {
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  return (
    <span className={className}>
      {minutes} min read
    </span>
  );
}

// Helper function
function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 5) return 'just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

// Countdown timer
interface CountdownProps {
  targetDate: string | Date;
  onComplete?: () => void;
  className?: string;
}

export function Countdown({ targetDate, onComplete, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        onComplete?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [target, onComplete]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {timeLeft.days > 0 && (
        <div className="text-center">
          <div className="text-2xl font-bold">{timeLeft.days}</div>
          <div className="text-xs text-foreground-tertiary">days</div>
        </div>
      )}
      <div className="text-center">
        <div className="text-2xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
        <div className="text-xs text-foreground-tertiary">hours</div>
      </div>
      <span className="text-xl font-bold text-foreground-tertiary">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
        <div className="text-xs text-foreground-tertiary">mins</div>
      </div>
      <span className="text-xl font-bold text-foreground-tertiary">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
        <div className="text-xs text-foreground-tertiary">secs</div>
      </div>
    </div>
  );
}
