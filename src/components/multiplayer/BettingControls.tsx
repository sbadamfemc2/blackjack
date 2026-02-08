'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChipDenomination } from '@/engine/types';
import { ChipSelector } from '@/components/chips/ChipSelector';
import { BettingCircle } from '@/components/chips/BettingCircle';

interface BettingControlsProps {
  minBet: number;
  maxBet: number;
  chipsAtTable: number;
  currentBet: number;
  onPlaceBet: (amount: number) => Promise<{ error?: string }>;
  isHost: boolean;
  canDeal: boolean;
  onDeal: () => Promise<{ error?: string }>;
  previousBet: number;
}

export function BettingControls({
  minBet,
  maxBet,
  chipsAtTable,
  currentBet,
  onPlaceBet,
  isHost,
  canDeal,
  onDeal,
  previousBet,
}: BettingControlsProps) {
  const reducedMotion = useReducedMotion();
  const [selectedDenom, setSelectedDenom] = useState<ChipDenomination>(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingChips = chipsAtTable - currentBet;

  const handleCircleClick = async () => {
    const newBet = currentBet + selectedDenom;
    if (newBet > maxBet || newBet > chipsAtTable) return;
    setLoading(true);
    setError(null);
    const result = await onPlaceBet(newBet);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const handleClear = async () => {
    setLoading(true);
    setError(null);
    const result = await onPlaceBet(0);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const handleSameBet = async () => {
    if (!previousBet || previousBet > chipsAtTable) return;
    setLoading(true);
    setError(null);
    const result = await onPlaceBet(previousBet);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const handleDoubleBet = async () => {
    const doubled = previousBet * 2;
    if (!previousBet || doubled > chipsAtTable || doubled > maxBet) return;
    setLoading(true);
    setError(null);
    const result = await onPlaceBet(doubled);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const handleDeal = async () => {
    setLoading(true);
    setError(null);
    const result = await onDeal();
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const hasBets = currentBet > 0;
  const hasPreviousBets = previousBet > 0;
  const canAffordPrevious = previousBet <= chipsAtTable;
  const canAffordDouble = previousBet * 2 <= chipsAtTable && previousBet * 2 <= maxBet;
  const betMeetsMin = currentBet >= minBet;

  return (
    <div className="flex flex-col gap-3">
      {/* Chip selector */}
      <ChipSelector
        selectedDenomination={selectedDenom}
        onSelect={setSelectedDenom}
        availableChips={remainingChips}
      />

      {/* Betting circle */}
      <div className="flex justify-center">
        <BettingCircle
          bet={currentBet}
          isActive={!loading}
          onClick={handleCircleClick}
        />
      </div>

      {/* Quick bet row */}
      <div className="flex gap-2 px-4 md:px-0 md:max-w-md md:mx-auto w-full">
        <button
          type="button"
          onClick={handleSameBet}
          disabled={!hasPreviousBets || !canAffordPrevious || loading}
          className="flex-1 h-11 rounded-lg border border-foreground/20 text-foreground/70 text-xs md:text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:border-accent/50 transition-colors focus-ring"
        >
          Same Bet
        </button>
        <button
          type="button"
          onClick={handleDoubleBet}
          disabled={!hasPreviousBets || !canAffordDouble || loading}
          className="flex-1 h-11 rounded-lg border border-foreground/20 text-foreground/70 text-xs md:text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:border-accent/50 transition-colors focus-ring"
        >
          2x Bet
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasBets || loading}
          className="flex-1 h-11 rounded-lg border border-foreground/20 text-foreground/70 text-xs md:text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:border-error/50 transition-colors focus-ring"
        >
          Clear
        </button>
      </div>

      {/* Deal button (host) or waiting message */}
      {isHost ? (
        <div className="px-4 md:px-0 md:max-w-md md:mx-auto w-full">
          <motion.button
            type="button"
            onClick={handleDeal}
            disabled={!canDeal || !betMeetsMin || loading}
            whileTap={canDeal && betMeetsMin && !reducedMotion ? { scale: 0.97 } : undefined}
            className={`
              w-full h-14 rounded-xl font-bold text-lg tracking-wide focus-ring
              transition-all duration-200
              ${canDeal && betMeetsMin
                ? 'bg-accent text-background hover:bg-accent-hover shadow-lg shadow-accent/20'
                : 'bg-foreground/10 text-foreground/30 cursor-not-allowed'
              }
            `}
          >
            {loading ? 'Dealing...' : 'DEAL'}
          </motion.button>
        </div>
      ) : hasBets ? (
        <div className="text-center text-foreground/40 text-sm py-2">
          Waiting for host to deal...
        </div>
      ) : null}

      {error && <p className="text-error text-xs text-center">{error}</p>}
    </div>
  );
}
