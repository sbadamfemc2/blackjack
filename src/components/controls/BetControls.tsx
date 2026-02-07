'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface BetControlsProps {
  canDeal: boolean;
  hasBets: boolean;
  hasPreviousBets: boolean;
  canAffordPrevious: boolean;
  canAffordDouble: boolean;
  onDeal: () => void;
  onClear: () => void;
  onSameBet: () => void;
  onDoubleBet: () => void;
}

export function BetControls({
  canDeal,
  hasBets,
  hasPreviousBets,
  canAffordPrevious,
  canAffordDouble,
  onDeal,
  onClear,
  onSameBet,
  onDoubleBet,
}: BetControlsProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-2 w-full px-4 md:px-0 md:max-w-md md:mx-auto">
      {/* Quick bet row */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSameBet}
          disabled={!hasPreviousBets || !canAffordPrevious}
          className="flex-1 h-11 rounded-lg border border-foreground/20 text-foreground/70 text-xs md:text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:border-accent/50 transition-colors focus-ring"
        >
          Same Bet
        </button>
        <button
          type="button"
          onClick={onDoubleBet}
          disabled={!hasPreviousBets || !canAffordDouble}
          className="flex-1 h-11 rounded-lg border border-foreground/20 text-foreground/70 text-xs md:text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:border-accent/50 transition-colors focus-ring"
        >
          2x Bet
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasBets}
          className="flex-1 h-11 rounded-lg border border-foreground/20 text-foreground/70 text-xs md:text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:border-error/50 transition-colors focus-ring"
        >
          Clear
        </button>
      </div>

      {/* Deal button */}
      <motion.button
        type="button"
        onClick={onDeal}
        disabled={!canDeal}
        whileTap={canDeal && !reducedMotion ? { scale: 0.97 } : undefined}
        className={`
          h-14 rounded-xl font-bold text-lg tracking-wide focus-ring
          transition-all duration-200
          ${canDeal
            ? 'bg-accent text-background hover:bg-accent-hover shadow-lg shadow-accent/20'
            : 'bg-foreground/10 text-foreground/30 cursor-not-allowed'
          }
        `}
      >
        DEAL
      </motion.button>
    </div>
  );
}
