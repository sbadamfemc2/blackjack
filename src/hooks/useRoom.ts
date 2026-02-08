'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  Room,
  RoomPlayer,
  PlayerPresence,
} from '@/lib/types/multiplayer';

export interface UseRoomReturn {
  room: Room | null;
  players: RoomPlayer[];
  presences: PlayerPresence[];
  isHost: boolean;
  loading: boolean;
  error: string | null;
  join: (buyIn: number) => Promise<{ error?: string }>;
  leave: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
}

export function useRoom(roomCode: string | null, userId: string | null): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [presences, setPresences] = useState<PlayerPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playersRef = useRef<RoomPlayer[]>(players);
  playersRef.current = players;
  const fetchVersionRef = useRef(0);

  const isHost = room !== null && userId !== null && room.hostId === userId;

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    if (!roomCode) return;

    const version = ++fetchVersionRef.current;

    const res = await fetch(`/api/rooms/${roomCode}`);
    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Failed to load room');
      setLoading(false);
      return;
    }

    // Only apply if no newer fetch has started (prevents stale overwrites)
    if (version !== fetchVersionRef.current) return;

    const data = await res.json();
    setRoom(data.room);
    setPlayers(data.players);
    setError(null);
    setLoading(false);
  }, [roomCode]);

  // Subscribe to Realtime
  useEffect(() => {
    if (!roomCode || !room?.id || !userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: userId } },
    });

    // Listen for player changes
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${room.id}`,
        },
        () => {
          // Re-fetch full player list on any change
          fetchRoom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'multiplayer_rooms',
          filter: `id=eq.${room.id}`,
        },
        () => {
          fetchRoom();
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PlayerPresence>();
        const allPresences: PlayerPresence[] = [];
        for (const key in state) {
          for (const presence of state[key]) {
            allPresences.push(presence);
          }
        }
        setPresences(allPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Find our seat/display info for presence
          const myPlayer = playersRef.current.find((p) => p.userId === userId);
          await channel.track({
            userId,
            displayName: myPlayer?.displayName ?? 'Player',
            seatNumber: myPlayer?.seatNumber ?? 0,
            isHost: room.hostId === userId,
          } satisfies PlayerPresence);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, room?.id, userId, fetchRoom]);

  // Initial fetch
  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const join = useCallback(async (buyIn: number): Promise<{ error?: string }> => {
    if (!roomCode) return { error: 'No room code' };

    const res = await fetch(`/api/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyIn }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { error: err.error ?? 'Failed to join' };
    }

    // Refresh room data
    await fetchRoom();
    return {};
  }, [roomCode, fetchRoom]);

  const leave = useCallback(async () => {
    if (!roomCode) return;

    await fetch(`/api/rooms/${roomCode}/leave`, { method: 'POST' });

    // Clean up channel
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [roomCode]);

  return {
    room,
    players,
    presences,
    isHost,
    loading,
    error,
    join,
    leave,
    refreshPlayers: fetchRoom,
  };
}
