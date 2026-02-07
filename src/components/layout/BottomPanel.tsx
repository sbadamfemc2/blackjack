'use client';

import { ChipDenomination, GameAction, PlayerAction, GamePhase } from '@/engine/types';
import { ChipSelector } from '@/components/chips/ChipSelector';
import { BetControls } from '@/components/controls/BetControls';
import { ActionButtons } from '@/components/controls/ActionButtons';
import { motion, useReducedMotion } from 'framer-motion';

interface BottomPanelProps {
  phase: GamePhase;
  chips: number;
  bets: number[];
  availableActions: PlayerAction[];
  previousBets: number[];
  dispatch: (action: GameAction) => void;
  isAnimating: boolean;
  selectedDenom: ChipDenomination;
  onSelectDenom: (d: ChipDenomination) => void;
}

export function BottomPanel({
  phase,
  chips,
  bets,
  availableActions,
  previousBets,
  dispatch,
  isAnimating,
  selectedDenom,
  onSelectDenom,
}: BottomPanelProps) {
  const reducedMotion = useReducedMotion();
  const totalBets = bets.reduce((sum, b) => sum + b, 0);
  const remainingChips = chips - totalBets;
  const allBetsPlaced = bets.length > 0 && bets.every((b) => b >= 1);
  const hasBets = bets.some((b) => b > 0);

  const prevTotal = previousBets.reduce((sum, b) => sum + b, 0);
  const hasPreviousBets = previousBets.length > 0 && prevTotal > 0;
  const canAffordPrevious = prevTotal <= chips;
  const canAffordDouble = prevTotal * 2 <= chips;

  if (phase === 'BETTING') {
    return (
      <div className="flex flex-col gap-3 pb-4 pt-2">
        <ChipSelector
          selectedDenomination={selectedDenom}
          onSelect={onSelectDenom}
          availableChips={remainingChips}
        />
        <BetControls
          canDeal={allBetsPlaced && totalBets <= chips}
          hasBets={hasBets}
          hasPreviousBets={hasPreviousBets}
          canAffordPrevious={canAffordPrevious}
          canAffordDouble={canAffordDouble}
          onDeal={() => dispatch({ type: 'DEAL' })}
          onClear={() => dispatch({ type: 'CLEAR_ALL_BETS' })}
          onSameBet={() => dispatch({ type: 'SAME_BET', previousBets })}
          onDoubleBet={() => dispatch({ type: 'DOUBLE_PREVIOUS_BET', previousBets })}
        />
      </div>
    );
  }

  if (phase === 'PLAYER_ACTION' && !isAnimating) {
    return (
      <div className="pb-4 pt-2">
        <ActionButtons
          availableActions={availableActions}
          onAction={dispatch}
        />
      </div>
    );
  }

  if (phase === 'ROUND_OVER') {
    return (
      <div className="flex justify-center pb-4 pt-2 px-4">
        <motion.button
          type="button"
          whileTap={reducedMotion ? undefined : { scale: 0.97 }}
          onClick={() => dispatch({ type: 'NEW_ROUND' })}
          className="w-full md:max-w-md h-14 rounded-xl bg-accent text-background font-bold text-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 focus-ring"
        >
          NEW ROUND
        </motion.button>
      </div>
    );
  }

  // DEALER_PLAY, DEALING, RESOLUTION - show waiting state
  return (
    <div className="flex items-center justify-center pb-4 pt-2 h-20">
      <span className="text-foreground/40 text-sm animate-pulse">Dealer playing...</span>
    </div>
  );
}
