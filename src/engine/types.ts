// ============================================================
// Card Types
// ============================================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

export const RANKS: readonly Rank[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10',
  'J', 'Q', 'K', 'A',
] as const;

// ============================================================
// Hand Types
// ============================================================

export interface HandTotal {
  hard: number;
  soft: number;
  best: number; // best valid total (soft if <= 21, else hard)
  isSoft: boolean; // true if best total uses an Ace as 11
  isBust: boolean;
  isBlackjack: boolean; // natural 21 with exactly 2 cards
}

export type HandOutcome = 'win' | 'loss' | 'push' | 'blackjack' | 'surrender';

export type PlayerAction = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  actions: PlayerAction[];
  isDoubled: boolean;
  isSplit: boolean; // was this hand created from a split?
  isSurrendered: boolean;
  isStood: boolean; // has the player stood on this hand?
  outcome: HandOutcome | null; // null until resolved
  payout: number; // net change (positive = win, negative = loss)
  splitOrigin: number; // which original bet position this hand came from
}

export interface DealerHand {
  cards: Card[];
  holeCardRevealed: boolean;
}

// ============================================================
// Game State Types
// ============================================================

export type GamePhase =
  | 'BETTING'
  | 'DEALING'
  | 'PLAYER_ACTION'
  | 'DEALER_PLAY'
  | 'RESOLUTION'
  | 'ROUND_OVER';

export interface GameState {
  phase: GamePhase;
  shoe: Card[];
  cutCardPosition: number; // index in shoe where cut card sits
  needsReshuffle: boolean;
  playerHands: PlayerHand[];
  dealerHand: DealerHand;
  activeHandIndex: number; // which player hand is currently being played
  chips: number;
  bets: number[]; // pending bets (during BETTING phase)
  handsConfiguration: 1 | 2 | 3 | 4 | 5 | 6;
  sessionId: string;
  handNumber: number;
  evenMoneyOffered: boolean; // true when player has BJ and dealer shows Ace
  evenMoneyHandIndex: number | null; // which hand has the even money offer
}

// ============================================================
// Game Action Types
// ============================================================

export type GameAction =
  | { type: 'PLACE_BET'; handIndex: number; amount: number }
  | { type: 'CLEAR_BET'; handIndex: number }
  | { type: 'CLEAR_ALL_BETS' }
  | { type: 'SAME_BET'; previousBets: number[] }
  | { type: 'DOUBLE_PREVIOUS_BET'; previousBets: number[] }
  | { type: 'DEAL' }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'DOUBLE_DOWN' }
  | { type: 'SPLIT' }
  | { type: 'SURRENDER' }
  | { type: 'ACCEPT_EVEN_MONEY' }
  | { type: 'DECLINE_EVEN_MONEY' }
  | { type: 'DEALER_PLAY' }
  | { type: 'RESOLVE' }
  | { type: 'NEW_ROUND' };

// ============================================================
// Chip Types
// ============================================================

export type ChipDenomination = 1 | 5 | 25 | 100 | 500 | 1000;

export const CHIP_DENOMINATIONS: readonly ChipDenomination[] = [1, 5, 25, 100, 500, 1000] as const;

export interface ChipColor {
  denomination: ChipDenomination;
  color: string;
  label: string;
}

export const CHIP_COLORS: readonly ChipColor[] = [
  { denomination: 1, color: '#FFFFFF', label: '$1' },
  { denomination: 5, color: '#FF0000', label: '$5' },
  { denomination: 25, color: '#00AA00', label: '$25' },
  { denomination: 100, color: '#000000', label: '$100' },
  { denomination: 500, color: '#800080', label: '$500' },
  { denomination: 1000, color: '#FF8C00', label: '$1K' },
] as const;

// ============================================================
// Session Types
// ============================================================

export interface SessionSummary {
  sessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  buyInAmount: number;
  endingChips: number;
  netWinLoss: number;
  handsPlayed: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
}

// ============================================================
// Stats Types
// ============================================================

export interface LifetimeStats {
  totalHands: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  netWinnings: number;
  biggestWin: number;
  biggestLoss: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  bestWinStreak: number;
  bestLoseStreak: number;
  totalSessions: number;
  averageSessionHands: number;
  blackjackFrequency: number;
  bustFrequency: number;
  doubleDownSuccessRate: number;
  splitSuccessRate: number;
  surrenderUsage: number;
  evenMoneyAcceptanceRate: number;
}

// ============================================================
// Configuration Constants
// ============================================================

export const GAME_CONFIG = {
  NUM_DECKS: 6,
  CARDS_PER_DECK: 52,
  TOTAL_CARDS: 6 * 52, // 312
  CUT_CARD_PENETRATION: 0.75,
  MIN_BET: 1,
  MIN_BUY_IN: 100,
  MAX_BUY_IN: 10000,
  BUY_IN_INCREMENT: 100,
  MAX_HANDS: 6,
  MAX_SPLITS: 4, // max total hands from splitting (original + 3 splits)
  BLACKJACK_PAYOUT: 1.5, // 3:2
} as const;
