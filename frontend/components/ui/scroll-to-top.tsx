'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  threshold?: number;
  smooth?: boolean;
  className?: string;
  containerRef?: React.RefObject<HTMLElement>;
}

export function ScrollToTop({
  threshold = 300,
  smooth = true,
  className,
  containerRef,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef?.current || window;
    const handleScroll = () => {
      const scrollTop = containerRef?.current
        ? containerRef.current.scrollTop
        : window.scrollY;
      setIsVisible(scrollTop > threshold);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [threshold, containerRef]);

  const scrollToTop = () => {
    const container = containerRef?.current || window;
    if (containerRef?.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-6 right-6 z-40',
            'w-12 h-12 rounded-full',
            'bg-primary text-white shadow-lg shadow-primary/25',
            'flex items-center justify-center',
            'hover:bg-primary/90 transition-colors',
            className
          )}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Scroll progress indicator
interface ScrollProgressProps {
  className?: string;
  containerRef?: React.RefObject<HTMLElement>;
}

export function ScrollProgress({ className, containerRef }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef?.current || document.documentElement;

    const handleScroll = () => {
      const scrollTop = containerRef?.current
        ? containerRef.current.scrollTop
        : window.scrollY;
      const scrollHeight = containerRef?.current
        ? containerRef.current.scrollHeight - containerRef.current.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;

      const scrollProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(scrollProgress);
    };

    const target = containerRef?.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  return (
    <div className={cn('fixed top-0 left-0 right-0 h-1 z-50', className)}>
      <motion.div
        className="h-full bg-primary"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}
