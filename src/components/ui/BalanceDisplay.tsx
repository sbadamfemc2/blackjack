'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface BalanceDisplayProps {
  balance: number | null;
  loading?: boolean;
  size?: 'sm' | 'md';
}

export function BalanceDisplay({ balance, loading, size = 'md' }: BalanceDisplayProps) {
  const reducedMotion = useReducedMotion();

  if (loading) {
    return (
      <span className={`text-foreground/30 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        ...
      </span>
    );
  }

  if (balance === null) return null;

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm font-semibold';

  return (
    <span className={`inline-flex items-center gap-1 ${textSize}`}>
      <span className="text-accent">&#9679;</span>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={balance}
          initial={reducedMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 4 }}
          className="text-foreground"
        >
          ${balance.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
