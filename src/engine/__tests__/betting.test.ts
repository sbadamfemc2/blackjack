import {
  validateBet,
  validateAllBets,
  calculatePayout,
  calculateEvenMoney,
  validateBuyIn,
  canAffordDouble,
  canAffordSplit,
} from '../betting';
import { GAME_CONFIG } from '../types';

describe('validateBet', () => {
  it('accepts a valid bet', () => {
    expect(validateBet(100, 1000)).toEqual({ valid: true });
  });

  it('rejects bet below minimum', () => {
    const result = validateBet(0, 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Minimum bet');
  });

  it('rejects non-integer bet', () => {
    const result = validateBet(10.5, 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('whole number');
  });

  it('rejects bet exceeding available chips', () => {
    const result = validateBet(500, 300);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient');
  });

  it('accounts for existing bets when checking availability', () => {
    // 300 available, 200 already bet, trying to bet 150 -> only 100 left
    const result = validateBet(150, 300, 200);
    expect(result.valid).toBe(false);
  });

  it('allows betting all remaining chips', () => {
    expect(validateBet(100, 300, 200)).toEqual({ valid: true });
  });

  it('accepts minimum bet of $1', () => {
    expect(validateBet(1, 1000)).toEqual({ valid: true });
  });
});

describe('validateAllBets', () => {
  it('accepts valid bets for all hands', () => {
    expect(validateAllBets([100, 200], 2, 500)).toEqual({ valid: true });
  });

  it('rejects wrong number of bets', () => {
    const result = validateAllBets([100], 2, 500);
    expect(result.valid).toBe(false);
  });

  it('rejects if any hand has no bet', () => {
    const result = validateAllBets([100, 0], 2, 500);
    expect(result.valid).toBe(false);
  });

  it('rejects if total bets exceed chips', () => {
    const result = validateAllBets([300, 300], 2, 500);
    expect(result.valid).toBe(false);
  });

  it('accepts betting all chips across hands', () => {
    expect(validateAllBets([250, 250], 2, 500)).toEqual({ valid: true });
  });

  it('validates single hand', () => {
    expect(validateAllBets([100], 1, 1000)).toEqual({ valid: true });
  });

  it('validates 6 hands', () => {
    expect(validateAllBets([10, 10, 10, 10, 10, 10], 6, 100)).toEqual({ valid: true });
  });
});

describe('calculatePayout', () => {
  it('pays 3:2 for blackjack', () => {
    expect(calculatePayout(100, 'blackjack')).toBe(150);
  });

  it('pays 1:1 for regular win', () => {
    expect(calculatePayout(100, 'win')).toBe(100);
  });

  it('returns 0 for push', () => {
    expect(calculatePayout(100, 'push')).toBe(0);
  });

  it('returns negative bet for loss', () => {
    expect(calculatePayout(100, 'loss')).toBe(-100);
  });

  it('returns -half bet for surrender', () => {
    expect(calculatePayout(100, 'surrender')).toBe(-50);
  });

  it('handles odd bet amounts for blackjack (3:2)', () => {
    // $10 bet → $15 payout
    expect(calculatePayout(10, 'blackjack')).toBe(15);
  });

  it('handles $1 bet for blackjack', () => {
    expect(calculatePayout(1, 'blackjack')).toBe(1.5);
  });
});

describe('calculateEvenMoney', () => {
  it('pays 1:1 for even money', () => {
    expect(calculateEvenMoney(100)).toBe(100);
  });

  it('pays 1:1 for any amount', () => {
    expect(calculateEvenMoney(50)).toBe(50);
  });
});

describe('validateBuyIn', () => {
  it('accepts valid buy-in', () => {
    expect(validateBuyIn(1000)).toEqual({ valid: true });
  });

  it('accepts minimum buy-in', () => {
    expect(validateBuyIn(GAME_CONFIG.MIN_BUY_IN)).toEqual({ valid: true });
  });

  it('accepts maximum buy-in', () => {
    expect(validateBuyIn(GAME_CONFIG.MAX_BUY_IN)).toEqual({ valid: true });
  });

  it('rejects below minimum', () => {
    const result = validateBuyIn(50);
    expect(result.valid).toBe(false);
  });

  it('rejects above maximum', () => {
    const result = validateBuyIn(20000);
    expect(result.valid).toBe(false);
  });

  it('rejects non-increment amounts', () => {
    const result = validateBuyIn(150);
    expect(result.valid).toBe(false);
  });
});

describe('canAffordDouble', () => {
  it('returns true when chips >= bet', () => {
    expect(canAffordDouble(100, 500)).toBe(true);
  });

  it('returns true when chips exactly equal bet', () => {
    expect(canAffordDouble(100, 100)).toBe(true);
  });

  it('returns false when chips < bet', () => {
    expect(canAffordDouble(100, 50)).toBe(false);
  });
});

describe('canAffordSplit', () => {
  it('returns true when chips >= bet', () => {
    expect(canAffordSplit(100, 500)).toBe(true);
  });

  it('returns false when chips < bet', () => {
    expect(canAffordSplit(100, 50)).toBe(false);
  });
});
