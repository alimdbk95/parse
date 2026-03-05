'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  shape: 'square' | 'circle' | 'triangle';
}

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  onComplete?: () => void;
}

const defaultColors = [
  '#6366f1', // primary
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
];

export function Confetti({
  trigger,
  duration = 3000,
  particleCount = 50,
  colors = defaultColors,
  onComplete,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);

      const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 6,
        shape: ['square', 'circle', 'triangle'][Math.floor(Math.random() * 3)] as ConfettiPiece['shape'],
      }));

      setPieces(newPieces);

      setTimeout(() => {
        setPieces([]);
        setIsActive(false);
        onComplete?.();
      }, duration);
    }
  }, [trigger, isActive, particleCount, colors, duration, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              x: `${piece.x}vw`,
              y: `${piece.y}vh`,
              rotate: piece.rotation,
              opacity: 1,
            }}
            animate={{
              y: '110vh',
              rotate: piece.rotation + 720,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              ease: 'easeIn',
            }}
            style={{
              position: 'absolute',
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.shape !== 'triangle' ? piece.color : 'transparent',
              borderRadius: piece.shape === 'circle' ? '50%' : 0,
              borderLeft: piece.shape === 'triangle' ? `${piece.size / 2}px solid transparent` : undefined,
              borderRight: piece.shape === 'triangle' ? `${piece.size / 2}px solid transparent` : undefined,
              borderBottom: piece.shape === 'triangle' ? `${piece.size}px solid ${piece.color}` : undefined,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook for easy confetti triggering
export function useConfetti() {
  const [trigger, setTrigger] = useState(false);

  const fire = useCallback(() => {
    setTrigger(true);
  }, []);

  const reset = useCallback(() => {
    setTrigger(false);
  }, []);

  return {
    trigger,
    fire,
    reset,
    Confetti: (props: Omit<ConfettiProps, 'trigger'>) => (
      <Confetti trigger={trigger} onComplete={reset} {...props} />
    ),
  };
}

// Success celebration component
interface CelebrationProps {
  show: boolean;
  title?: string;
  message?: string;
  onClose?: () => void;
}

export function Celebration({
  show,
  title = 'Congratulations!',
  message = 'You did it!',
  onClose,
}: CelebrationProps) {
  const [confettiTrigger, setConfettiTrigger] = useState(false);

  useEffect(() => {
    if (show) {
      setConfettiTrigger(true);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <>
          <Confetti
            trigger={confettiTrigger}
            onComplete={() => setConfettiTrigger(false)}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-background border border-border rounded-2xl p-8 text-center max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
              <p className="text-foreground-secondary mb-6">{message}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
