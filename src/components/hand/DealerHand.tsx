'use client';

import { DealerHand as DealerHandType, HandTotal } from '@/engine/types';
import { getCardValue } from '@/engine/hand';
import { Hand } from './Hand';

interface DealerHandProps {
  hand: DealerHandType;
  total: HandTotal | null;
  dealBaseDelay?: number;
  animateEntry?: boolean;
}

function formatTotal(hand: DealerHandType, total: HandTotal | null): string {
  if (!total || hand.cards.length === 0) return '';
  if (!hand.holeCardRevealed) {
    // Show upcard value only
    const upValue = getCardValue(hand.cards[0].rank);
    return `${upValue}`;
  }
  if (total.isBlackjack) return 'BJ';
  if (total.isBust) return 'BUST';
  return `${total.best}`;
}

export function DealerHand({ hand, total, dealBaseDelay = 0, animateEntry = false }: DealerHandProps) {
  if (hand.cards.length === 0) return null;

  const faceDownIndices = hand.holeCardRevealed ? undefined : new Set([1]);
  const displayTotal = formatTotal(hand, total);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs md:text-sm text-neutral/60 uppercase tracking-wider font-semibold">
        Dealer
      </span>
      <Hand
        cards={hand.cards}
        faceDownIndices={faceDownIndices}
        dealBaseDelay={dealBaseDelay}
        animateEntry={animateEntry}
      />
      {hand.cards.length > 0 && (
        <span
          className={`text-sm md:text-base font-bold mt-0.5 ${
            total?.isBust ? 'text-error' : total?.isBlackjack ? 'text-accent' : 'text-foreground'
          }`}
        >
          {displayTotal}
        </span>
      )}
    </div>
  );
}
