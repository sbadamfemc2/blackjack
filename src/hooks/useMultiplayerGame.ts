'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { ClientGameState, toMultiplayerGameState, toClientGameState, GameRoundRow } from '@/lib/types/game';

export interface UseMultiplayerGameReturn {
  gameState: ClientGameState | null;
  loading: boolean;
  error: string | null;
  placeBet: (amount: number) => Promise<{ error?: string }>;
  deal: () => Promise<{ error?: string }>;
  hit: () => Promise<{ error?: string }>;
  stand: () => Promise<{ error?: string }>;
  double: () => Promise<{ error?: string }>;
  split: () => Promise<{ error?: string }>;
  nextRound: () => Promise<{ error?: string }>;
}

export function useMultiplayerGame(
  roomCode: string | null,
  roomId: string | null,
  userId: string | null,
  roomStatus?: string
): UseMultiplayerGameReturn {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch the latest game round from DB
  const fetchGameState = useCallback(async () => {
    if (!roomId) return;
    const supabase = createClient();
    const { data: roundRow } = await supabase
      .from('multiplayer_game_rounds')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (roundRow) {
      const state = toMultiplayerGameState(roundRow as GameRoundRow);
      setGameState(toClientGameState(state));
    }
    setLoading(false);
  }, [roomId]);

  // Subscribe to game round changes
  useEffect(() => {
    if (!roomCode || !roomId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`game:${roomCode}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'multiplayer_game_rounds',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const state = toMultiplayerGameState(payload.new as GameRoundRow);
          setGameState(toClientGameState(state));
          setLoading(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'multiplayer_game_rounds',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const state = toMultiplayerGameState(payload.new as GameRoundRow);
          setGameState(toClientGameState(state));
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Fetch current round on mount (in case we missed the INSERT)
    fetchGameState();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, roomId, fetchGameState]);

  // Re-fetch when room transitions to 'playing' (catches missed Realtime events)
  useEffect(() => {
    if (roomStatus === 'playing' && !gameState && roomId) {
      fetchGameState();
    }
  }, [roomStatus, gameState, roomId, fetchGameState]);

  // Helper for API calls
  const apiCall = useCallback(
    async (path: string, body?: object): Promise<{ error?: string }> => {
      if (!roomCode) return { error: 'No room code' };

      const res = await fetch(`/api/rooms/${roomCode}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const err = await res.json();
        return { error: err.error ?? 'Request failed' };
      }

      return {};
    },
    [roomCode]
  );

  const placeBet = useCallback(
    (amount: number) => apiCall('/bet', { amount }),
    [apiCall]
  );

  const deal = useCallback(() => apiCall('/deal'), [apiCall]);

  const hit = useCallback(() => apiCall('/action', { action: 'hit' }), [apiCall]);

  const stand = useCallback(() => apiCall('/action', { action: 'stand' }), [apiCall]);

  const double = useCallback(() => apiCall('/action', { action: 'double' }), [apiCall]);

  const split = useCallback(() => apiCall('/action', { action: 'split' }), [apiCall]);

  const nextRound = useCallback(() => apiCall('/next-round'), [apiCall]);

  return {
    gameState,
    loading,
    error,
    placeBet,
    deal,
    hit,
    stand,
    double,
    split,
    nextRound,
  };
}
