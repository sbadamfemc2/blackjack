'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface CreateRoomFormProps {
  balance: number;
  onSubmit: (settings: { minBet: number; maxBet: number; maxPlayers: number; buyIn: number }) => void;
  submitting: boolean;
}

const MIN_BET_OPTIONS = [5, 10, 25, 50, 100];
const MAX_PLAYER_OPTIONS = [2, 3, 4, 5];

export function CreateRoomForm({ balance, onSubmit, submitting }: CreateRoomFormProps) {
  const [minBet, setMinBet] = useState(25);
  const [maxPlayers, setMaxPlayers] = useState(5);

  const maxBet = minBet * 20;
  const buyIn = minBet * 20;
  const canAfford = balance >= buyIn;

  return (
    <div className="space-y-6">
      {/* Min bet */}
      <div>
        <label className="block text-foreground/60 text-sm font-semibold mb-2">
          Minimum Bet
        </label>
        <div className="grid grid-cols-5 gap-2">
          {MIN_BET_OPTIONS.map((bet) => (
            <button
              key={bet}
              type="button"
              onClick={() => setMinBet(bet)}
              className={`
                h-11 rounded-lg font-bold text-sm transition-all focus-ring
                ${minBet === bet
                  ? 'bg-accent text-background'
                  : 'bg-foreground/10 text-foreground/60 hover:bg-foreground/20'
                }
              `}
            >
              ${bet}
            </button>
          ))}
        </div>
        <p className="text-foreground/30 text-xs mt-1">
          Max bet: ${maxBet}
        </p>
      </div>

      {/* Max players */}
      <div>
        <label className="block text-foreground/60 text-sm font-semibold mb-2">
          Max Players
        </label>
        <div className="grid grid-cols-4 gap-2">
          {MAX_PLAYER_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxPlayers(n)}
              className={`
                h-11 rounded-lg font-bold text-sm transition-all focus-ring
                ${maxPlayers === n
                  ? 'bg-accent text-background'
                  : 'bg-foreground/10 text-foreground/60 hover:bg-foreground/20'
                }
              `}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Buy-in info */}
      <div className="rounded-lg bg-foreground/5 px-4 py-3 text-sm">
        <div className="flex justify-between text-foreground/60">
          <span>Table buy-in</span>
          <span className="font-semibold text-foreground">${buyIn.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-foreground/60 mt-1">
          <span>Your balance</span>
          <span className={`font-semibold ${canAfford ? 'text-foreground' : 'text-error'}`}>
            ${balance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Create button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => onSubmit({ minBet, maxBet, maxPlayers, buyIn })}
        disabled={!canAfford || submitting}
        className="w-full h-14 rounded-xl bg-accent text-background font-bold text-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Creating...' : 'Create Room'}
      </motion.button>

      {!canAfford && (
        <p className="text-error text-xs text-center">
          Insufficient balance for this buy-in
        </p>
      )}
    </div>
  );
}
