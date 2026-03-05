'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
  variant?: 'dots' | 'pulse' | 'wave';
}

// Classic bouncing dots
export function TypingIndicator({ className, variant = 'dots' }: TypingIndicatorProps) {
  if (variant === 'pulse') {
    return <TypingPulse className={className} />;
  }

  if (variant === 'wave') {
    return <TypingWave className={className} />;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-foreground-tertiary"
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Pulsing circle variant
function TypingPulse({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <motion.div
        className="w-3 h-3 rounded-full bg-primary/60"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <span className="text-sm text-foreground-secondary">Thinking...</span>
    </div>
  );
}

// Wave animation variant
function TypingWave({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="w-1 bg-primary rounded-full"
          animate={{
            height: ['8px', '16px', '8px'],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// AI thinking indicator with text
interface AIThinkingProps {
  message?: string;
  className?: string;
}

export function AIThinking({ message = 'Analyzing...', className }: AIThinkingProps) {
  const steps = [
    'Reading documents...',
    'Extracting insights...',
    'Generating response...',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-2xl bg-background-secondary border border-border',
        className
      )}
    >
      {/* AI Avatar */}
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
          <span className="text-xs font-bold text-white">P</span>
        </div>
        <motion.div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background-secondary"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-foreground">Parse AI</span>
          <TypingIndicator variant="dots" />
        </div>

        {/* Animated steps */}
        <div className="space-y-1">
          {steps.map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 1.5 }}
              className="flex items-center gap-2 text-sm text-foreground-secondary"
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
              {step}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Streaming text effect
interface StreamingTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function StreamingText({
  text,
  speed = 20,
  className,
  onComplete,
}: StreamingTextProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 1 }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * (speed / 1000) }}
          onAnimationComplete={i === text.length - 1 ? onComplete : undefined}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}
