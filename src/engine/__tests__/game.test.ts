import { DeckManager } from '../deck';
import { Card, GameState, PlayerHand, GAME_CONFIG } from '../types';
import {
  createInitialGameState,
  getAvailableActions,
  gameReducer,
} from '../game';

// ============================================================
// Test helpers
// ============================================================

function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit };
}

/**
 * Create a rigged DeckManager that deals cards in a specific order.
 * Cards are dealt from the END of the array (like a stack), so
 * pass them in reverse order of how you want them dealt.
 */
class RiggedDeckManager extends DeckManager {
  constructor(cards: Card[]) {
    super(1); // create a minimal manager
    // Override the shoe with our rigged cards
    // Cards deal from the end (pop), so reverse the input
    this.restoreState([...cards].reverse(), 0);
  }
}

/**
 * Set up a game state where bets are placed and cards have been dealt.
 * Provide the exact cards to deal in order:
 * For N player hands: [p1_card1, p1_card2, ..., pN_card1, pN_card2, d_card1, d_card2, extra_cards...]
 *
 * Deal order in the engine is: round1(all players, dealer), round2(all players, dealer)
 * So for 1 hand: [p1_c1, d_c1, p1_c2, d_c2, ...extras]
 */
function setupDealtGame(
  playerCards: Card[][],
  dealerCards: Card[],
  bets: number[] = [100],
  chips: number = 1000,
  extraCards: Card[] = []
): { state: GameState; deck: RiggedDeckManager } {
  const numHands = playerCards.length;

  // Build the dealing sequence: round 1 (each player + dealer), round 2 (each player + dealer)
  const dealSequence: Card[] = [];

  // Round 1: first card to each player hand, then dealer
  for (let i = 0; i < numHands; i++) {
    dealSequence.push(playerCards[i][0]);
  }
  dealSequence.push(dealerCards[0]);

  // Round 2: second card to each player hand, then dealer
  for (let i = 0; i < numHands; i++) {
    dealSequence.push(playerCards[i][1]);
  }
  dealSequence.push(dealerCards[1]);

  // Add extra cards (for hits, splits, dealer play, etc.)
  dealSequence.push(...extraCards);

  const deck = new RiggedDeckManager(dealSequence);

  const handsConfig = numHands as 1 | 2 | 3 | 4 | 5 | 6;
  let state = createInitialGameState(chips, handsConfig, 'test-session');

  // Place bets
  for (let i = 0; i < numHands; i++) {
    state = gameReducer(state, { type: 'PLACE_BET', handIndex: i, amount: bets[i] ?? 100 }, deck);
  }

  // Deal
  state = gameReducer(state, { type: 'DEAL' }, deck);

  return { state, deck };
}

/**
 * Repeatedly dispatch DEALER_PLAY until the phase leaves DEALER_PLAY.
 * Mirrors the one-card-at-a-time reducer behaviour.
 */
function dealerPlaysOut(state: GameState, deck: DeckManager): GameState {
  while (state.phase === 'DEALER_PLAY') {
    state = gameReducer(state, { type: 'DEALER_PLAY' }, deck);
  }
  return state;
}

// ============================================================
// Tests
// ============================================================

describe('createInitialGameState', () => {
  it('creates state in BETTING phase', () => {
    const state = createInitialGameState(1000, 1, 'test');
    expect(state.phase).toBe('BETTING');
    expect(state.chips).toBe(1000);
    expect(state.handsConfiguration).toBe(1);
    expect(state.bets).toEqual([0]);
  });

  it('creates correct number of bet slots', () => {
    const state = createInitialGameState(1000, 3, 'test');
    expect(state.bets).toEqual([0, 0, 0]);
  });
});

