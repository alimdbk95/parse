'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const iconSizes = {
    sm: 32,
    md: 44,
    lg: 60,
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const iconSize = iconSizes[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left bracket */}
        <path
          d="M8 8 L8 52 M8 8 L18 8 M8 52 L18 52"
          stroke="#4F7DF3"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right bracket */}
        <path
          d="M52 8 L52 52 M52 8 L42 8 M52 52 L42 52"
          stroke="#4F7DF3"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Neural network nodes - outer ring */}
        <circle cx="30" cy="12" r="4" fill="#7C9FF5" />
        <circle cx="18" cy="20" r="4" fill="#7C9FF5" />
        <circle cx="42" cy="20" r="4" fill="#7C9FF5" />
        <circle cx="14" cy="30" r="4" fill="#7C9FF5" />
        <circle cx="46" cy="30" r="4" fill="#7C9FF5" />
        <circle cx="18" cy="40" r="4" fill="#7C9FF5" />
        <circle cx="42" cy="40" r="4" fill="#7C9FF5" />
        <circle cx="30" cy="48" r="4" fill="#7C9FF5" />

        {/* Neural network connections */}
        <line x1="30" y1="12" x2="18" y2="20" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="30" y1="12" x2="42" y2="20" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="18" y1="20" x2="14" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="18" y1="20" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="42" y1="20" x2="46" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="42" y1="20" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="14" y1="30" x2="18" y2="40" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="14" y1="30" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="46" y1="30" x2="42" y2="40" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="46" y1="30" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="18" y1="40" x2="30" y2="48" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="18" y1="40" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="42" y1="40" x2="30" y2="48" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
        <line x1="42" y1="40" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />

        {/* Center node with gradient effect */}
        <circle cx="30" cy="30" r="5" fill="url(#parseLogoGradient)" />

        {/* Gradient definitions */}
        <defs>
          <linearGradient
            id="parseLogoGradient"
            x1="25"
            y1="25"
            x2="35"
            y2="35"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#9B7FD1" />
            <stop offset="100%" stopColor="#E879B9" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <span className={cn('font-bold', textSizes[size])}>
          <span className="text-[#7C9FF5]">Par</span>
          <span className="text-[#E879B9]">se</span>
        </span>
      )}
    </div>
  );
}

export function LogoIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left bracket */}
      <path
        d="M8 8 L8 52 M8 8 L18 8 M8 52 L18 52"
        stroke="#4F7DF3"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right bracket */}
      <path
        d="M52 8 L52 52 M52 8 L42 8 M52 52 L42 52"
        stroke="#4F7DF3"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Neural network nodes */}
      <circle cx="30" cy="12" r="4" fill="#7C9FF5" />
      <circle cx="18" cy="20" r="4" fill="#7C9FF5" />
      <circle cx="42" cy="20" r="4" fill="#7C9FF5" />
      <circle cx="14" cy="30" r="4" fill="#7C9FF5" />
      <circle cx="46" cy="30" r="4" fill="#7C9FF5" />
      <circle cx="18" cy="40" r="4" fill="#7C9FF5" />
      <circle cx="42" cy="40" r="4" fill="#7C9FF5" />
      <circle cx="30" cy="48" r="4" fill="#7C9FF5" />

      {/* Connections */}
      <line x1="30" y1="12" x2="18" y2="20" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="30" y1="12" x2="42" y2="20" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="18" y1="20" x2="14" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="18" y1="20" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="42" y1="20" x2="46" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="42" y1="20" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="14" y1="30" x2="18" y2="40" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="14" y1="30" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="46" y1="30" x2="42" y2="40" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="46" y1="30" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="18" y1="40" x2="30" y2="48" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="18" y1="40" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="42" y1="40" x2="30" y2="48" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="42" y1="40" x2="30" y2="30" stroke="#9DB5F7" strokeWidth="1.5" opacity="0.7" />

      {/* Center node */}
      <circle cx="30" cy="30" r="5" fill="url(#parseIconGradient)" />

      <defs>
        <linearGradient
          id="parseIconGradient"
          x1="25"
          y1="25"
          x2="35"
          y2="35"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#9B7FD1" />
          <stop offset="100%" stopColor="#E879B9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
