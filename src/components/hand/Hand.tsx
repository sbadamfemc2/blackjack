'use client';

import { Card as CardType } from '@/engine/types';
import { Card } from '@/components/card/Card';

interface HandProps {
  cards: CardType[];
  faceDownIndices?: Set<number>;
  isActive?: boolean;
  dealBaseDelay?: number;
  animateEntry?: boolean;
}

export function Hand({
  cards,
  faceDownIndices,
  isActive = false,
  dealBaseDelay = 0,
  animateEntry = false,
}: HandProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex">
        {cards.map((card, i) => (
          <div
            key={`${card.suit}-${card.rank}-${i}`}
            className={i > 0 ? '-ml-6 md:-ml-8 lg:-ml-10' : ''}
            style={{ zIndex: i }}
          >
            <Card
              card={card}
              faceDown={faceDownIndices?.has(i) ?? false}
              delay={i < 2 ? dealBaseDelay + i * 0.15 : 0}
              animateEntry={animateEntry}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
