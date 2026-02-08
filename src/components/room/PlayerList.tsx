'use client';

import { RoomPlayer, PlayerPresence } from '@/lib/types/multiplayer';

interface PlayerListProps {
  players: RoomPlayer[];
  presences: PlayerPresence[];
  hostId: string;
  currentUserId: string;
}

export function PlayerList({ players, presences, hostId, currentUserId }: PlayerListProps) {
  const onlineUserIds = new Set(presences.map((p) => p.userId));

  return (
    <div className="space-y-2">
      <p className="text-foreground/50 text-xs font-semibold uppercase tracking-wider">
        Players
      </p>
      {players.map((player) => {
        const isOnline = onlineUserIds.has(player.userId);
        const isHost = player.userId === hostId;
        const isYou = player.userId === currentUserId;

        return (
          <div
            key={player.id}
            className="flex items-center justify-between rounded-lg bg-foreground/5 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {/* Online indicator */}
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-foreground/20'}`}
              />
              {/* Seat number */}
              <span className="text-foreground/30 text-xs font-mono w-4">
                #{player.seatNumber}
              </span>
              {/* Name */}
              <span className="text-foreground text-sm font-medium">
                {player.displayName || 'Player'}
                {isYou && <span className="text-foreground/40 ml-1">(you)</span>}
              </span>
              {/* Host badge */}
              {isHost && (
                <span className="text-accent text-xs font-semibold bg-accent/10 px-1.5 py-0.5 rounded">
                  Host
                </span>
              )}
            </div>
            {/* Chips */}
            <span className="text-foreground/60 text-sm font-mono">
              ${player.chipsAtTable.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
