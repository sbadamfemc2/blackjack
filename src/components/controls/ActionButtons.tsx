'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { PlayerAction, GameAction } from '@/engine/types';

interface ActionButtonsProps {
  availableActions: PlayerAction[];
  onAction: (action: GameAction) => void;
}

const ACTION_CONFIG: Record<PlayerAction, {
  label: string;
  key: string;
  actionType: GameAction['type'];
  className: string;
}> = {
  hit: {
    label: 'HIT',
    key: 'H',
    actionType: 'HIT',
    className: 'bg-accent text-background hover:bg-accent-hover',
  },
  stand: {
    label: 'STAND',
    key: 'S',
    actionType: 'STAND',
    className: 'bg-foreground/20 text-foreground hover:bg-foreground/30',
  },
  double: {
    label: 'DOUBLE',
    key: 'D',
    actionType: 'DOUBLE_DOWN',
    className: 'bg-success/80 text-background hover:bg-success',
  },
  split: {
    label: 'SPLIT',
    key: 'P',
    actionType: 'SPLIT',
    className: 'bg-felt text-foreground hover:bg-felt-dark',
  },
  surrender: {
    label: 'SURRENDER',
    key: 'R',
    actionType: 'SURRENDER',
    className: 'bg-error/80 text-white hover:bg-error',
  },
};

export function ActionButtons({ availableActions, onAction }: ActionButtonsProps) {
  const reducedMotion = useReducedMotion();

  if (availableActions.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:justify-center md:gap-3 w-full px-4 md:px-0">
      {availableActions.map((action) => {
        const config = ACTION_CONFIG[action];
        return (
          <motion.button
            key={action}
            type="button"
            whileTap={reducedMotion ? undefined : { scale: 0.95 }}
            onClick={() => onAction({ type: config.actionType } as GameAction)}
            className={`
              relative h-14 rounded-xl font-bold text-sm md:text-base focus-ring
              ${config.className}
              md:min-w-[100px] md:px-6
              transition-colors duration-150
              ${action === 'surrender' && availableActions.length % 2 === 1 ? 'col-span-2' : ''}
            `}
          >
            {config.label}
            {/* Keyboard shortcut badge - desktop only */}
            <span className="hidden lg:inline-block absolute top-1 right-2 text-[10px] opacity-50 font-mono">
              {config.key}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
