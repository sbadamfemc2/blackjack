'use client';

import { useState, useEffect, useRef } from 'react';
import { PlayerHand, HandTotal } from '@/engine/types';
import { Hand } from './Hand';
import { HandOutcomeLabel } from './HandOutcomeLabel';

interface PlayerHandGroupProps {
  hand: PlayerHand;
  total: HandTotal;
  isActive: boolean;
  dealBaseDelay?: number;
  animateEntry?: boolean;
  showOutcome?: boolean;
}

function numericTotal(total: HandTotal): string {
  if (total.isSoft && total.best < 21) return `${total.best}`;
  return `${total.best}`;
}

function resultText(total: HandTotal): string | null {
  if (total.isBlackjack) return 'BJ';
  if (total.isBust) return 'BUST';
  return null;
}

export function PlayerHandGroup({
  hand,
  total,
  isActive,
  dealBaseDelay = 0,
  animateEntry = false,
  showOutcome,
}: PlayerHandGroupProps) {
  const currentNumeric = numericTotal(total);
  const currentResult = resultText(total);

  // Delay total display until card animation settles
  const [displayTotal, setDisplayTotal] = useState(currentNumeric);
  const [displayResult, setDisplayResult] = useState<string | null>(currentResult);
  const prevCardCount = useRef(hand.cards.length);

  useEffect(() => {
    const cardAdded = hand.cards.length > prevCardCount.current;
    prevCardCount.current = hand.cards.length;

    if (cardAdded) {
      // Hide result while new card settles
      setDisplayResult(null);

      // Delay numeric total by 1.2s (0.7s card animation + 0.5s pause)
      const totalTimer = setTimeout(() => setDisplayTotal(currentNumeric), 1200);

      // Delay result text (BUST/BJ) by 2.2s (total + 1.0s)
      const resultTimer = currentResult
        ? setTimeout(() => setDisplayResult(currentResult), 2200)
        : undefined;

      return () => {
        clearTimeout(totalTimer);
        if (resultTimer) clearTimeout(resultTimer);
      };
    }

    // No card added — update immediately
    setDisplayTotal(currentNumeric);
    setDisplayResult(currentResult);
  }, [currentNumeric, currentResult, hand.cards.length]);

  const shownText = displayResult ?? displayTotal;
  const isBust = displayResult === 'BUST';
  const isBJ = displayResult === 'BJ';

  return (
    <div className={`flex flex-col items-center gap-1 transition-all duration-200 ${
      isActive ? 'scale-105' : 'scale-100 opacity-80'
    }`}>
      {/* Hand total */}
      <span
        className={`text-sm md:text-base font-bold ${
          isBust ? 'text-error' : isBJ ? 'text-accent' : 'text-foreground'
        }`}
      >
        {shownText}
      </span>

      {/* Cards */}
      <div className={`rounded-xl p-1 ${isActive ? 'ring-2 ring-accent/60' : ''}`}>
        <Hand
          cards={hand.cards}
          isActive={isActive}
          dealBaseDelay={dealBaseDelay}
          animateEntry={animateEntry}
        />
      </div>

      {/* Bet amount */}
      <span className="text-xs md:text-sm text-accent font-semibold">
        ${hand.bet}
      </span>

      {/* Outcome label — delayed via showOutcome to let the player see the final card first */}
      {hand.outcome && showOutcome !== false && (
        <HandOutcomeLabel outcome={hand.outcome} payout={hand.payout} />
      )}
    </div>
  );
}
