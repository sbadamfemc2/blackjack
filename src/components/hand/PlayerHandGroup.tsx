'use client';

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

function formatTotal(total: HandTotal, hideResult?: boolean): string {
  if (!hideResult) {
    if (total.isBlackjack) return 'BJ';
    if (total.isBust) return 'BUST';
  }
  if (total.isSoft && total.best < 21) return `${total.best}`;
  return `${total.best}`;
}

export function PlayerHandGroup({
  hand,
  total,
  isActive,
  dealBaseDelay = 0,
  animateEntry = false,
  showOutcome,
}: PlayerHandGroupProps) {
  // Hide bust/BJ text until outcome is ready to display
  const hideResult = showOutcome === false;

  return (
    <div className={`flex flex-col items-center gap-1 transition-all duration-200 ${
      isActive ? 'scale-105' : 'scale-100 opacity-80'
    }`}>
      {/* Hand total */}
      <span
        className={`text-sm md:text-base font-bold ${
          !hideResult && total.isBust ? 'text-error' : !hideResult && total.isBlackjack ? 'text-accent' : 'text-foreground'
        }`}
      >
        {formatTotal(total, hideResult)}
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
