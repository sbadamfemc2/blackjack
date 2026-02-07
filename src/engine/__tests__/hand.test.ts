import {
  evaluateHand,
  getCardValue,
  canSplit,
  isDealerShowingAce,
  isDealerShowingTen,
  shouldDealerHit,
  determineOutcome,
} from '../hand';
import { Card } from '../types';

// Helper to create cards quickly
function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit };
}

describe('getCardValue', () => {
  it('returns face value for number cards', () => {
    expect(getCardValue('2')).toBe(2);
    expect(getCardValue('5')).toBe(5);
    expect(getCardValue('9')).toBe(9);
    expect(getCardValue('10')).toBe(10);
  });

  it('returns 10 for face cards', () => {
    expect(getCardValue('J')).toBe(10);
    expect(getCardValue('Q')).toBe(10);
    expect(getCardValue('K')).toBe(10);
  });

  it('returns 11 for Ace', () => {
    expect(getCardValue('A')).toBe(11);
  });
});

describe('evaluateHand', () => {
  it('evaluates simple number hands', () => {
    const result = evaluateHand([card('5'), card('7')]);
    expect(result.best).toBe(12);
    expect(result.isSoft).toBe(false);
    expect(result.isBust).toBe(false);
    expect(result.isBlackjack).toBe(false);
  });

  it('evaluates a hand with face cards', () => {
    const result = evaluateHand([card('K'), card('Q')]);
    expect(result.best).toBe(20);
    expect(result.isSoft).toBe(false);
  });

  it('detects blackjack (Ace + 10)', () => {
    const result = evaluateHand([card('A'), card('10')]);
    expect(result.best).toBe(21);
    expect(result.isBlackjack).toBe(true);
    expect(result.isSoft).toBe(true);
  });

  it('detects blackjack (Ace + King)', () => {
    const result = evaluateHand([card('A'), card('K')]);
    expect(result.best).toBe(21);
    expect(result.isBlackjack).toBe(true);
  });

  it('detects blackjack (King + Ace)', () => {
    const result = evaluateHand([card('K'), card('A')]);
    expect(result.best).toBe(21);
    expect(result.isBlackjack).toBe(true);
  });

  it('does NOT count 3-card 21 as blackjack', () => {
    const result = evaluateHand([card('7'), card('7'), card('7')]);
    expect(result.best).toBe(21);
    expect(result.isBlackjack).toBe(false);
  });

  it('does NOT count 21 from split as blackjack', () => {
    const result = evaluateHand([card('A'), card('K')], true);
    expect(result.best).toBe(21);
    expect(result.isBlackjack).toBe(false);
  });

  it('evaluates soft hands correctly (Ace as 11)', () => {
    const result = evaluateHand([card('A'), card('6')]);
    expect(result.best).toBe(17);
    expect(result.isSoft).toBe(true);
  });

  it('converts Ace from 11 to 1 to avoid bust', () => {
    const result = evaluateHand([card('A'), card('6'), card('8')]);
    expect(result.best).toBe(15); // 1 + 6 + 8
    expect(result.isSoft).toBe(false);
  });

  it('handles multiple Aces', () => {
    const result = evaluateHand([card('A'), card('A')]);
    expect(result.best).toBe(12); // 11 + 1
    expect(result.isSoft).toBe(true);
  });

  it('handles three Aces', () => {
    const result = evaluateHand([card('A'), card('A'), card('A')]);
    expect(result.best).toBe(13); // 11 + 1 + 1
    expect(result.isSoft).toBe(true);
  });

  it('handles four Aces', () => {
    const result = evaluateHand([card('A'), card('A'), card('A'), card('A')]);
    expect(result.best).toBe(14); // 11 + 1 + 1 + 1
    expect(result.isSoft).toBe(true);
  });

  it('detects bust', () => {
    const result = evaluateHand([card('K'), card('Q'), card('5')]);
    expect(result.best).toBe(25);
    expect(result.isBust).toBe(true);
  });

  it('Ace + 5 + 10 = 16 (not bust)', () => {
    const result = evaluateHand([card('A'), card('5'), card('10')]);
    expect(result.best).toBe(16); // 1 + 5 + 10
    expect(result.isBust).toBe(false);
    expect(result.isSoft).toBe(false);
  });

  it('evaluates hard 21 (not blackjack)', () => {
    const result = evaluateHand([card('10'), card('5'), card('6')]);
    expect(result.best).toBe(21);
    expect(result.isBlackjack).toBe(false);
    expect(result.isSoft).toBe(false);
  });

  it('evaluates soft 17 (Ace + 6)', () => {
    const result = evaluateHand([card('A'), card('6')]);
    expect(result.best).toBe(17);
    expect(result.isSoft).toBe(true);
  });

  it('evaluates hard 17 (10 + 7)', () => {
    const result = evaluateHand([card('10'), card('7')]);
    expect(result.best).toBe(17);
    expect(result.isSoft).toBe(false);
  });
});

