'use client';

import { motion } from 'framer-motion';
import { HandOutcome } from '@/engine/types';

interface HandOutcomeLabelProps {
  outcome: HandOutcome;
  payout: number;
}

const OUTCOME_CONFIG: Record<HandOutcome, { label: string; className: string }> = {
  win: { label: 'WIN', className: 'bg-success/20 text-success border-success/40' },
  blackjack: { label: 'BLACKJACK!', className: 'bg-accent/20 text-accent border-accent/40' },
  loss: { label: 'LOSS', className: 'bg-error/20 text-error border-error/40' },
  push: { label: 'PUSH', className: 'bg-neutral/20 text-neutral border-neutral/40' },
  surrender: { label: 'SURRENDER', className: 'bg-error/20 text-error border-error/40' },
};

function formatPayout(payout: number): string {
  if (payout > 0) return `+$${payout}`;
  if (payout < 0) return `-$${Math.abs(payout)}`;
  return '$0';
}

export function HandOutcomeLabel({ outcome, payout }: HandOutcomeLabelProps) {
  const config = OUTCOME_CONFIG[outcome];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`inline-flex flex-col items-center px-3 py-1 rounded-lg border text-xs md:text-sm font-bold ${config.className}`}
    >
      <span>{config.label}</span>
      <span className="text-[10px] md:text-xs font-semibold">{formatPayout(payout)}</span>
    </motion.div>
  );
}
