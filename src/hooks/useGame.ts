'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  GameState,
  GameAction,
  PlayerAction,
  HandTotal,
  HandOutcome,
  SessionSummary,
  Card,
} from '@/engine/types';
import { DeckManager } from '@/engine/deck';
import { evaluateHand } from '@/engine/hand';
import {
  createInitialGameState,
  gameReducer,
  getAvailableActions,
} from '@/engine/game';
import { createClient } from '@/lib/supabase/client';

export interface ActiveSessionData {
  id: string;
  buyInAmount: number;
  currentChips: number;
  handNumber: number;
  handsConfiguration: 1 | 2 | 3 | 4 | 5 | 6;
  shoe: Card[];
  cardsDealt: number;
}

export interface UseGameReturn {
  state: GameState | null;
  dispatch: (action: GameAction) => void;
  availableActions: PlayerAction[];
  previousBets: number[];
  startSession: (chips: number, handsConfig: 1 | 2 | 3 | 4 | 5 | 6) => void;
  resumeSession: (session: ActiveSessionData) => void;
  endSession: () => void;
  endSessionWithSummary: () => Promise<SessionSummary | null>;
  saveSession: () => Promise<void>;
  recordHand: (handIndex: number) => Promise<void>;
  completeSession: () => Promise<void>;
  loadActiveSession: () => Promise<ActiveSessionData | null>;
  playerTotals: HandTotal[];
  dealerTotal: HandTotal | null;
  isSessionActive: boolean;
  buyInAmount: number;
}

function computeSessionSummary(
  sessionId: string,
  buyInAmount: number,
  endingChips: number,
  handsPlayed: number,
  startedAt: Date,
  handResults: Array<{ outcome: HandOutcome; payout: number }>
): SessionSummary {
  const wins = handResults.filter(
    (h) => h.outcome === 'win' || h.outcome === 'blackjack'
  ).length;
  const totalHands = handResults.length;
  const winRate = totalHands > 0 ? wins / totalHands : 0;

  const payouts = handResults.map((h) => h.payout);
  const biggestWin = payouts.length > 0 ? Math.max(0, ...payouts) : 0;
  const biggestLoss = payouts.length > 0 ? Math.min(0, ...payouts) : 0;

  return {
    sessionId,
    startedAt,
    endedAt: new Date(),
    buyInAmount,
    endingChips,
    netWinLoss: endingChips - buyInAmount,
    handsPlayed,
    winRate,
    biggestWin,
    biggestLoss,
  };
}