describe('Betting phase', () => {
  let state: GameState;
  let deck: DeckManager;

  beforeEach(() => {
    deck = new DeckManager(6);
    state = createInitialGameState(1000, 2, 'test');
  });

  it('places a bet on a hand', () => {
    state = gameReducer(state, { type: 'PLACE_BET', handIndex: 0, amount: 100 }, deck);
    expect(state.bets[0]).toBe(100);
  });

  it('clears a bet', () => {
    state = gameReducer(state, { type: 'PLACE_BET', handIndex: 0, amount: 100 }, deck);
    state = gameReducer(state, { type: 'CLEAR_BET', handIndex: 0 }, deck);
    expect(state.bets[0]).toBe(0);
  });

  it('clears all bets', () => {
    state = gameReducer(state, { type: 'PLACE_BET', handIndex: 0, amount: 100 }, deck);
    state = gameReducer(state, { type: 'PLACE_BET', handIndex: 1, amount: 200 }, deck);
    state = gameReducer(state, { type: 'CLEAR_ALL_BETS' }, deck);
    expect(state.bets).toEqual([0, 0]);
  });

  it('rejects bet exceeding chips', () => {
    state = gameReducer(state, { type: 'PLACE_BET', handIndex: 0, amount: 1500 }, deck);
    expect(state.bets[0]).toBe(0); // unchanged
  });

  it('rejects bet when combined bets exceed chips', () => {
    state = gameReducer(state, { type: 'PLACE_BET', handIndex: 0, amount: 600 }, deck);
    state = gameReducer(state, { type: 'PLACE_BET', handIndex: 1, amount: 500 }, deck);
    expect(state.bets[1]).toBe(0); // second bet rejected
  });

  it('handles same bet', () => {
    state = gameReducer(state, { type: 'SAME_BET', previousBets: [100, 200] }, deck);
    expect(state.bets).toEqual([100, 200]);
  });

  it('handles double previous bet', () => {
    state = gameReducer(state, { type: 'DOUBLE_PREVIOUS_BET', previousBets: [100, 200] }, deck);
    expect(state.bets).toEqual([200, 400]);
  });

  it('rejects same bet if insufficient chips', () => {
    state = gameReducer(state, { type: 'SAME_BET', previousBets: [600, 600] }, deck);
    expect(state.bets).toEqual([0, 0]); // unchanged
  });

  it('rejects deal without bets placed', () => {
    state = gameReducer(state, { type: 'DEAL' }, deck);
    expect(state.phase).toBe('BETTING'); // not dealt
  });
});

describe('Dealing phase', () => {
  it('deals 2 cards to player and 2 to dealer', () => {
    const { state } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('7'), card('K')],
    );

    expect(state.playerHands).toHaveLength(1);
    expect(state.playerHands[0].cards).toHaveLength(2);
    expect(state.dealerHand.cards).toHaveLength(2);
  });

  it('deducts bets from chips', () => {
    const { state } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('7'), card('K')],
      [100],
      1000,
    );

    expect(state.chips).toBe(900);
  });

  it('moves to PLAYER_ACTION for normal hands', () => {
    const { state } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('7'), card('K')],
    );

    expect(state.phase).toBe('PLAYER_ACTION');
  });

  it('deals multiple hands correctly', () => {
    const { state } = setupDealtGame(
      [[card('10'), card('5')], [card('8'), card('7')]],
      [card('6'), card('K')],
      [100, 100],
      1000,
    );

    expect(state.playerHands).toHaveLength(2);
    expect(state.playerHands[0].cards[0].rank).toBe('10');
    expect(state.playerHands[0].cards[1].rank).toBe('5');
    expect(state.playerHands[1].cards[0].rank).toBe('8');
    expect(state.playerHands[1].cards[1].rank).toBe('7');
    expect(state.dealerHand.cards[0].rank).toBe('6');
    expect(state.dealerHand.cards[1].rank).toBe('K');
    expect(state.chips).toBe(800);
  });
});

describe('Player blackjack scenarios', () => {
  it('player blackjack pays 3:2 when dealer does not have blackjack', () => {
    const { state, deck } = setupDealtGame(
      [[card('A'), card('K')]],
      [card('7'), card('K')],
      [100],
      1000,
    );

    // Player has blackjack, dealer shows 7 (no BJ check needed)
    // Player hand should auto-stand, move to dealer play
    expect(state.phase).toBe('DEALER_PLAY');

    // Dealer plays
    const resolved = dealerPlaysOut(state, deck);
    expect(resolved.phase).toBe('ROUND_OVER');
    expect(resolved.playerHands[0].outcome).toBe('blackjack');
    expect(resolved.playerHands[0].payout).toBe(150); // 3:2 on $100
    expect(resolved.chips).toBe(900 + 100 + 150); // returned bet + winnings
  });

  it('player blackjack pushes with dealer blackjack (dealer shows 10)', () => {
    const { state } = setupDealtGame(
      [[card('A'), card('K')]],
      [card('10'), card('A')],
      [100],
      1000,
    );

    // Dealer shows 10, has blackjack -> immediate resolution
    expect(state.phase).toBe('ROUND_OVER');
    expect(state.playerHands[0].outcome).toBe('push');
    expect(state.playerHands[0].payout).toBe(0);
    expect(state.chips).toBe(1000); // bet returned
  });
});

