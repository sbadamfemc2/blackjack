'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ChipStack } from './ChipStack';

interface BettingCircleProps {
  bet: number;
  isActive: boolean;
  onClick: () => void;
}

export function BettingCircle({ bet, isActive, onClick }: BettingCircleProps) {
  const reducedMotion = useReducedMotion();
  const isEmpty = bet <= 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={isActive && !reducedMotion ? { scale: 0.95 } : undefined}
      className={`
        relative w-16 h-16 md:w-20 md:h-20 rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${isEmpty
          ? 'border-2 border-dashed border-foreground/30'
          : 'border-2 border-accent/60'
        }
        ${isActive ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* Pulsing animation for empty active circle */}
      {isEmpty && isActive && !reducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent/30"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Chip stack */}
      {!isEmpty && (
        <div className="flex flex-col items-center">
          <ChipStack amount={bet} />
          <span className="text-[10px] md:text-xs font-bold text-accent mt-0.5">
            ${bet}
          </span>
        </div>
      )}
    </motion.button>
  );
}