describe('canSplit', () => {
  it('allows splitting same rank', () => {
    expect(canSplit([card('8'), card('8')])).toBe(true);
  });

  it('allows splitting same value (K-Q both = 10)', () => {
    expect(canSplit([card('K'), card('Q')])).toBe(true);
  });

  it('allows splitting Aces', () => {
    expect(canSplit([card('A'), card('A')])).toBe(true);
  });

  it('allows splitting 10-K (both value 10)', () => {
    expect(canSplit([card('10'), card('K')])).toBe(true);
  });

  it('rejects different values', () => {
    expect(canSplit([card('8'), card('9')])).toBe(false);
  });

  it('rejects more than 2 cards', () => {
    expect(canSplit([card('8'), card('8'), card('8')])).toBe(false);
  });

  it('rejects single card', () => {
    expect(canSplit([card('8')])).toBe(false);
  });
});

describe('isDealerShowingAce', () => {
  it('returns true when first card is Ace', () => {
    expect(isDealerShowingAce([card('A'), card('K')])).toBe(true);
  });

  it('returns false when first card is not Ace', () => {
    expect(isDealerShowingAce([card('K'), card('A')])).toBe(false);
  });

  it('returns false for empty hand', () => {
    expect(isDealerShowingAce([])).toBe(false);
  });
});

describe('isDealerShowingTen', () => {
  it('returns true for 10', () => {
    expect(isDealerShowingTen([card('10'), card('5')])).toBe(true);
  });

  it('returns true for face cards', () => {
    expect(isDealerShowingTen([card('J'), card('5')])).toBe(true);
    expect(isDealerShowingTen([card('Q'), card('5')])).toBe(true);
    expect(isDealerShowingTen([card('K'), card('5')])).toBe(true);
  });

  it('returns false for non-10 value', () => {
    expect(isDealerShowingTen([card('9'), card('5')])).toBe(false);
    expect(isDealerShowingTen([card('A'), card('5')])).toBe(false);
  });
});

describe('shouldDealerHit', () => {
  it('hits on 16', () => {
    expect(shouldDealerHit([card('10'), card('6')])).toBe(true);
  });

  it('hits on soft 17 (Ace + 6)', () => {
    expect(shouldDealerHit([card('A'), card('6')])).toBe(true);
  });

  it('stands on hard 17', () => {
    expect(shouldDealerHit([card('10'), card('7')])).toBe(false);
  });

  it('stands on 18', () => {
    expect(shouldDealerHit([card('10'), card('8')])).toBe(false);
  });

  it('stands on 21', () => {
    expect(shouldDealerHit([card('A'), card('K')])).toBe(false);
  });

  it('does not hit on bust', () => {
    expect(shouldDealerHit([card('10'), card('K'), card('5')])).toBe(false);
  });

  it('hits on 12', () => {
    expect(shouldDealerHit([card('5'), card('7')])).toBe(true);
  });

  it('stands on soft 18 (Ace + 7)', () => {
    expect(shouldDealerHit([card('A'), card('7')])).toBe(false);
  });

  it('hits on soft 17 with multiple cards', () => {
    // A(11) + 3 + 3 = 17 soft
    expect(shouldDealerHit([card('A'), card('3'), card('3')])).toBe(true);
  });

  it('stands on hard 17 with Ace counted as 1', () => {
    // A(1) + 6 + K(10) = 17 hard
    expect(shouldDealerHit([card('A'), card('6'), card('K')])).toBe(false);
  });
});

describe('determineOutcome', () => {
  const makeTotal = (cards: Card[], isSplit = false) => evaluateHand(cards, isSplit);

  it('player blackjack beats dealer non-blackjack', () => {
    const player = makeTotal([card('A'), card('K')]);
    const dealer = makeTotal([card('10'), card('9')]);
    expect(determineOutcome(player, dealer, false)).toBe('blackjack');
  });

  it('player blackjack pushes with dealer blackjack', () => {
    const player = makeTotal([card('A'), card('K')]);
    const dealer = makeTotal([card('A'), card('Q')]);
    expect(determineOutcome(player, dealer, false)).toBe('push');
  });

  it('player wins with higher total', () => {
    const player = makeTotal([card('10'), card('9')]);
    const dealer = makeTotal([card('10'), card('8')]);
    expect(determineOutcome(player, dealer, false)).toBe('win');
  });

  it('player loses with lower total', () => {
    const player = makeTotal([card('10'), card('7')]);
    const dealer = makeTotal([card('10'), card('8')]);
    expect(determineOutcome(player, dealer, false)).toBe('loss');
  });

  it('push on equal totals', () => {
    const player = makeTotal([card('10'), card('8')]);
    const dealer = makeTotal([card('10'), card('8')]);
    expect(determineOutcome(player, dealer, false)).toBe('push');
  });

  it('player wins when dealer busts', () => {
    const player = makeTotal([card('10'), card('5')]);
    const dealer = makeTotal([card('10'), card('K'), card('5')]);
    expect(determineOutcome(player, dealer, false)).toBe('win');
  });

  it('player bust is a loss even if dealer busts', () => {
    const player = makeTotal([card('10'), card('K'), card('5')]);
    const dealer = makeTotal([card('10'), card('K'), card('5')]);
    expect(determineOutcome(player, dealer, false)).toBe('loss');
  });

  it('surrender outcome', () => {
    const player = makeTotal([card('10'), card('6')]);
    const dealer = makeTotal([card('10'), card('7')]);
    expect(determineOutcome(player, dealer, true)).toBe('surrender');
  });

  it('21 from split is not blackjack', () => {
    const player = makeTotal([card('A'), card('K')], true);
    const dealer = makeTotal([card('10'), card('9')]);
    expect(determineOutcome(player, dealer, false)).toBe('win');
  });
});
