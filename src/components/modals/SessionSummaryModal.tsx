'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SessionSummary } from '@/engine/types';
import { StatItem } from '@/components/stats/StatItem';

interface SessionSummaryModalProps {
  summary: SessionSummary;
  isBusted: boolean;
  onNewSession: () => void;
  onViewStats?: () => void;
}

export function SessionSummaryModal({
  summary,
  isBusted,
  onNewSession,
  onViewStats,
}: SessionSummaryModalProps) {
  const reducedMotion = useReducedMotion();
  const net = summary.netWinLoss;
  const netColor = net > 0 ? 'text-success' : net < 0 ? 'text-error' : 'text-foreground/60';
  const netPrefix = net > 0 ? '+' : '';

  // ESC key dismisses modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onNewSession();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewSession]);

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
        {/* Header */}
        <h2
          id="modal-title"
          className={`font-bold text-xl text-center mb-1 ${
            isBusted ? 'text-error' : 'text-accent'
          }`}
        >
          {isBusted ? 'Busted!' : 'Session Complete'}
        </h2>
        {isBusted && (
          <p className="text-foreground/50 text-xs text-center mb-4">
            Better luck next time!
          </p>
        )}

        {/* Net win/loss */}
        <div className="text-center mb-5">
          <span className={`text-3xl font-bold ${netColor}`}>
            {netPrefix}${Math.abs(net).toLocaleString()}
          </span>
          <p className="text-foreground/40 text-xs mt-1">Net Result</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <StatItem
            label="Hands Played"
            value={summary.handsPlayed}
          />
          <StatItem
            label="Win Rate"
            value={summary.handsPlayed > 0 ? `${(summary.winRate * 100).toFixed(1)}%` : 'N/A'}
          />
          <StatItem
            label="Best Win"
            value={summary.biggestWin > 0 ? `+$${summary.biggestWin.toLocaleString()}` : '--'}
            valueColor={summary.biggestWin > 0 ? 'success' : 'default'}
          />
          <StatItem
            label="Worst Loss"
            value={summary.biggestLoss < 0 ? `-$${Math.abs(summary.biggestLoss).toLocaleString()}` : '--'}
            valueColor={summary.biggestLoss < 0 ? 'error' : 'default'}
          />
          <StatItem
            label="Buy-In"
            value={`$${summary.buyInAmount.toLocaleString()}`}
          />
          <StatItem
            label="Ending Chips"
            value={`$${summary.endingChips.toLocaleString()}`}
            valueColor={summary.endingChips > summary.buyInAmount ? 'success' : summary.endingChips < summary.buyInAmount ? 'error' : 'default'}
          />
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={onNewSession}
          autoFocus
          className="w-full h-12 rounded-xl bg-accent text-background font-bold text-sm hover:bg-accent-hover transition-colors mb-2 focus-ring"
        >
          New Session
        </button>

        {onViewStats && (
          <button
            type="button"
            onClick={onViewStats}
            className="w-full h-11 rounded-xl border border-foreground/20 text-foreground/60 font-semibold text-sm hover:bg-foreground/5 transition-colors focus-ring"
          >
            View Stats
          </button>
        )}
      </motion.div>
    </div>
  );
}
