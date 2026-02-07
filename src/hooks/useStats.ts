'use client';

import { useState, useEffect, useCallback } from 'react';
import { LifetimeStats, SessionSummary } from '@/engine/types';
import { createClient } from '@/lib/supabase/client';

interface DbSession {
  id: string;
  buy_in_amount: number;
  current_chips: number;
  hand_number: number;
  created_at: string;
  updated_at: string;
}

interface DbHand {
  session_id: string;
  hand_number: number;
  bet_amount: number;
  outcome: string;
  payout: number;
  created_at: string;
}

export interface UseStatsReturn {
  lifetimeStats: LifetimeStats | null;
  sessionHistory: SessionSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
}

function computeLifetimeStats(
  sessions: DbSession[],
  hands: DbHand[]
): { lifetimeStats: LifetimeStats; sessionHistory: SessionSummary[] } {
  // Session history
  const handsBySession = new Map<string, DbHand[]>();
  for (const hand of hands) {
    const arr = handsBySession.get(hand.session_id) || [];
    arr.push(hand);
    handsBySession.set(hand.session_id, arr);
  }

  const sessionHistory: SessionSummary[] = sessions.map((s) => {
    const sessionHands = handsBySession.get(s.id) || [];
    const wins = sessionHands.filter(
      (h) => h.outcome === 'win' || h.outcome === 'blackjack'
    ).length;
    const total = sessionHands.length;
    const payouts = sessionHands.map((h) => h.payout);

    return {
      sessionId: s.id,
      startedAt: new Date(s.created_at),
      endedAt: new Date(s.updated_at),
      buyInAmount: s.buy_in_amount,
      endingChips: s.current_chips,
      netWinLoss: s.current_chips - s.buy_in_amount,
      handsPlayed: s.hand_number - 1,
      winRate: total > 0 ? wins / total : 0,
      biggestWin: payouts.length > 0 ? Math.max(0, ...payouts) : 0,
      biggestLoss: payouts.length > 0 ? Math.min(0, ...payouts) : 0,
    };
  });

  // Lifetime stats
  const totalHands = hands.length;
  const wins = hands.filter((h) => h.outcome === 'win' || h.outcome === 'blackjack').length;
  const losses = hands.filter((h) => h.outcome === 'loss').length;
  const pushes = hands.filter((h) => h.outcome === 'push').length;
  const blackjacks = hands.filter((h) => h.outcome === 'blackjack').length;
  const surrenders = hands.filter((h) => h.outcome === 'surrender').length;
  const allPayouts = hands.map((h) => h.payout);
  const netWinnings = allPayouts.reduce((sum, p) => sum + p, 0);

  // Streaks — sort by session created_at then hand_number
  const sessionOrder = new Map(sessions.map((s, i) => [s.id, i]));
  const sortedHands = [...hands].sort((a, b) => {
    const sessionDiff = (sessionOrder.get(a.session_id) ?? 0) - (sessionOrder.get(b.session_id) ?? 0);
    if (sessionDiff !== 0) return sessionDiff;
    return a.hand_number - b.hand_number;
  });

  let currentStreak: { type: 'win' | 'loss' | 'none'; count: number } = { type: 'none', count: 0 };
  let bestWinStreak = 0;
  let bestLoseStreak = 0;
  let tempWinStreak = 0;
  let tempLoseStreak = 0;

  for (const hand of sortedHands) {
    const isWin = hand.outcome === 'win' || hand.outcome === 'blackjack';
    const isLoss = hand.outcome === 'loss';

    if (isWin) {
      tempWinStreak++;
      tempLoseStreak = 0;
      currentStreak = { type: 'win', count: tempWinStreak };
      bestWinStreak = Math.max(bestWinStreak, tempWinStreak);
    } else if (isLoss) {
      tempLoseStreak++;
      tempWinStreak = 0;
      currentStreak = { type: 'loss', count: tempLoseStreak };
      bestLoseStreak = Math.max(bestLoseStreak, tempLoseStreak);
    } else {
      // Push/surrender break streaks
      tempWinStreak = 0;
      tempLoseStreak = 0;
      currentStreak = { type: 'none', count: 0 };
    }
  }

  const lifetimeStats: LifetimeStats = {
    totalHands,
    wins,
    losses,
    pushes,
    winRate: totalHands > 0 ? wins / totalHands : 0,
    netWinnings,
    biggestWin: allPayouts.length > 0 ? Math.max(0, ...allPayouts) : 0,
    biggestLoss: allPayouts.length > 0 ? Math.min(0, ...allPayouts) : 0,
    currentStreak,
    bestWinStreak,
    bestLoseStreak,
    totalSessions: sessions.length,
    averageSessionHands: sessions.length > 0 ? totalHands / sessions.length : 0,
    blackjackFrequency: totalHands > 0 ? blackjacks / totalHands : 0,
    bustFrequency: 0, // Can't distinguish bust from dealer-beat with current schema
    doubleDownSuccessRate: 0, // No action tracking
    splitSuccessRate: 0, // No action tracking
    surrenderUsage: totalHands > 0 ? surrenders / totalHands : 0,
    evenMoneyAcceptanceRate: 0, // No action tracking
  };

  return { lifetimeStats, sessionHistory };
}

export function useStats(userId: string | null): UseStatsReturn {
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Fetch completed sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('game_sessions')
      .select('id, buy_in_amount, current_chips, hand_number, created_at, updated_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (sessionsError || !sessions || sessions.length === 0) {
      setLifetimeStats(null);
      setSessionHistory([]);
      setLoading(false);
      return;
    }

    // Fetch all hands for those sessions
    const sessionIds = sessions.map((s) => s.id);
    const { data: hands } = await supabase
      .from('played_hands')
      .select('session_id, hand_number, bet_amount, outcome, payout, created_at')
      .in('session_id', sessionIds)
      .order('hand_number', { ascending: true });

    const result = computeLifetimeStats(sessions, hands || []);
    setLifetimeStats(result.lifetimeStats);
    setSessionHistory(result.sessionHistory);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lifetimeStats, sessionHistory, loading, refresh };
}