describe('Even money', () => {
  it('offers even money when player has blackjack and dealer shows Ace', () => {
    const { state } = setupDealtGame(
      [[card('A'), card('K')]],
      [card('A'), card('9')],
      [100],
      1000,
    );

    expect(state.evenMoneyOffered).toBe(true);
    expect(state.evenMoneyHandIndex).toBe(0);
    expect(state.phase).toBe('PLAYER_ACTION');
  });

  it('accepting even money pays 1:1 immediately', () => {
    const { state, deck } = setupDealtGame(
      [[card('A'), card('K')]],
      [card('A'), card('9')],
      [100],
      1000,
    );

    const accepted = gameReducer(state, { type: 'ACCEPT_EVEN_MONEY' }, deck);
    expect(accepted.playerHands[0].outcome).toBe('win');
    expect(accepted.playerHands[0].payout).toBe(100); // 1:1 instead of 3:2
    expect(accepted.chips).toBe(900 + 100 + 100); // original chips - bet + bet back + profit
  });

  it('declining even money: dealer no BJ -> player gets 3:2', () => {
    const { state, deck } = setupDealtGame(
      [[card('A'), card('K')]],
      [card('A'), card('9')],
      [100],
      1000,
    );

    let declined = gameReducer(state, { type: 'DECLINE_EVEN_MONEY' }, deck);
    // Dealer doesn't have BJ (A+9=20), so player BJ stands, go to dealer play
    expect(declined.phase).toBe('DEALER_PLAY');

    declined = dealerPlaysOut(declined, deck);
    expect(declined.playerHands[0].outcome).toBe('blackjack');
    expect(declined.playerHands[0].payout).toBe(150);
  });

  it('declining even money: dealer has BJ -> push', () => {
    const { state, deck } = setupDealtGame(
      [[card('A'), card('K')]],
      [card('A'), card('K')],
      [100],
      1000,
    );

    const declined = gameReducer(state, { type: 'DECLINE_EVEN_MONEY' }, deck);
    // Dealer has blackjack -> resolve immediately
    expect(declined.phase).toBe('ROUND_OVER');
    expect(declined.playerHands[0].outcome).toBe('push');
    expect(declined.chips).toBe(1000); // bet returned
  });
});

describe('Dealer blackjack check', () => {
  it('dealer blackjack with Ace showing resolves immediately (no player BJ)', () => {
    const { state } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('A'), card('K')],
      [100],
      1000,
    );

    expect(state.phase).toBe('ROUND_OVER');
    expect(state.playerHands[0].outcome).toBe('loss');
    expect(state.chips).toBe(900); // lost the bet
  });

  it('dealer blackjack with 10 showing resolves immediately', () => {
    const { state } = setupDealtGame(
      [[card('10'), card('8')]],
      [card('K'), card('A')],
      [100],
      1000,
    );

    expect(state.phase).toBe('ROUND_OVER');
    expect(state.playerHands[0].outcome).toBe('loss');
  });

  it('dealer Ace showing but no BJ continues play', () => {
    const { state } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('A'), card('7')],
      [100],
      1000,
    );

    // Dealer shows Ace, no player BJ, dealer doesn't have BJ (A+7=18)
    // Should continue to player action
    expect(state.phase).toBe('PLAYER_ACTION');
  });
});

