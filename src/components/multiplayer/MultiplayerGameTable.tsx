'use client';

import { useRef, useEffect } from 'react';
import { canSplit as canSplitCheck } from '@/engine/hand';
import { ClientGameState } from '@/lib/types/game';
import { RoomPlayer } from '@/lib/types/multiplayer';
import { DealerArea } from './DealerArea';
import { PlayerSeat } from './PlayerSeat';
import { BettingControls } from './BettingControls';
import { ActionControls } from './ActionControls';

interface MultiplayerGameTableProps {
  gameState: ClientGameState;
  players: RoomPlayer[];
  currentUserId: string;
  isHost: boolean;
  minBet: number;
  maxBet: number;
  placeBet: (amount: number) => Promise<{ error?: string }>;
  deal: () => Promise<{ error?: string }>;
  hit: () => Promise<{ error?: string }>;
  stand: () => Promise<{ error?: string }>;
  double: () => Promise<{ error?: string }>;
  split: () => Promise<{ error?: string }>;
  nextRound: () => Promise<{ error?: string }>;
}

export function MultiplayerGameTable({
  gameState,
  players,
  currentUserId,
  isHost,
  minBet,
  maxBet,
  placeBet,
  deal,
  hit,
  stand,
  double: doubleFn,
  split,
  nextRound,
}: MultiplayerGameTableProps) {
  const { phase, playerHands, dealerCards, activeSeat, holeCardRevealed } = gameState;
  const activeHandIndex = gameState.activeHandIndex ?? null;

  const currentPlayer = players.find((p) => p.userId === currentUserId);
  const chipsAtTable = currentPlayer?.chipsAtTable ?? 0;

  // Find active hand using activeHandIndex (split-aware) or fall back to activeSeat
  const activeHand = activeHandIndex !== null
    ? playerHands[activeHandIndex] ?? null
    : activeSeat !== null
      ? playerHands.find((h) => h.seatNumber === activeSeat) ?? null
      : null;

  const myHand = playerHands.find((h) => h.userId === currentUserId);
  const isMyTurn = phase === 'player_action' && activeHand?.userId === currentUserId;
  const myActiveHand = isMyTurn ? activeHand : null;
  const canDeal = playerHands.some((h) => h.bet > 0);

  // Can double: must be my turn, exactly 2 cards, enough chips
  const canDouble =
    isMyTurn &&
    !!myActiveHand &&
    myActiveHand.cards.length === 2 &&
    chipsAtTable >= myActiveHand.bet;

  // Can split: must be my turn, exactly 2 cards of same value, enough chips
  const canSplit =
    isMyTurn &&
    !!myActiveHand &&
    myActiveHand.cards.length === 2 &&
    canSplitCheck(myActiveHand.cards) &&
    chipsAtTable >= myActiveHand.bet;

  // Track previous bet for Same Bet / 2x Bet
  const previousBetRef = useRef(0);
  useEffect(() => {
    if (phase === 'round_over' && myHand && myHand.bet > 0) {
      previousBetRef.current = myHand.bet;
    }
  }, [phase, myHand]);

  const getDisplayName = (userId: string) => {
    const player = players.find((p) => p.userId === userId);
    return player?.displayName ?? 'Player';
  };

  const getChipsAtTable = (userId: string) => {
    const player = players.find((p) => p.userId === userId);
    return player?.chipsAtTable ?? 0;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Dealer area */}
      <div className="pt-4 pb-2">
        {(phase !== 'betting') && dealerCards.length > 0 ? (
          <DealerArea dealerCards={dealerCards} holeCardRevealed={holeCardRevealed} />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="text-foreground/50 text-xs font-medium uppercase tracking-wider">
              Dealer
            </div>
            <div className="min-h-[90px] md:min-h-28 flex items-center justify-center">
              <span className="text-foreground/20 text-sm">
                {phase === 'betting' ? 'Place your bets' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Player seats */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {phase === 'betting' ? (
            // In betting phase, show seats for all active players
            players
              .filter((p) => p.status !== 'left')
              .sort((a, b) => a.seatNumber - b.seatNumber)
              .map((player) => {
                const hand = playerHands.find((h) => h.userId === player.userId);
                return (
                  <PlayerSeat
                    key={player.userId}
                    hand={hand ?? {
                      seatNumber: player.seatNumber,
                      userId: player.userId,
                      bet: 0,
                      cards: [],
                      actions: [],
                      isDoubled: false,
                      isStood: false,
                      isSurrendered: false,
                      isSplit: false,
                      outcome: null,
                      payout: 0,
                    }}
                    isActive={false}
                    isCurrentUser={player.userId === currentUserId}
                    displayName={player.displayName ?? 'Player'}
                    chipsAtTable={player.chipsAtTable}
                  />
                );
              })
          ) : (
            // During play, show hands that have been dealt
            playerHands.map((hand, i) => (
              <PlayerSeat
                key={`${hand.seatNumber}-${hand.userId}-${i}`}
                hand={hand}
                isActive={
                  activeHandIndex !== null
                    ? activeHandIndex === i && phase === 'player_action'
                    : activeSeat === hand.seatNumber && phase === 'player_action'
                }
                isCurrentUser={hand.userId === currentUserId}
                displayName={getDisplayName(hand.userId)}
                chipsAtTable={getChipsAtTable(hand.userId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-4 border-t border-foreground/15">
        <div className="max-w-sm mx-auto">
          {phase === 'betting' && (
            <BettingControls
              minBet={minBet}
              maxBet={maxBet}
              chipsAtTable={chipsAtTable}
              currentBet={myHand?.bet ?? 0}
              onPlaceBet={placeBet}
              isHost={isHost}
              canDeal={canDeal}
              onDeal={deal}
              previousBet={previousBetRef.current}
            />
          )}

          {phase === 'player_action' && (
            <ActionControls
              isMyTurn={isMyTurn}
              canDouble={canDouble}
              canSplit={canSplit}
              onHit={hit}
              onStand={stand}
              onDouble={doubleFn}
              onSplit={split}
            />
          )}

          {(phase === 'dealer_play' || phase === 'resolution') && (
            <div className="text-center text-foreground/40 text-sm py-3 animate-pulse">
              {phase === 'dealer_play' ? 'Dealer playing...' : 'Resolving hands...'}
            </div>
          )}

          {phase === 'round_over' && isHost && (
            <button
              type="button"
              onClick={() => nextRound()}
              className="w-full h-14 rounded-xl bg-accent text-background font-bold text-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 focus-ring"
            >
              NEW ROUND
            </button>
          )}

          {phase === 'round_over' && !isHost && (
            <div className="text-center text-foreground/40 text-sm py-3">
              Waiting for host to start next round...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
