'use client';

import { createContext, useContext } from 'react';
import { UseGameReturn, useGame } from '@/hooks/useGame';

interface GameProviderProps {
  userId: string | null;
  children: React.ReactNode;
}

const GameContext = createContext<UseGameReturn | null>(null);

export function GameProvider({ userId, children }: GameProviderProps) {
  const game = useGame(userId);
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}

export function useGameContext(): UseGameReturn {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
