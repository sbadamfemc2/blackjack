'use client';

import { Card as CardType, HandOutcome } from '@/engine/types';
import { evaluateHand } from '@/engine/hand';
import { Card } from '@/components/card/Card';
import { PlayerHandState } from '@/lib/types/game';

interface PlayerSeatProps {
  hand: PlayerHandState;
  isActive: boolean;
  isCurrentUser: boolean;
  displayName: string;
  chipsAtTable: number;
}

const OUTCOME_LABELS: Record<HandOutcome, { text: string; color: string }> = {
  win: { text: 'Win', color: 'text-green-400' },
  blackjack: { text: 'Blackjack!', color: 'text-yellow-400' },
  loss: { text: 'Loss', color: 'text-red-400' },
  push: { text: 'Push', color: 'text-foreground/60' },
  surrender: { text: 'Surrender', color: 'text-orange-400' },
};

export function PlayerSeat({ hand, isActive, isCurrentUser, displayName, chipsAtTable }: PlayerSeatProps) {
  const total = hand.cards.length > 0 ? evaluateHand(hand.cards, hand.isSplit) : null;

  const totalLabel = total
    ? total.isBust
      ? `${total.best} (Bust)`
      : total.isBlackjack
        ? 'BJ!'
        : total.isSoft
          ? `${total.soft}/${total.hard}`
          : `${total.best}`
    : '';

  return (
    <div
      className={`
        relative rounded-xl p-3 transition-all
        ${isActive ? 'ring-2 ring-yellow-400 bg-yellow-400/15' : 'bg-black/20'}
      `}
    >
      {/* Player name + chips */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground text-sm font-semibold truncate max-w-[100px]">
            {displayName}
          </span>
          {isCurrentUser && (
            <span className="text-foreground/30 text-xs">(You)</span>
          )}
          {hand.isSplit && (
            <span className="text-foreground/30 text-xs">(Split)</span>
          )}
        </div>
        <span className="text-foreground/50 text-xs">
          ${chipsAtTable.toLocaleString()}
        </span>
      </div>

      {/* Bet */}
      {hand.bet > 0 && (
        <div className="text-accent text-xs font-medium mb-2">
          Bet: ${hand.bet.toLocaleString()}
          {hand.isDoubled && ' (Doubled)'}
        </div>
      )}

      {/* Cards */}
      <div className="flex gap-0.5 justify-center min-h-[70px]">
        {hand.cards.map((card: CardType, i: number) => (
          <div key={`${card.rank}-${card.suit}-${i}`} className="scale-75 origin-center -mx-1">
            <Card
              card={card}
              faceDown={false}
              animateEntry
              delay={i * 0.1}
            />
          </div>
        ))}
      </div>

      {/* Total */}
      {totalLabel && !hand.outcome && (
        <div className="text-center text-foreground text-xs font-bold mt-1">
          {totalLabel}
        </div>
      )}

      {/* Outcome */}
      {hand.outcome && (
        <div className={`text-center text-sm font-bold mt-1 ${OUTCOME_LABELS[hand.outcome].color}`}>
          {OUTCOME_LABELS[hand.outcome].text}
          {hand.payout > 0 && ` (+$${hand.payout})`}
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
      )}
    </div>
  );
}
