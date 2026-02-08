'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold shadow-lg backdrop-blur-sm"
    >
      {message}
    </motion.div>
  );
}
