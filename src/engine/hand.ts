import { Card, Rank, HandTotal, HandOutcome } from './types';

/**
 * Get the numeric value(s) of a card rank.
 * Number cards = face value, face cards = 10, Ace = 11 (soft) or 1 (hard).
 */
export function getCardValue(rank: Rank): number {
  switch (rank) {
    case 'A': return 11;
    case 'K':
    case 'Q':
    case 'J': return 10;
    default: return parseInt(rank, 10);
  }
}

/**
 * Evaluate a hand of cards and return the total information.
 */
export function evaluateHand(cards: Card[], isFromSplit: boolean = false): HandTotal {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const value = getCardValue(card.rank);
    total += value;
    if (card.rank === 'A') {
      aces++;
    }
  }

  // Convert aces from 11 to 1 as needed to avoid busting
  const softTotal = total;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  const hard = total;
  const isSoft = aces > 0; // at least one Ace still counted as 11
  const isBust = hard > 21;

  // Blackjack: exactly 2 cards totaling 21, not from a split
  const isBlackjack = cards.length === 2 && hard === 21 && !isFromSplit;

  return {
    hard,
    soft: softTotal,
    best: hard, // hard is already the best value after ace adjustment
    isSoft,
    isBust,
    isBlackjack,
  };
}

/**
 * Check if a hand can be split (two cards of the same rank value).
 * Per PRD: "same rank (e.g., 8-8, K-Q both count as 10)"
 */
export function canSplit(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  return getCardValue(cards[0].rank) === getCardValue(cards[1].rank);
}

/**
 * Check if the dealer's up card is an Ace (relevant for even money / BJ check).
 */
export function isDealerShowingAce(dealerCards: Card[]): boolean {
  return dealerCards.length > 0 && dealerCards[0].rank === 'A';
}

/**
 * Check if the dealer's up card is a 10-value (relevant for BJ check).
 */
export function isDealerShowingTen(dealerCards: Card[]): boolean {
  if (dealerCards.length === 0) return false;
  return getCardValue(dealerCards[0].rank) === 10;
}

/**
 * Determine the outcome of a player hand vs the dealer hand.
 */
export function determineOutcome(
  playerTotal: HandTotal,
  dealerTotal: HandTotal,
  isSurrendered: boolean
): HandOutcome {
  if (isSurrendered) return 'surrender';
  if (playerTotal.isBust) return 'loss';
  if (playerTotal.isBlackjack && dealerTotal.isBlackjack) return 'push';
  if (playerTotal.isBlackjack) return 'blackjack';
  if (dealerTotal.isBust) return 'win';
  if (playerTotal.best > dealerTotal.best) return 'win';
  if (playerTotal.best === dealerTotal.best) return 'push';
  return 'loss';
}

/**
 * Should the dealer hit? Dealer hits on soft 17 and below, stands on hard 17+.
 */
export function shouldDealerHit(cards: Card[]): boolean {
  const total = evaluateHand(cards);
  if (total.isBust) return false;
  if (total.best < 17) return true;
  // Hit on soft 17
  if (total.best === 17 && total.isSoft) return true;
  return false;
}
