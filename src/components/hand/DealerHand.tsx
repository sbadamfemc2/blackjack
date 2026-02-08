'use client';

import { useState, useEffect, useRef } from 'react';
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
  const faceDownIndices = hand.holeCardRevealed ? undefined : new Set([1]);
  const currentTotal = formatTotal(hand, total);

  // Delay score display until card animation settles
  const [displayTotal, setDisplayTotal] = useState(currentTotal);
  const prevState = useRef({ cardCount: hand.cards.length, holeRevealed: hand.holeCardRevealed });

  useEffect(() => {
    const prev = prevState.current;
    const cardAdded = hand.cards.length > prev.cardCount;
    const holeRevealed = hand.holeCardRevealed && !prev.holeRevealed;

    prevState.current = { cardCount: hand.cards.length, holeRevealed: hand.holeCardRevealed };

    if (cardAdded || holeRevealed) {
      let delayMs: number;
      if (holeRevealed && !cardAdded) {
        delayMs = 1000; // 0.5s flip animation + 0.5s pause
      } else {
        delayMs = 1200; // 0.7s card animation + 0.5s pause
      }
      const timer = setTimeout(() => setDisplayTotal(currentTotal), delayMs);
      return () => clearTimeout(timer);
    }

    setDisplayTotal(currentTotal);
  }, [currentTotal, hand.cards.length, hand.holeCardRevealed]);

  if (hand.cards.length === 0) return null;

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
            displayTotal === 'BUST' ? 'text-error' : displayTotal === 'BJ' ? 'text-accent' : 'text-foreground'
          }`}
        >
          {displayTotal}
        </span>
      )}
    </div>
  );
}
