'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GameProvider, useGameContext } from '@/components/game/GameContext';
import { SessionSetup } from '@/components/game/SessionSetup';
import { GameTable } from '@/components/game/GameTable';
import { ActiveSessionData } from '@/hooks/useGame';

function GameContent() {
  const { isSessionActive, startSession, resumeSession, loadActiveSession } = useGameContext();
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    loadActiveSession().then((session) => {
      setActiveSession(session);
      setLoadingSession(false);
    });
  }, [loadActiveSession]);

  if (loadingSession) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <span className="text-foreground/40 text-sm">Loading...</span>
      </div>
    );
  }

  if (!isSessionActive) {
    return (
      <SessionSetup
        onStart={startSession}
        activeSession={activeSession}
        onResume={(session) => {
          resumeSession(session);
          setActiveSession(null);
        }}
      />
    );
  }

  return <GameTable />;
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <span className="text-foreground/40 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <GameProvider userId={user?.id ?? null}>
      <GameContent />
    </GameProvider>
  );
}
