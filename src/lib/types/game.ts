import { Card, PlayerAction, HandOutcome } from '@/engine/types';

// ============================================================
// Multiplayer Game State Types
// ============================================================

export type MultiplayerPhase =
  | 'betting'
  | 'dealing'
  | 'player_action'
  | 'dealer_play'
  | 'resolution'
  | 'round_over';

export interface PlayerHandState {
  seatNumber: number;
  userId: string;
  bet: number;
  cards: Card[];
  actions: PlayerAction[];
  isDoubled: boolean;
  isStood: boolean;
  isSurrendered: boolean;
  isSplit: boolean;
  outcome: HandOutcome | null;
  payout: number;
}

export interface MultiplayerGameState {
  id: string;
  roomId: string;
  roundNumber: number;
  phase: MultiplayerPhase;
  activeSeat: number | null;
  activeHandIndex: number | null;
  shoe: Card[];
  cardsDealt: number;
  cutCardPosition: number;
  needsReshuffle: boolean;
  playerHands: PlayerHandState[];
  dealerCards: Card[];
  holeCardRevealed: boolean;
  updatedAt: string;
}

/** Client-safe version of game state (shoe stripped to hide card order) */
export type ClientGameState = Omit<MultiplayerGameState, 'shoe'>;

// ============================================================
// DB Row Types & Mappers
// ============================================================

export interface GameRoundRow {
  id: string;
  room_id: string;
  round_number: number;
  phase: string;
  active_seat: number | null;
  active_hand_index: number | null;
  shoe: unknown;
  cards_dealt: number;
  cut_card_position: number;
  needs_reshuffle: boolean;
  player_hands: unknown;
  dealer_cards: unknown;
  hole_card_revealed: boolean;
  created_at: string;
  updated_at: string;
}

export function toMultiplayerGameState(row: GameRoundRow): MultiplayerGameState {
  return {
    id: row.id,
    roomId: row.room_id,
    roundNumber: row.round_number,
    phase: row.phase as MultiplayerPhase,
    activeSeat: row.active_seat,
    activeHandIndex: row.active_hand_index ?? null,
    shoe: row.shoe as Card[],
    cardsDealt: row.cards_dealt,
    cutCardPosition: row.cut_card_position,
    needsReshuffle: row.needs_reshuffle,
    playerHands: (row.player_hands as PlayerHandState[]) ?? [],
    dealerCards: (row.dealer_cards as Card[]) ?? [],
    holeCardRevealed: row.hole_card_revealed,
    updatedAt: row.updated_at,
  };
}

/** Strip shoe and hide dealer hole card for client consumption */
export function toClientGameState(state: MultiplayerGameState): ClientGameState {
  const { shoe: _shoe, ...rest } = state;

  // Hide dealer hole card if not revealed
  const dealerCards = rest.dealerCards.map((card, i) =>
    i === 1 && !rest.holeCardRevealed ? null : card
  ) as (Card | null)[] as Card[];

  return { ...rest, dealerCards };
}
