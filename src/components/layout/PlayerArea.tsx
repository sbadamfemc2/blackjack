'use client';

import { PlayerHand, HandTotal } from '@/engine/types';
import { PlayerHandGroup } from '@/components/hand/PlayerHandGroup';
import { BettingCircle } from '@/components/chips/BettingCircle';

interface PlayerAreaProps {
  phase: string;
  playerHands: PlayerHand[];
  playerTotals: HandTotal[];
  activeHandIndex: number;
  bets: number[];
  handsConfiguration: number;
  onBetCircleClick: (handIndex: number) => void;
  animateEntry?: boolean;
}

export function PlayerArea({
  phase,
  playerHands,
  playerTotals,
  activeHandIndex,
  bets,
  handsConfiguration,
  onBetCircleClick,
  animateEntry = false,
}: PlayerAreaProps) {
  // During betting phase, show betting circles
  if (phase === 'BETTING') {
    return (
      <div className="flex items-center justify-center gap-3 md:gap-4 py-4 flex-wrap">
        {bets.map((bet, i) => (
          <BettingCircle
            key={i}
            bet={bet}
            isActive={true}
            onClick={() => onBetCircleClick(i)}
          />
        ))}
      </div>
    );
  }

  // During play, show player hands
  if (playerHands.length === 0) return null;

  const gridClass = playerHands.length <= 2
    ? 'flex justify-center gap-4 md:gap-6'
    : playerHands.length <= 4
      ? 'grid grid-cols-2 gap-2 md:gap-3 justify-items-center'
      : 'grid grid-cols-3 gap-1 md:gap-2 justify-items-center';

  // Scale down hands when there are many to prevent overflow
  const scaleClass = playerHands.length >= 5
    ? 'scale-[0.7] md:scale-[0.85] origin-top'
    : playerHands.length >= 3
      ? 'scale-[0.85] md:scale-100 origin-top'
      : '';

  return (
    <div className={`px-2 py-2 ${gridClass} ${scaleClass}`}>
      {playerHands.map((hand, i) => (
        <PlayerHandGroup
          key={i}
          hand={hand}
          total={playerTotals[i]}
          isActive={
            phase === 'PLAYER_ACTION' && i === activeHandIndex && !hand.isStood && !hand.isSurrendered
          }
          dealBaseDelay={i * 0.3}
          animateEntry={animateEntry}
        />
      ))}
    </div>
  );
}