describe('Player actions - Hit', () => {
  it('adds a card to the active hand', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('3')], // hit card
    );

    const hit = gameReducer(state, { type: 'HIT' }, deck);
    expect(hit.playerHands[0].cards).toHaveLength(3);
    expect(hit.playerHands[0].cards[2].rank).toBe('3');
    expect(hit.playerHands[0].actions).toContain('hit');
    expect(hit.phase).toBe('PLAYER_ACTION'); // still playing
  });

  it('auto-stands on 21', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('6')], // hit to 21
    );

    const hit = gameReducer(state, { type: 'HIT' }, deck);
    expect(hit.playerHands[0].isStood).toBe(true);
    expect(hit.phase).toBe('DEALER_PLAY'); // auto-advance
  });

  it('auto-stands on bust', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('K')], // bust
    );

    const hit = gameReducer(state, { type: 'HIT' }, deck);
    expect(hit.playerHands[0].isStood).toBe(true);
  });

  it('all hands bust -> resolve without dealer play', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('K')],
    );

    const hit = gameReducer(state, { type: 'HIT' }, deck);
    expect(hit.phase).toBe('ROUND_OVER');
    expect(hit.playerHands[0].outcome).toBe('loss');
    expect(hit.chips).toBe(900); // lost $100 bet
  });
});

describe('Player actions - Stand', () => {
  it('stands and moves to dealer play', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('8')]],
      [card('7'), card('K')],
    );

    const stood = gameReducer(state, { type: 'STAND' }, deck);
    expect(stood.playerHands[0].isStood).toBe(true);
    expect(stood.phase).toBe('DEALER_PLAY');
  });

  it('stands on first hand and moves to second', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('8')], [card('9'), card('7')]],
      [card('6'), card('K')],
      [100, 100],
    );

    const stood = gameReducer(state, { type: 'STAND' }, deck);
    expect(stood.activeHandIndex).toBe(1);
    expect(stood.phase).toBe('PLAYER_ACTION');
  });
});

describe('Player actions - Double Down', () => {
  it('doubles bet, receives one card, auto-stands', () => {
    const { state, deck } = setupDealtGame(
      [[card('5'), card('6')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('10')], // double card
    );

    const doubled = gameReducer(state, { type: 'DOUBLE_DOWN' }, deck);
    expect(doubled.playerHands[0].cards).toHaveLength(3);
    expect(doubled.playerHands[0].bet).toBe(200); // doubled
    expect(doubled.playerHands[0].isDoubled).toBe(true);
    expect(doubled.playerHands[0].isStood).toBe(true);
    expect(doubled.chips).toBe(800); // 1000 - 100 (initial) - 100 (double)
    expect(doubled.phase).toBe('DEALER_PLAY');
  });

  it('cannot double without sufficient chips', () => {
    const { state, deck } = setupDealtGame(
      [[card('5'), card('6')]],
      [card('7'), card('K')],
      [100],
      100, // only enough for the initial bet
    );

    // Chips = 0 after bet, can't afford double
    const actions = getAvailableActions(state);
    expect(actions).not.toContain('double');
  });

  it('can double after split', () => {
    const { state, deck } = setupDealtGame(
      [[card('8'), card('8')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('3'), card('5'), card('10')], // split cards + double card
    );

    // Split
    const split = gameReducer(state, { type: 'SPLIT' }, deck);
    // First split hand: 8 + 3 = 11, good for double
    const actions = getAvailableActions(split);
    expect(actions).toContain('double');
  });
});

describe('Player actions - Split', () => {
  it('splits a pair into two hands', () => {
    const { state, deck } = setupDealtGame(
      [[card('8'), card('8')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('5'), card('3')], // cards dealt to each split hand
    );

    const split = gameReducer(state, { type: 'SPLIT' }, deck);
    expect(split.playerHands).toHaveLength(2);
    expect(split.playerHands[0].cards[0].rank).toBe('8');
    expect(split.playerHands[0].cards[1].rank).toBe('5');
    expect(split.playerHands[1].cards[0].rank).toBe('8');
    expect(split.playerHands[1].cards[1].rank).toBe('3');
    expect(split.playerHands[0].isSplit).toBe(true);
    expect(split.playerHands[1].isSplit).toBe(true);
    expect(split.chips).toBe(800); // 1000 - 100 - 100
  });

  it('can split Aces and hit them (liberal rules)', () => {
    const { state, deck } = setupDealtGame(
      [[card('A'), card('A')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('5'), card('3'), card('6')], // split cards + hit card
    );

    const split = gameReducer(state, { type: 'SPLIT' }, deck);
    // First hand: A + 5 = 16, can hit
    const actions = getAvailableActions(split);
    expect(actions).toContain('hit');

    const hit = gameReducer(split, { type: 'HIT' }, deck);
    expect(hit.playerHands[0].cards).toHaveLength(3);
  });

  it('21 after split is NOT blackjack', () => {
    const { state, deck } = setupDealtGame(
      [[card('A'), card('A')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('K'), card('3')], // first split hand gets A+K=21
    );

    const split = gameReducer(state, { type: 'SPLIT' }, deck);
    // First hand: A + K = 21 from split (not blackjack)
    expect(split.playerHands[0].isStood).toBe(true);
    // Should move to second hand
    expect(split.activeHandIndex).toBe(1);
  });

  it('can re-split up to 4 hands', () => {
    const { state, deck } = setupDealtGame(
      [[card('8'), card('8')]],
      [card('7'), card('K')],
      [100],
      1000,
      [
        card('8'), card('5'), // first split: 8+8, 8+5
        card('8'), card('3'), // second split of first hand: 8+8, 8+3
        card('2'), card('6'), // third split: 8+2, 8+6
      ],
    );

    // First split
    let result = gameReducer(state, { type: 'SPLIT' }, deck);
    expect(result.playerHands).toHaveLength(2);

    // Second split (first hand is again 8-8)
    result = gameReducer(result, { type: 'SPLIT' }, deck);
    expect(result.playerHands).toHaveLength(3);

    // Third split (first hand is again 8-8)
    result = gameReducer(result, { type: 'SPLIT' }, deck);
    expect(result.playerHands).toHaveLength(4);

    // Cannot split again (at max)
    const actions = getAvailableActions(result);
    expect(actions).not.toContain('split');
  });

  it('cannot split with insufficient chips', () => {
    const { state, deck } = setupDealtGame(
      [[card('8'), card('8')]],
      [card('7'), card('K')],
      [100],
      100, // just enough for the bet, not the split
    );

    const actions = getAvailableActions(state);
    expect(actions).not.toContain('split');
  });
});

describe('Player actions - Surrender', () => {
  it('surrenders and returns half the bet', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('6')]],
      [card('9'), card('K')],
      [100],
      1000,
    );

    const surrendered = gameReducer(state, { type: 'SURRENDER' }, deck);
    expect(surrendered.phase).toBe('ROUND_OVER');
    expect(surrendered.playerHands[0].outcome).toBe('surrender');
    expect(surrendered.playerHands[0].payout).toBe(-50);
    expect(surrendered.chips).toBe(950); // 1000 - 100 + 50
  });

  it('cannot surrender after hitting', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('3')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('3')],
    );

    // Hit first
    const hit = gameReducer(state, { type: 'HIT' }, deck);
    const actions = getAvailableActions(hit);
    expect(actions).not.toContain('surrender');
  });

  it('cannot surrender a split hand', () => {
    const { state, deck } = setupDealtGame(
      [[card('8'), card('8')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('5'), card('3')],
    );

    const split = gameReducer(state, { type: 'SPLIT' }, deck);
    const actions = getAvailableActions(split);
    expect(actions).not.toContain('surrender');
  });
});

