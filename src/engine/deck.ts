import { Card, SUITS, RANKS, GAME_CONFIG } from './types';

/**
 * Create a single standard 52-card deck.
 */
function createSingleDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Create a shoe of multiple decks.
 */
export function createShoe(numDecks: number = GAME_CONFIG.NUM_DECKS): Card[] {
  const shoe: Card[] = [];
  for (let i = 0; i < numDecks; i++) {
    shoe.push(...createSingleDeck());
  }
  return shoe;
}

/**
 * Fisher-Yates shuffle using cryptographically secure random numbers.
 * Shuffles in place and returns the array.
 */
export function shuffle(cards: Card[]): Card[] {
  const n = cards.length;
  for (let i = n - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * Generate a cryptographically secure random integer in [0, max).
 * Uses rejection sampling to avoid modulo bias.
 */
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  const maxUint32 = 0xFFFFFFFF;
  const limit = maxUint32 - (maxUint32 % max);

  // Rejection sampling to eliminate modulo bias
  do {
    crypto.getRandomValues(array);
  } while (array[0] >= limit);

  return array[0] % max;
}

/**
 * Calculate the cut card position for a given shoe size.
 * The cut card is placed at the given penetration percentage.
 */
export function getCutCardPosition(
  shoeSize: number,
  penetration: number = GAME_CONFIG.CUT_CARD_PENETRATION
): number {
  return Math.floor(shoeSize * penetration);
}

/**
 * Manages a multi-deck shoe with shuffling, dealing, and reshuffle detection.
 */
export class DeckManager {
  private shoe: Card[];
  private cutCardPosition: number;
  private cardsDealt: number;

  constructor(numDecks: number = GAME_CONFIG.NUM_DECKS) {
    this.shoe = shuffle(createShoe(numDecks));
    this.cutCardPosition = getCutCardPosition(this.shoe.length);
    this.cardsDealt = 0;
  }

  /**
   * Deal the top card from the shoe.
   * Throws if shoe is empty (should never happen with proper reshuffle checks).
   */
  deal(): Card {
    if (this.shoe.length === 0) {
      throw new Error('Shoe is empty. Reshuffle required.');
    }
    const card = this.shoe.pop()!;
    this.cardsDealt++;
    return card;
  }

  /**
   * Check if the cut card has been reached (reshuffle needed after current round).
   */
  needsReshuffle(): boolean {
    return this.cardsDealt >= this.cutCardPosition;
  }

  /**
   * Reshuffle: create a fresh shoe and reset counters.
   */
  reshuffle(numDecks: number = GAME_CONFIG.NUM_DECKS): void {
    this.shoe = shuffle(createShoe(numDecks));
    this.cutCardPosition = getCutCardPosition(this.shoe.length);
    this.cardsDealt = 0;
  }

  /**
   * Get remaining cards in shoe (for state persistence).
   */
  getShoe(): Card[] {
    return [...this.shoe];
  }

  /**
   * Get number of cards dealt since last shuffle.
   */
  getCardsDealt(): number {
    return this.cardsDealt;
  }

  /**
   * Get the cut card position.
   */
  getCutCardPosition(): number {
    return this.cutCardPosition;
  }

  /**
   * Get remaining card count.
   */
  getRemainingCards(): number {
    return this.shoe.length;
  }

  /**
   * Restore shoe from saved state (for session persistence).
   */
  restoreState(shoe: Card[], cardsDealt: number): void {
    this.shoe = [...shoe];
    this.cardsDealt = cardsDealt;
    this.cutCardPosition = getCutCardPosition(
      shoe.length + cardsDealt
    );
  }
}
