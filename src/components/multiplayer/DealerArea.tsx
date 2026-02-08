'use client';

import { Card as CardType } from '@/engine/types';
import { evaluateHand } from '@/engine/hand';
import { Card } from '@/components/card/Card';

interface DealerAreaProps {
  dealerCards: (CardType | null)[];
  holeCardRevealed: boolean;
}

export function DealerArea({ dealerCards, holeCardRevealed }: DealerAreaProps) {
  // Calculate visible total
  const visibleCards = holeCardRevealed
    ? (dealerCards.filter(Boolean) as CardType[])
    : dealerCards.slice(0, 1).filter(Boolean) as CardType[];

  const total = visibleCards.length > 0 ? evaluateHand(visibleCards) : null;

  const totalLabel = total
    ? total.isBust
      ? `${total.best} (Bust)`
      : total.isBlackjack
        ? 'Blackjack!'
        : total.isSoft
          ? `${total.soft}/${total.hard}`
          : `${total.best}`
    : '';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-foreground/50 text-xs font-medium uppercase tracking-wider">
        Dealer
      </div>

      {/* Cards */}
      <div className="flex gap-1 justify-center min-h-[90px] md:min-h-28">
        {dealerCards.map((card, i) => {
          if (!card) {
            // Hole card placeholder (face down)
            return (
              <Card
                key={`hole-${i}`}
                card={{ suit: 'spades', rank: 'A' }}
                faceDown
              />
            );
          }
          return (
            <Card
              key={`${card.rank}-${card.suit}-${i}`}
              card={card}
              faceDown={false}
              animateEntry
              delay={i * 0.15}
            />
          );
        })}
      </div>

      {/* Total */}
      {totalLabel && (
        <div className="text-foreground text-sm font-bold">
          {totalLabel}
        </div>
      )}
    </div>
  );
}