describe('Dealer play', () => {
  it('dealer hits on soft 17', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('8')]],
      [card('A'), card('6')],
      [100],
      1000,
      [card('2')], // dealer hits soft 17, gets A+6+2=19, stands
    );

    // Stand to move to dealer play
    let result = gameReducer(state, { type: 'STAND' }, deck);
    expect(result.phase).toBe('DEALER_PLAY');

    result = dealerPlaysOut(result, deck);
    expect(result.dealerHand.cards).toHaveLength(3); // hit once
    expect(result.dealerHand.holeCardRevealed).toBe(true);
  });

  it('dealer stands on hard 17', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('8')]],
      [card('10'), card('7')],
    );

    let result = gameReducer(state, { type: 'STAND' }, deck);
    result = dealerPlaysOut(result, deck);
    expect(result.dealerHand.cards).toHaveLength(2); // no hits
  });

  it('dealer busts', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('8')]],
      [card('6'), card('K')], // dealer has 16
      [100],
      1000,
      [card('K')], // dealer hits 16, busts with 26
    );

    let result = gameReducer(state, { type: 'STAND' }, deck);
    result = dealerPlaysOut(result, deck);

    expect(result.phase).toBe('ROUND_OVER');
    expect(result.playerHands[0].outcome).toBe('win');
    expect(result.chips).toBe(1100); // 900 + 100 bet + 100 win
  });
});

