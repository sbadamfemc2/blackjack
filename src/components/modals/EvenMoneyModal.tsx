'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface EvenMoneyModalProps {
  bet: number;
  onAccept: () => void;
  onDecline: () => void;
}

export function EvenMoneyModal({ bet, onAccept, onDecline }: EvenMoneyModalProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <motion.div
        initial={reducedMotion ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background border border-foreground/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h2 id="modal-title" className="text-accent font-bold text-lg mb-2">Even Money?</h2>
        <p className="text-foreground/70 text-sm mb-4">
          You have Blackjack and the dealer is showing an Ace.
          Take guaranteed even money (${bet}) or risk it for 3:2 (${bet * 1.5})?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onAccept}
            autoFocus
            className="flex-1 h-12 rounded-xl bg-accent text-background font-bold text-sm hover:bg-accent-hover transition-colors focus-ring"
          >
            Take ${bet}
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 h-12 rounded-xl border border-foreground/20 text-foreground font-bold text-sm hover:bg-foreground/5 transition-colors focus-ring"
          >
            No Thanks
          </button>
        </div>
      </motion.div>
    </div>
  );
}
