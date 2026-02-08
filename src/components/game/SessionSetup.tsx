'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GAME_CONFIG } from '@/engine/types';
import { ActiveSessionData } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { BalanceDisplay } from '@/components/ui/BalanceDisplay';
import Link from 'next/link';

interface SessionSetupProps {
  onStart: (chips: number, handsConfig: 1 | 2 | 3 | 4 | 5 | 6) => void;
  activeSession: ActiveSessionData | null;
  onResume: (session: ActiveSessionData) => void;
}

export function SessionSetup({ onStart, activeSession, onResume }: SessionSetupProps) {
  const [buyIn, setBuyIn] = useState(1000);
  const [hands, setHands] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const { user } = useAuth();
  const { balance, loading: balanceLoading } = useBalance(user?.id ?? null);

  return (
    <div className="h-dvh flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-1">
          Blackjack
        </h1>
        <p className="text-foreground/40 text-center text-sm mb-2">
          Vegas rules, 6-deck shoe
        </p>

        {/* Balance display for authenticated users */}
        {user && (
          <div className="text-center mb-6">
            <BalanceDisplay balance={balance} loading={balanceLoading} size="md" />
          </div>
        )}

        {/* Resume session */}
        {activeSession && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => onResume(activeSession)}
              className="w-full h-14 rounded-xl bg-success/20 border border-success/40 text-success font-bold text-sm hover:bg-success/30 transition-colors mb-2 focus-ring"
            >
              Resume Session
            </button>
            <p className="text-foreground/40 text-xs text-center">
              ${activeSession.currentChips.toLocaleString()} chips, Hand #{activeSession.handNumber}
            </p>
          </div>
        )}

        {/* Buy-in */}
        <div className="mb-6">
          <label className="block text-foreground/60 text-sm font-semibold mb-2">
            Buy-in Amount
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={GAME_CONFIG.MIN_BUY_IN}
              max={GAME_CONFIG.MAX_BUY_IN}
              step={GAME_CONFIG.BUY_IN_INCREMENT}
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="text-accent font-bold text-lg min-w-[80px] text-right">
              ${buyIn.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Hand count */}
        <div className="mb-8">
          <label className="block text-foreground/60 text-sm font-semibold mb-2">
            Number of Hands
          </label>
          <div className="grid grid-cols-6 gap-2">
            {([1, 2, 3, 4, 5, 6] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setHands(n)}
                className={`
                  h-11 rounded-lg font-bold text-sm transition-all focus-ring
                  ${hands === n
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

        {/* Start button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => onStart(buyIn, hands)}
          className="w-full h-14 rounded-xl bg-accent text-background font-bold text-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 focus-ring"
        >
          {activeSession ? 'New Session' : 'Start Playing'}
        </motion.button>

        {/* Multiplayer section */}
        <div className="mt-8 pt-6 border-t border-foreground/10">
          <p className="text-foreground/50 text-xs font-semibold uppercase tracking-wider mb-3 text-center">
            Multiplayer
          </p>
          {user ? (
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/room/create"
                className="h-11 rounded-lg bg-foreground/10 text-foreground/70 font-semibold text-sm hover:bg-foreground/20 transition-colors flex items-center justify-center focus-ring"
              >
                Create Room
              </Link>
              <Link
                href="/room/join"
                className="h-11 rounded-lg bg-foreground/10 text-foreground/70 font-semibold text-sm hover:bg-foreground/20 transition-colors flex items-center justify-center focus-ring"
              >
                Join Room
              </Link>
            </div>
          ) : (
            <p className="text-foreground/30 text-xs text-center">
              <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
                Sign in
              </Link>
              {' '}to play multiplayer
            </p>
          )}
        </div>

        {/* Auth / Stats links */}
        <div className="mt-6 text-center flex items-center justify-center gap-4">
          {user ? (
            <Link href="/stats" className="text-foreground/40 text-sm hover:text-foreground/60 transition-colors">
              View Stats
            </Link>
          ) : (
            <Link href="/login" className="text-foreground/40 text-sm hover:text-foreground/60 transition-colors">
              Sign in to save progress
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
