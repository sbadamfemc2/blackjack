'use client';

import { useState } from 'react';
import { Room } from '@/lib/types/multiplayer';

interface RoomHeaderProps {
  room: Room;
  playerCount: number;
}

export function RoomHeader({ room, playerCount }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center">
      <p className="text-foreground/40 text-xs uppercase tracking-wider mb-1">
        Room Code
      </p>
      <button
        type="button"
        onClick={copyCode}
        className="text-4xl font-mono font-bold text-accent tracking-[0.3em] hover:text-accent-hover transition-colors focus-ring rounded px-2"
        title="Click to copy"
      >
        {room.code}
      </button>
      <p className="text-foreground/40 text-xs mt-1">
        {copied ? 'Copied!' : 'Click to copy'}
      </p>
      <div className="flex items-center justify-center gap-4 mt-3 text-foreground/50 text-xs">
        <span>{playerCount}/{room.maxPlayers} players</span>
        <span>&#8226;</span>
        <span>${room.minBet}-${room.maxBet} bets</span>
      </div>
    </div>
  );
}
