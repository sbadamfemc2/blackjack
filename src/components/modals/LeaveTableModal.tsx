'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface LeaveTableModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isLeaving: boolean;
}

export function LeaveTableModal({ onConfirm, onCancel, isLeaving }: LeaveTableModalProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLeaving) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isLeaving) onCancel();
      }}
    >
      <motion.div
        initial={reducedMotion ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background border border-foreground/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h2 id="leave-modal-title" className="text-foreground font-bold text-lg mb-2">
          Leave Table?
        </h2>
        <p className="text-foreground/70 text-sm mb-4">
          Your chips will be returned to your balance.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLeaving}
            className="flex-1 h-12 rounded-xl bg-error/10 border border-error/20 text-error font-bold text-sm hover:bg-error/20 transition-colors disabled:opacity-40 focus-ring"
          >
            {isLeaving ? 'Leaving...' : 'Leave'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLeaving}
            autoFocus
            className="flex-1 h-12 rounded-xl border border-foreground/20 text-foreground font-bold text-sm hover:bg-foreground/5 transition-colors disabled:opacity-40 focus-ring"
          >
            Stay
          </button>
        </div>
      </motion.div>
    </div>
  );
}
