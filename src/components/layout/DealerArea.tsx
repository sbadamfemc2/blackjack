'use client';

import { DealerHand as DealerHandType, HandTotal } from '@/engine/types';
import { DealerHand } from '@/components/hand/DealerHand';

interface DealerAreaProps {
  hand: DealerHandType;
  total: HandTotal | null;
  animateEntry?: boolean;
}

export function DealerArea({ hand, total, animateEntry = false }: DealerAreaProps) {
  return (
    <div className="flex items-center justify-center py-2 md:py-4">
      {hand.cards.length > 0 ? (
        <DealerHand hand={hand} total={total} animateEntry={animateEntry} />
      ) : (
        <div className="h-[90px] md:h-28 lg:h-[134px] flex items-center justify-center">
          <span className="text-foreground/20 text-sm uppercase tracking-widest">Dealer</span>
        </div>
      )}
    </div>
  );
}