describe('Hand resolution', () => {
  it('player wins 1:1', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('9')]],
      [card('10'), card('8')],
      [100],
      1000,
    );

    let result = gameReducer(state, { type: 'STAND' }, deck);
    result = dealerPlaysOut(result, deck);

    expect(result.playerHands[0].outcome).toBe('win');
    expect(result.playerHands[0].payout).toBe(100);
    expect(result.chips).toBe(1100);
  });

  it('player loses', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('7')]],
      [card('10'), card('9')],
      [100],
      1000,
    );

    let result = gameReducer(state, { type: 'STAND' }, deck);
    result = dealerPlaysOut(result, deck);

    expect(result.playerHands[0].outcome).toBe('loss');
    expect(result.playerHands[0].payout).toBe(-100);
    expect(result.chips).toBe(900);
  });

  it('push returns bet', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('8')]],
      [card('10'), card('8')],
      [100],
      1000,
    );

    let result = gameReducer(state, { type: 'STAND' }, deck);
    result = dealerPlaysOut(result, deck);

    expect(result.playerHands[0].outcome).toBe('push');
    expect(result.playerHands[0].payout).toBe(0);
    expect(result.chips).toBe(1000);
  });

  it('multiple hands resolve independently', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('9')], [card('10'), card('5')]],
      [card('10'), card('8')],
      [100, 100],
      1000,
      [card('K')], // hand 2 hits and busts
    );

    // Hand 1: stand (19 vs dealer 18)
    let result = gameReducer(state, { type: 'STAND' }, deck);
    // Hand 2: hit 15 + K = bust
    result = gameReducer(result, { type: 'HIT' }, deck);

    // Dealer plays (hand 1 is alive)
    result = dealerPlaysOut(result, deck);

    expect(result.playerHands[0].outcome).toBe('win');
    expect(result.playerHands[1].outcome).toBe('loss');
    expect(result.chips).toBe(1000); // +100 (hand1 win) - 100 (hand2 loss) = net 0
  });

  it('doubled hand win pays 2x', () => {
    const { state, deck } = setupDealtGame(
      [[card('5'), card('6')]],
      [card('6'), card('K')], // dealer has 16
      [100],
      1000,
      [card('10'), card('K')], // double card (21), dealer busts
    );

    // Double down: 5+6=11, get 10 -> 21
    let result = gameReducer(state, { type: 'DOUBLE_DOWN' }, deck);
    result = dealerPlaysOut(result, deck);

    expect(result.playerHands[0].bet).toBe(200);
    expect(result.playerHands[0].outcome).toBe('win');
    expect(result.playerHands[0].payout).toBe(200);
    expect(result.chips).toBe(1200); // 1000 - 100 - 100 + 200 + 200
  });
});

describe('New round', () => {
  it('resets state for new round', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('9')]],
      [card('10'), card('8')],
      [100],
      1000,
    );

    let result = gameReducer(state, { type: 'STAND' }, deck);
    result = dealerPlaysOut(result, deck);
    expect(result.phase).toBe('ROUND_OVER');

    result = gameReducer(result, { type: 'NEW_ROUND' }, deck);
    expect(result.phase).toBe('BETTING');
    expect(result.playerHands).toHaveLength(0);
    expect(result.bets).toEqual([0]);
    expect(result.activeHandIndex).toBe(0);
    expect(result.evenMoneyOffered).toBe(false);
  });

  it('preserves chips and hand number across rounds', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('9')]],
      [card('10'), card('8')],
      [100],
      1000,
    );

    let result = gameReducer(state, { type: 'STAND' }, deck);
    result = dealerPlaysOut(result, deck);
    const chipsAfterRound = result.chips;
    const handNumber = result.handNumber;

    result = gameReducer(result, { type: 'NEW_ROUND' }, deck);
    expect(result.chips).toBe(chipsAfterRound);
    expect(result.handNumber).toBe(handNumber);
  });

  it('does not start new round if chips are 0', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('5')]],
      [card('10'), card('9')],
      [100],
      100, // all chips bet
    );

    // Stand, lose
    let result = gameReducer(state, { type: 'STAND' }, deck);
    result = dealerPlaysOut(result, deck);
    expect(result.chips).toBe(0);

    // Try new round - should stay in ROUND_OVER
    result = gameReducer(result, { type: 'NEW_ROUND' }, deck);
    expect(result.phase).toBe('ROUND_OVER');
  });
});

