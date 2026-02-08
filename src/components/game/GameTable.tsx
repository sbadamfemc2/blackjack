'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChipDenomination, SessionSummary } from '@/engine/types';
import { useGameContext } from './GameContext';
import { useAuth } from '@/hooks/useAuth';
import { TopBar } from '@/components/layout/TopBar';
import { DealerArea } from '@/components/layout/DealerArea';
import { PlayerArea } from '@/components/layout/PlayerArea';
import { BottomPanel } from '@/components/layout/BottomPanel';
import { EvenMoneyModal } from '@/components/modals/EvenMoneyModal';
import { SessionSummaryModal } from '@/components/modals/SessionSummaryModal';

export function GameTable() {
  const {
    state,
    dispatch,
    availableActions,
    previousBets,
    playerTotals,
    dealerTotal,
    endSession,
    endSessionWithSummary,
    saveSession,
    recordHand,
    buyInAmount,
  } = useGameContext();

  const { user } = useAuth();
  const router = useRouter();

  const [selectedDenom, setSelectedDenom] = useState<ChipDenomination>(25);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [outcomeVisible, setOutcomeVisible] = useState(false);
  const [cardSettling, setCardSettling] = useState(false);
  const prevHandCountRef = useRef(0);
  const prevCardCountsRef = useRef<number[]>([]);
  // Track when cards are newly dealt to trigger entry animations
  useEffect(() => {
    if (!state) return;
    const currentHandCount = state.playerHands.length;
    if (currentHandCount > 0 && prevHandCountRef.current === 0) {
      setAnimateCards(true);
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (currentHandCount === 0) {
      setAnimateCards(false);
    }
    prevHandCountRef.current = currentHandCount;
  }, [state?.playerHands.length]);

  // Block actions while a gameplay card settles (hit/double/split)
  useEffect(() => {
    if (!state || state.phase !== 'PLAYER_ACTION') {
      prevCardCountsRef.current = state?.playerHands.map(h => h.cards.length) ?? [];
      return;
    }

    const currentCounts = state.playerHands.map(h => h.cards.length);
    const prevCounts = prevCardCountsRef.current;
    const cardAdded = currentCounts.some((count, i) => count > (prevCounts[i] ?? 0));
    prevCardCountsRef.current = currentCounts;

    if (cardAdded) {
      setCardSettling(true);
      const timer = setTimeout(() => setCardSettling(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [state?.phase, state?.playerHands]);

  // Delay outcome labels so the player can see the final card before the result
  useEffect(() => {
    if (!state) return;

    if (state.phase === 'ROUND_OVER' && !isAnimating) {
      // Wait for final total to update (1.2s) + 1.0s processing pause
      const timer = setTimeout(() => setOutcomeVisible(true), 2200);
      return () => clearTimeout(timer);
    }

    if (state.phase !== 'ROUND_OVER') {
      setOutcomeVisible(false);
    }
  }, [state?.phase, isAnimating]);

  // Auto-progression: handle DEALER_PLAY one step at a time
  useEffect(() => {
    if (!state || state.phase !== 'DEALER_PLAY') return;

    // First entry: wait for player's last card animation + total to settle
    // Subsequent dispatches: regular pacing between dealer cards
    const isFirstEntry = !state.dealerHand.holeCardRevealed;
    const delayMs = isFirstEntry ? 2000 : 800;

    const timer = setTimeout(() => {
      dispatch({ type: 'DEALER_PLAY' });
    }, delayMs);
    return () => clearTimeout(timer);
  }, [state?.phase, state?.dealerHand.cards.length, state?.dealerHand.holeCardRevealed, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!state || state.phase !== 'PLAYER_ACTION' || isAnimating || cardSettling) return;

    const keyMap: Record<string, string> = {
      h: 'HIT',
      s: 'STAND',
      d: 'DOUBLE_DOWN',
      p: 'SPLIT',
      r: 'SURRENDER',
    };

    const actionMap: Record<string, string> = {
      HIT: 'hit',
      STAND: 'stand',
      DOUBLE_DOWN: 'double',
      SPLIT: 'split',
      SURRENDER: 'surrender',
    };

    function handleKeyDown(e: KeyboardEvent) {
      const actionType = keyMap[e.key.toLowerCase()];
      if (!actionType) return;
      const playerAction = actionMap[actionType];
      if (playerAction && availableActions.includes(playerAction as typeof availableActions[number])) {
        e.preventDefault();
        dispatch({ type: actionType } as Parameters<typeof dispatch>[0]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state?.phase, availableActions, isAnimating, cardSettling, dispatch]);

  // Auto-save session and record hands at ROUND_OVER
  const savedHandRef = useRef(0);
  useEffect(() => {
    if (!state || state.phase !== 'ROUND_OVER') return;
    if (savedHandRef.current === state.handNumber) return;
    savedHandRef.current = state.handNumber;

    // Record each hand's outcome
    state.playerHands.forEach((_, i) => {
      recordHand(i);
    });

    // Save or end session
    if (state.chips > 0) {
      saveSession();
    } else {
      // Busted — show summary
      endSessionWithSummary().then((summary) => {
        if (summary) setSessionSummary(summary);
      });
    }
  }, [state, saveSession, recordHand, endSessionWithSummary]);

  // Voluntary end session
  const handleEndSession = useCallback(async () => {
    const summary = await endSessionWithSummary();
    if (summary) setSessionSummary(summary);
  }, [endSessionWithSummary]);

  // Dismiss summary modal
  const handleDismissSummary = useCallback(() => {
    setSessionSummary(null);
    endSession();
  }, [endSession]);

  const handleBetCircleClick = useCallback(
    (handIndex: number) => {
      if (!state || state.phase !== 'BETTING') return;
      const currentBet = state.bets[handIndex] || 0;
      dispatch({
        type: 'PLACE_BET',
        handIndex,
        amount: currentBet + selectedDenom,
      });
    },
    [state, selectedDenom, dispatch]
  );

  if (!state && !sessionSummary) return null;

  const showEvenMoney = state?.evenMoneyOffered;
  const canEndSession = state && (state.phase === 'BETTING' || state.phase === 'ROUND_OVER') && !!user;

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-felt-dark via-felt to-felt-dark">
      {state && (
        <>
          <TopBar
            chips={state.chips}
            handNumber={state.handNumber}
            buyInAmount={buyInAmount}
            onEndSession={canEndSession ? handleEndSession : undefined}
          />

          {/* Main table area */}
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
            <div className="shrink-0">
              <DealerArea
                hand={state.dealerHand}
                total={dealerTotal}
                animateEntry={animateCards}
              />
            </div>

            <div className="shrink-0 border-t border-foreground/10 mx-8" />

            <div className="flex-1 flex items-center justify-center py-2">
              <PlayerArea
                phase={state.phase}
                playerHands={state.playerHands}
                playerTotals={playerTotals}
                activeHandIndex={state.activeHandIndex}
                bets={state.bets}
                handsConfiguration={state.handsConfiguration}
                onBetCircleClick={handleBetCircleClick}
                animateEntry={animateCards}
                outcomeVisible={outcomeVisible}
              />
            </div>
          </div>

          {/* Bottom controls */}
          <BottomPanel
            phase={state.phase}
            chips={state.chips}
            bets={state.bets}
            availableActions={availableActions}
            previousBets={previousBets}
            dispatch={dispatch}
            isAnimating={isAnimating || cardSettling}
            selectedDenom={selectedDenom}
            onSelectDenom={setSelectedDenom}
          />

          {/* Even money modal */}
          {showEvenMoney && (
            <EvenMoneyModal
              bet={state.playerHands[state.evenMoneyHandIndex ?? 0]?.bet ?? 0}
              onAccept={() => dispatch({ type: 'ACCEPT_EVEN_MONEY' })}
              onDecline={() => dispatch({ type: 'DECLINE_EVEN_MONEY' })}
            />
          )}
        </>
      )}

      {/* Session summary modal */}
      {sessionSummary && (
        <SessionSummaryModal
          summary={sessionSummary}
          isBusted={sessionSummary.endingChips <= 0}
          onNewSession={handleDismissSummary}
          onViewStats={user ? () => { handleDismissSummary(); router.push('/stats'); } : undefined}
        />
      )}
    </div>
  );
}
