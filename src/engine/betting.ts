import { HandOutcome, GAME_CONFIG } from './types';

/**
 * Validate a bet amount against the current chip stack.
 */
export function validateBet(
  amount: number,
  availableChips: number,
  existingBetsTotal: number = 0
): { valid: boolean; error?: string } {
  if (amount < GAME_CONFIG.MIN_BET) {
    return { valid: false, error: `Minimum bet is $${GAME_CONFIG.MIN_BET}` };
  }
  if (!Number.isInteger(amount)) {
    return { valid: false, error: 'Bet must be a whole number' };
  }
  if (amount > availableChips - existingBetsTotal) {
    return { valid: false, error: 'Insufficient chips' };
  }
  return { valid: true };
}

/**
 * Validate that all hands have bets placed before dealing.
 */
export function validateAllBets(
  bets: number[],
  handsConfiguration: number,
  availableChips: number
): { valid: boolean; error?: string } {
  if (bets.length !== handsConfiguration) {
    return { valid: false, error: `Expected ${handsConfiguration} bets, got ${bets.length}` };
  }

  let totalBets = 0;
  for (let i = 0; i < bets.length; i++) {
    if (bets[i] < GAME_CONFIG.MIN_BET) {
      return { valid: false, error: `Hand ${i + 1} must have at least a $${GAME_CONFIG.MIN_BET} bet` };
    }
    totalBets += bets[i];
  }

  if (totalBets > availableChips) {
    return { valid: false, error: 'Total bets exceed available chips' };
  }

  return { valid: true };
}

/**
 * Calculate payout for a hand based on outcome and bet.
 * Returns the net change (positive = profit, negative = loss, 0 = push).
 *
 * - Blackjack: +1.5x bet (3:2)
 * - Win: +1x bet
 * - Push: 0
 * - Loss: -1x bet
 * - Surrender: -0.5x bet
 * - Even money (special): +1x bet (treated as a win, called separately)
 */
export function calculatePayout(bet: number, outcome: HandOutcome): number {
  switch (outcome) {
    case 'blackjack':
      return bet * GAME_CONFIG.BLACKJACK_PAYOUT;
    case 'win':
      return bet;
    case 'push':
      return 0;
    case 'loss':
      return -bet;
    case 'surrender':
      return -(bet / 2);
  }
}

/**
 * Calculate even money payout (1:1 on blackjack when dealer shows Ace).
 */
export function calculateEvenMoney(bet: number): number {
  return bet; // 1:1 instead of 3:2
}

/**
 * Validate a buy-in amount.
 */
export function validateBuyIn(amount: number): { valid: boolean; error?: string } {
  if (amount < GAME_CONFIG.MIN_BUY_IN) {
    return { valid: false, error: `Minimum buy-in is $${GAME_CONFIG.MIN_BUY_IN}` };
  }
  if (amount > GAME_CONFIG.MAX_BUY_IN) {
    return { valid: false, error: `Maximum buy-in is $${GAME_CONFIG.MAX_BUY_IN}` };
  }
  if (amount % GAME_CONFIG.BUY_IN_INCREMENT !== 0) {
    return { valid: false, error: `Buy-in must be in $${GAME_CONFIG.BUY_IN_INCREMENT} increments` };
  }
  return { valid: true };
}

/**
 * Check if the player can afford to double down on a hand.
 */
export function canAffordDouble(
  originalBet: number,
  availableChips: number
): boolean {
  return availableChips >= originalBet;
}

/**
 * Check if the player can afford to split (need chips equal to the original bet).
 */
export function canAffordSplit(
  originalBet: number,
  availableChips: number
): boolean {
  return availableChips >= originalBet;
}