describe('getAvailableActions', () => {
  it('returns all actions on initial 2-card hand', () => {
    const { state } = setupDealtGame(
      [[card('8'), card('9')]],
      [card('7'), card('K')],
      [100],
      1000,
    );

    const actions = getAvailableActions(state);
    expect(actions).toContain('hit');
    expect(actions).toContain('stand');
    expect(actions).toContain('double');
    expect(actions).toContain('surrender');
    expect(actions).not.toContain('split'); // 8-9 is not a pair
  });

  it('includes split for pairs', () => {
    const { state } = setupDealtGame(
      [[card('8'), card('8')]],
      [card('7'), card('K')],
      [100],
      1000,
    );

    const actions = getAvailableActions(state);
    expect(actions).toContain('split');
  });

  it('returns empty for non-PLAYER_ACTION phase', () => {
    const state = createInitialGameState(1000, 1, 'test');
    expect(getAvailableActions(state)).toEqual([]);
  });

  it('no surrender after hit', () => {
    const { state, deck } = setupDealtGame(
      [[card('5'), card('3')]],
      [card('7'), card('K')],
      [100],
      1000,
      [card('2')],
    );

    const hit = gameReducer(state, { type: 'HIT' }, deck);
    const actions = getAvailableActions(hit);
    expect(actions).not.toContain('surrender');
    expect(actions).not.toContain('double'); // also no double after hit
  });
});

describe('Edge cases', () => {
  it('all player hands bust -> dealer does not play', () => {
    const { state, deck } = setupDealtGame(
      [[card('10'), card('6')], [card('10'), card('5')]],
      [card('7'), card('K')],
      [100, 100],
      1000,
      [card('K'), card('K')], // both hands bust
    );

    // Hand 1: hit -> bust
    let result = gameReducer(state, { type: 'HIT' }, deck);
    // Hand 2: hit -> bust
    result = gameReducer(result, { type: 'HIT' }, deck);

    // Should resolve without dealer play
    expect(result.phase).toBe('ROUND_OVER');
    expect(result.dealerHand.holeCardRevealed).toBe(true);
    expect(result.playerHands[0].outcome).toBe('loss');
    expect(result.playerHands[1].outcome).toBe('loss');
    expect(result.chips).toBe(800); // lost both $100 bets
  });

  it('split with both hands busting', () => {
    const { state, deck } = setupDealtGame(
      [[card('8'), card('8')]],
      [card('7'), card('K')],
      [100],
      1000,
      [
        card('5'), card('5'), // split cards: 8+5=13, 8+5=13
        card('K'), card('K'), // both bust on hit
      ],
    );

    // Split
    let result = gameReducer(state, { type: 'SPLIT' }, deck);
    // Hit first hand -> bust
    result = gameReducer(result, { type: 'HIT' }, deck);
    // Hit second hand -> bust
    result = gameReducer(result, { type: 'HIT' }, deck);

    expect(result.phase).toBe('ROUND_OVER');
    expect(result.playerHands[0].outcome).toBe('loss');
    expect(result.playerHands[1].outcome).toBe('loss');
  });

  it('ignores actions during wrong phase', () => {
    const state = createInitialGameState(1000, 1, 'test');
    const deck = new DeckManager(6);

    // Try hitting during BETTING phase
    const result = gameReducer(state, { type: 'HIT' }, deck);
    expect(result).toEqual(state); // unchanged
  });

  it('handles multi-hand with first hand blackjack', () => {
    const { state, deck } = setupDealtGame(
      [[card('A'), card('K')], [card('10'), card('5')]],
      [card('7'), card('9')],
      [100, 100],
      1000,
      [card('6'), card('K')], // hit for hand 2, dealer hits 16 and busts
    );

    // Hand 1 has blackjack (auto-stands), active hand should be hand 2
    expect(state.activeHandIndex).toBe(1);
    expect(state.phase).toBe('PLAYER_ACTION');

    // Hit hand 2 to 21
    let result = gameReducer(state, { type: 'HIT' }, deck);
    result = dealerPlaysOut(result, deck);

    expect(result.playerHands[0].outcome).toBe('blackjack');
    expect(result.playerHands[0].payout).toBe(150); // 3:2
    expect(result.playerHands[1].outcome).toBe('win');
    expect(result.playerHands[1].payout).toBe(100); // 1:1
  });
});