export function useGame(userId: string | null): UseGameReturn {
  const [state, setState] = useState<GameState | null>(null);
  const deckRef = useRef<DeckManager | null>(null);
  const previousBetsRef = useRef<number[]>([]);
  const buyInAmountRef = useRef(0);
  const sessionStartedAtRef = useRef<Date>(new Date());
  const handResultsRef = useRef<Array<{ outcome: HandOutcome; payout: number }>>([]);

  const startSession = useCallback(
    (chips: number, handsConfig: 1 | 2 | 3 | 4 | 5 | 6) => {
      const deck = new DeckManager(6);
      deckRef.current = deck;
      const sessionId = crypto.randomUUID();
      const initialState = createInitialGameState(chips, handsConfig, sessionId);
      setState(initialState);
      previousBetsRef.current = [];
      buyInAmountRef.current = chips;
      sessionStartedAtRef.current = new Date();
      handResultsRef.current = [];

      // Create session in database if authenticated
      if (userId) {
        const supabase = createClient();
        supabase
          .from('game_sessions')
          .insert({
            id: sessionId,
            user_id: userId,
            buy_in_amount: chips,
            hands_configuration: handsConfig,
            current_chips: chips,
            hand_number: 1,
            shoe: deck.getShoe(),
            cards_dealt: deck.getCardsDealt(),
          })
          .then(); // fire-and-forget
      }
    },
    [userId]
  );

  const resumeSession = useCallback(
    (session: ActiveSessionData) => {
      const deck = new DeckManager(6);
      deck.restoreState(session.shoe, session.cardsDealt);
      deckRef.current = deck;
      const initialState = createInitialGameState(
        session.currentChips,
        session.handsConfiguration,
        session.id,
        session.shoe,
        session.cardsDealt
      );
      setState({ ...initialState, handNumber: session.handNumber });
      previousBetsRef.current = [];
      buyInAmountRef.current = session.buyInAmount;
      sessionStartedAtRef.current = new Date();
      handResultsRef.current = [];
    },
    []
  );

  const endSession = useCallback(() => {
    setState(null);
    deckRef.current = null;
    previousBetsRef.current = [];
    handResultsRef.current = [];
  }, []);

  const dispatch = useCallback(
    (action: GameAction) => {
      setState((prev) => {
        if (!prev || !deckRef.current) return prev;

        // Save bets when transitioning from BETTING to dealing
        if (action.type === 'DEAL' && prev.phase === 'BETTING') {
          previousBetsRef.current = [...prev.bets];
        }

        const nextState = gameReducer(prev, action, deckRef.current);
        return nextState;
      });
    },
    []
  );

  const saveSession = useCallback(async () => {
    if (!userId || !state || !deckRef.current) return;

    const supabase = createClient();
    await supabase
      .from('game_sessions')
      .update({
        current_chips: state.chips,
        hand_number: state.handNumber,
        shoe: deckRef.current.getShoe(),
        cards_dealt: deckRef.current.getCardsDealt(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.sessionId);
  }, [userId, state]);

  const recordHand = useCallback(async (handIndex: number) => {
    if (!state) return;
    const hand = state.playerHands[handIndex];
    if (!hand || !hand.outcome) return;

    // Accumulate for session summary
    handResultsRef.current.push({
      outcome: hand.outcome,
      payout: hand.payout,
    });

    // Save to database if authenticated
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from('played_hands')
      .insert({
        session_id: state.sessionId,
        hand_number: state.handNumber,
        bet_amount: hand.bet,
        outcome: hand.outcome,
        payout: hand.payout,
      });
  }, [userId, state]);

  const completeSession = useCallback(async () => {
    if (!userId || !state) return;

    const supabase = createClient();
    await supabase
      .from('game_sessions')
      .update({
        status: 'completed',
        current_chips: state.chips,
        hand_number: state.handNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.sessionId);
  }, [userId, state]);

  const endSessionWithSummary = useCallback(async (): Promise<SessionSummary | null> => {
    if (!state) return null;

    const summary = computeSessionSummary(
      state.sessionId,
      buyInAmountRef.current,
      state.chips,
      state.handNumber - 1, // handNumber is 1-indexed and increments before play
      sessionStartedAtRef.current,
      handResultsRef.current
    );

    // Mark session as completed in DB
    if (userId) {
      await completeSession();
    }

    return summary;
  }, [state, userId, completeSession]);

  const loadActiveSession = useCallback(async (): Promise<ActiveSessionData | null> => {
    if (!userId) return null;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      buyInAmount: data.buy_in_amount,
      currentChips: data.current_chips,
      handNumber: data.hand_number,
      handsConfiguration: data.hands_configuration as 1 | 2 | 3 | 4 | 5 | 6,
      shoe: data.shoe as Card[],
      cardsDealt: data.cards_dealt,
    };
  }, [userId]);

  const availableActions = useMemo(() => {
    if (!state) return [];
    return getAvailableActions(state);
  }, [state]);

  const playerTotals = useMemo(() => {
    if (!state) return [];
    return state.playerHands.map((hand) =>
      evaluateHand(hand.cards, hand.isSplit)
    );
  }, [state]);

  const dealerTotal = useMemo(() => {
    if (!state || state.dealerHand.cards.length === 0) return null;
    return evaluateHand(state.dealerHand.cards);
  }, [state]);

  return {
    state,
    dispatch,
    availableActions,
    previousBets: previousBetsRef.current,
    startSession,
    resumeSession,
    endSession,
    endSessionWithSummary,
    saveSession,
    recordHand,
    completeSession,
    loadActiveSession,
    playerTotals,
    dealerTotal,
    isSessionActive: state !== null,
    buyInAmount: buyInAmountRef.current,
  };
}
