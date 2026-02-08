'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { useRoom } from '@/hooks/useRoom';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { BalanceDisplay } from '@/components/ui/BalanceDisplay';
import { Toast } from '@/components/ui/Toast';
import { RoomHeader } from '@/components/room/RoomHeader';
import { PlayerList } from '@/components/room/PlayerList';
import { MultiplayerGameTable } from '@/components/multiplayer/MultiplayerGameTable';
import { LeaveTableModal } from '@/components/modals/LeaveTableModal';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useBalance(user?.id ?? null);
  const { room, players, presences, isHost, loading: roomLoading, error, refreshPlayers } = useRoom(
    code,
    user?.id ?? null
  );
  const {
    gameState,
    placeBet,
    deal,
    hit,
    stand,
    double: doubleFn,
    split,
    nextRound,
  } = useMultiplayerGame(code, room?.id ?? null, user?.id ?? null, room?.status);

  // Refresh player chip counts when a round ends
  const prevPhaseRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const phase = gameState?.phase;
    if (phase === 'round_over' && prevPhaseRef.current !== 'round_over') {
      refreshPlayers();
    }
    prevPhaseRef.current = phase;
  }, [gameState?.phase, refreshPlayers]);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToastMessage(null), []);

  // Auto-refill detection: chips go from 0 to 1000
  const prevChipsRef = useRef<number | undefined>(undefined);
  const myChipsAtTable = players.find((p) => p.userId === user?.id)?.chipsAtTable ?? 0;

  useEffect(() => {
    if (prevChipsRef.current === 0 && myChipsAtTable === 1000) {
      setToastMessage('Balance refilled: +$1,000');
    }
    prevChipsRef.current = myChipsAtTable;
  }, [myChipsAtTable]);

  // Leave modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeavingGame, setIsLeavingGame] = useState(false);

  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const isInRoom = players.some((p) => p.userId === user?.id);

  // Auto-join when arriving from /room/join (not already in room, not host)
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);

  useEffect(() => {
    if (autoJoinAttempted || !room || !user || isInRoom || roomLoading) return;
    setAutoJoinAttempted(true);

    // Only auto-join if we're not the host (host is auto-seated on create)
    if (room.hostId !== user.id) {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, user, isInRoom, roomLoading, autoJoinAttempted]);

  const handleJoin = async () => {
    if (!room || !user) return;
    setJoining(true);
    setJoinError(null);

    const buyIn = room.minBet * 20;
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyIn }),
    });

    if (!res.ok) {
      const data = await res.json();
      setJoinError(data.error ?? 'Failed to join');
      setJoining(false);
      return;
    }

    setJoining(false);
    refreshBalance();
  };

  const handleLeave = async () => {
    setLeaving(true);
    await fetch(`/api/rooms/${code}/leave`, { method: 'POST' });
    refreshBalance();
    router.push('/');
  };

  const handleLeaveDuringGame = async () => {
    setIsLeavingGame(true);
    await fetch(`/api/rooms/${code}/leave`, { method: 'POST' });
    refreshBalance();
    router.push('/');
  };

  const handleStartGame = async () => {
    setStarting(true);
    const res = await fetch(`/api/rooms/${code}/start`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      setJoinError(data.error ?? 'Failed to start game');
    }
    setStarting(false);
  };

  // Loading states
  if (authLoading || balanceLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <span className="text-foreground/40 text-sm">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-foreground/60 text-sm mb-4">Sign in to join rooms</p>
          <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (roomLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <span className="text-foreground/40 text-sm">Loading room...</span>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-error text-sm mb-4">{error ?? 'Room not found'}</p>
          <Link href="/" className="text-accent hover:text-accent-hover transition-colors text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (room.status === 'closed') {
    return (
      <div className="h-dvh flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-foreground/60 text-sm mb-4">This room has been closed</p>
          <Link href="/" className="text-accent hover:text-accent-hover transition-colors text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // PLAYING: Loading game state
  // ============================================================
  if (room.status === 'playing' && !gameState) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gradient-to-b from-felt-dark via-felt to-felt-dark">
        <span className="text-foreground/40 text-sm">Loading game...</span>
      </div>
    );
  }

  // ============================================================
  // PLAYING: Show game table
  // ============================================================
  if (room.status === 'playing' && gameState) {
    return (
      <div className="h-dvh flex flex-col bg-gradient-to-b from-felt-dark via-felt to-felt-dark">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
          <div className="flex items-center gap-3">
            <span className="text-foreground/40 text-xs font-mono">{room.code}</span>
            <span className="text-foreground/20 text-xs">Round {gameState.roundNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <BalanceDisplay balance={myChipsAtTable} />
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="text-foreground/40 hover:text-foreground/60 transition-colors focus-ring rounded-lg p-1"
              aria-label="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6.5 1.5h3l.4 1.6.8.4 1.5-.7 2.1 2.1-.7 1.5.4.8 1.6.4v3l-1.6.4-.4.8.7 1.5-2.1 2.1-1.5-.7-.8.4-.4 1.6h-3l-.4-1.6-.8-.4-1.5.7-2.1-2.1.7-1.5-.4-.8L1.5 9.5v-3l1.6-.4.4-.8-.7-1.5L4.9 1.7l1.5.7.8-.4.3-1.4Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Game table */}
        <div className="flex-1 overflow-hidden">
          <MultiplayerGameTable
            gameState={gameState}
            players={players}
            currentUserId={user.id}
            isHost={isHost}
            minBet={room.minBet}
            maxBet={room.maxBet}
            placeBet={placeBet}
            deal={deal}
            hit={hit}
            stand={stand}
            double={doubleFn}
            split={split}
            nextRound={nextRound}
          />
        </div>

        {/* Leave modal */}
        {showLeaveModal && (
          <LeaveTableModal
            onConfirm={handleLeaveDuringGame}
            onCancel={() => setShowLeaveModal(false)}
            isLeaving={isLeavingGame}
          />
        )}

        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <Toast message={toastMessage} onDismiss={dismissToast} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================================
  // WAITING: Show lobby
  // ============================================================
  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
        <Link
          href="/"
          className="text-foreground/40 text-sm hover:text-foreground/60 transition-colors"
        >
          &larr; Home
        </Link>
        <BalanceDisplay balance={balance} />
      </div>

      {/* Room content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm mx-auto space-y-6"
        >
          <RoomHeader room={room} playerCount={players.length} />

          <PlayerList
            players={players}
            presences={presences}
            hostId={room.hostId}
            currentUserId={user.id}
          />

          {/* Join error */}
          {joinError && (
            <p className="text-error text-sm text-center">{joinError}</p>
          )}

          {/* Status messages */}
          {room.status === 'waiting' && (
            <div className="text-center space-y-4">
              {isHost ? (
                <div>
                  <button
                    type="button"
                    onClick={handleStartGame}
                    disabled={starting || players.length < 1}
                    className="w-full h-14 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                  >
                    {starting ? 'Starting...' : 'Start Game'}
                  </button>
                  {players.length < 1 && (
                    <p className="text-foreground/30 text-xs mt-2">
                      Waiting for players to join...
                    </p>
                  )}
                </div>
              ) : isInRoom ? (
                <p className="text-foreground/40 text-sm">
                  Waiting for host to start the game...
                </p>
              ) : joining ? (
                <p className="text-foreground/40 text-sm">Joining...</p>
              ) : null}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom actions */}
      {isInRoom && (
        <div className="px-4 py-4 border-t border-foreground/10">
          <div className="max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaving}
              className="w-full h-11 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-semibold hover:bg-error/20 transition-colors focus-ring"
            >
              {leaving ? 'Leaving...' : 'Leave Room'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
