import { DeckManager, createShoe, shuffle, getCutCardPosition } from '../deck';
import { GAME_CONFIG } from '../types';

describe('createShoe', () => {
  it('creates a 6-deck shoe with 312 cards', () => {
    const shoe = createShoe(6);
    expect(shoe).toHaveLength(312);
  });

  it('creates a 1-deck shoe with 52 cards', () => {
    const shoe = createShoe(1);
    expect(shoe).toHaveLength(52);
  });

  it('contains the correct number of each card', () => {
    const shoe = createShoe(6);

    // 6 decks * 4 suits = 24 of each rank
    const aces = shoe.filter(c => c.rank === 'A');
    expect(aces).toHaveLength(24);

    const kings = shoe.filter(c => c.rank === 'K');
    expect(kings).toHaveLength(24);

    const twos = shoe.filter(c => c.rank === '2');
    expect(twos).toHaveLength(24);
  });

  it('contains all four suits for each rank', () => {
    const shoe = createShoe(1);
    const aces = shoe.filter(c => c.rank === 'A');
    const suits = new Set(aces.map(c => c.suit));
    expect(suits.size).toBe(4);
  });
});

describe('shuffle', () => {
  it('maintains all cards after shuffling', () => {
    const shoe = createShoe(6);
    const originalLength = shoe.length;
    shuffle(shoe);
    expect(shoe).toHaveLength(originalLength);
  });

  it('changes card order (statistical)', () => {
    const shoe1 = createShoe(1);
    const shoe2 = createShoe(1);
    shuffle(shoe2);

    // It's astronomically unlikely that a shuffle produces the exact same order
    let samePositionCount = 0;
    for (let i = 0; i < shoe1.length; i++) {
      if (shoe1[i].rank === shoe2[i].rank && shoe1[i].suit === shoe2[i].suit) {
        samePositionCount++;
      }
    }
    // With 52 cards, expected ~1 card in same position. Allow up to 10 for safety.
    expect(samePositionCount).toBeLessThan(20);
  });

  it('preserves card composition after shuffle', () => {
    const shoe = createShoe(6);
    shuffle(shoe);

    const aces = shoe.filter(c => c.rank === 'A');
    expect(aces).toHaveLength(24);
  });
});

describe('getCutCardPosition', () => {
  it('calculates 75% penetration correctly', () => {
    const position = getCutCardPosition(312, 0.75);
    expect(position).toBe(234);
  });

  it('handles custom penetration', () => {
    const position = getCutCardPosition(312, 0.5);
    expect(position).toBe(156);
  });
});

describe('DeckManager', () => {
  let manager: DeckManager;

  beforeEach(() => {
    manager = new DeckManager(6);
  });

  it('starts with 312 cards', () => {
    expect(manager.getRemainingCards()).toBe(312);
  });

  it('deals a card and reduces remaining count', () => {
    const card = manager.deal();
    expect(card).toBeDefined();
    expect(card.suit).toBeDefined();
    expect(card.rank).toBeDefined();
    expect(manager.getRemainingCards()).toBe(311);
    expect(manager.getCardsDealt()).toBe(1);
  });

  it('tracks cards dealt correctly', () => {
    for (let i = 0; i < 10; i++) {
      manager.deal();
    }
    expect(manager.getCardsDealt()).toBe(10);
    expect(manager.getRemainingCards()).toBe(302);
  });

  it('signals reshuffle after passing cut card', () => {
    const cutPos = manager.getCutCardPosition();
    expect(manager.needsReshuffle()).toBe(false);

    // Deal up to cut card
    for (let i = 0; i < cutPos; i++) {
      manager.deal();
    }
    expect(manager.needsReshuffle()).toBe(true);
  });

  it('reshuffles correctly', () => {
    // Deal some cards
    for (let i = 0; i < 50; i++) {
      manager.deal();
    }
    expect(manager.getRemainingCards()).toBe(262);

    manager.reshuffle();
    expect(manager.getRemainingCards()).toBe(312);
    expect(manager.getCardsDealt()).toBe(0);
    expect(manager.needsReshuffle()).toBe(false);
  });

  it('restores state correctly', () => {
    // Deal some cards, save state
    for (let i = 0; i < 20; i++) {
      manager.deal();
    }
    const savedShoe = manager.getShoe();
    const savedDealt = manager.getCardsDealt();

    // Create new manager and restore
    const newManager = new DeckManager(6);
    newManager.restoreState(savedShoe, savedDealt);

    expect(newManager.getRemainingCards()).toBe(savedShoe.length);
    expect(newManager.getCardsDealt()).toBe(savedDealt);
  });

  it('throws when shoe is empty', () => {
    // Use a 1-deck shoe and deal all cards
    const smallManager = new DeckManager(1);
    for (let i = 0; i < 52; i++) {
      smallManager.deal();
    }
    expect(() => smallManager.deal()).toThrow('Shoe is empty');
  });

  it('getShoe returns a copy', () => {
    const shoe = manager.getShoe();
    shoe.pop(); // mutate the copy
    expect(manager.getRemainingCards()).toBe(312); // original unchanged
  });
});
