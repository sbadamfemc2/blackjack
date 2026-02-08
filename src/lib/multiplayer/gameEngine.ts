import { Card } from '@/engine/types';
import { DeckManager } from '@/engine/deck';
import { evaluateHand, shouldDealerHit, determineOutcome, canSplit as canSplitCheck } from '@/engine/hand';
import { calculatePayout } from '@/engine/betting';
import { PlayerHandState, MultiplayerGameState, MultiplayerPhase } from '@/lib/types/game';

// ============================================================
// Types for engine results
// ============================================================

interface EngineResult {
  success: boolean;
  error?: string;
  updates?: Partial<MultiplayerGameState>;
}

interface ResolveResult extends EngineResult {
  /** Per-player payout info: net chips to add back (bet + payout for wins, 0 for losses) */
  chipUpdates?: Array<{ userId: string; seatNumber: number; netReturn: number }>;
}

// ============================================================
// Round Lifecycle
// ============================================================

export function createNewRound(
  roomId: string,
  players: Array<{ seatNumber: number; userId: string }>,
  existingShoe?: Card[],
  existingCardsDealt?: number
): Omit<MultiplayerGameState, 'id' | 'updatedAt'> {
  const deck = new DeckManager(6);

  if (existingShoe && existingCardsDealt !== undefined) {
    deck.restoreState(existingShoe, existingCardsDealt);
  }

  if (deck.needsReshuffle()) {
    deck.reshuffle();
  }

  return {
    roomId,
    roundNumber: 1,
    phase: 'betting',
    activeSeat: null,
    activeHandIndex: null,
    shoe: deck.getShoe(),
    cardsDealt: deck.getCardsDealt(),
    cutCardPosition: deck.getCutCardPosition(),
    needsReshuffle: false,
    playerHands: [],
    dealerCards: [],
    holeCardRevealed: false,
  };
}

// ============================================================
// Betting
// ============================================================

export function placeBet(
  state: MultiplayerGameState,
  seatNumber: number,
  userId: string,
  amount: number,
  chipsAtTable: number,
  minBet: number,
  maxBet: number
): EngineResult {
  if (state.phase !== 'betting') {
    return { success: false, error: 'Not in betting phase' };
  }

  // Clear bet: remove the player's hand entry
  if (amount === 0) {
    const hands = state.playerHands.filter(
      (h) => !(h.seatNumber === seatNumber && h.userId === userId)
    );
    return { success: true, updates: { playerHands: hands } };
  }

  if (amount < minBet || amount > maxBet) {
    return { success: false, error: `Bet must be between $${minBet} and $${maxBet}` };
  }

  if (amount > chipsAtTable) {
    return { success: false, error: 'Insufficient chips' };
  }

  const hands = [...state.playerHands];
  const existingIdx = hands.findIndex((h) => h.seatNumber === seatNumber);

  const hand: PlayerHandState = {
    seatNumber,
    userId,
    bet: amount,
    cards: [],
    actions: [],
    isDoubled: false,
    isStood: false,
    isSurrendered: false,
    isSplit: false,
    outcome: null,
    payout: 0,
  };

  if (existingIdx >= 0) {
    hands[existingIdx] = hand;
  } else {
    hands.push(hand);
  }

  hands.sort((a, b) => a.seatNumber - b.seatNumber);

  return { success: true, updates: { playerHands: hands } };
}

// ============================================================
// Dealing
// ============================================================

export function dealCards(state: MultiplayerGameState): EngineResult {
  if (state.phase !== 'betting') {
    return { success: false, error: 'Not in betting phase' };
  }

  if (state.playerHands.length === 0) {
    return { success: false, error: 'No players have placed bets' };
  }

  const deck = new DeckManager(6);
  deck.restoreState(state.shoe, state.cardsDealt);

  if (deck.needsReshuffle()) {
    deck.reshuffle();
  }

  const playerHands = state.playerHands.map((h) => ({ ...h, cards: [] as Card[] }));
  const dealerCards: Card[] = [];

  // Deal 2 rounds: player cards, then dealer card, repeat
  for (let round = 0; round < 2; round++) {
    for (const hand of playerHands) {
      hand.cards.push(deck.deal());
    }
    dealerCards.push(deck.deal());
  }

  // Check for dealer blackjack
  const dealerUpCard = dealerCards[0];
  const dealerShowsAceOrTen =
    dealerUpCard.rank === 'A' || ['10', 'J', 'Q', 'K'].includes(dealerUpCard.rank);

  if (dealerShowsAceOrTen) {
    const dealerTotal = evaluateHand(dealerCards);
    if (dealerTotal.isBlackjack) {
      // Dealer BJ → skip straight to resolution
      return {
        success: true,
        updates: {
          phase: 'resolution',
          playerHands,
          dealerCards,
          holeCardRevealed: true,
          activeSeat: null,
          activeHandIndex: null,
          shoe: deck.getShoe(),
          cardsDealt: deck.getCardsDealt(),
          needsReshuffle: deck.needsReshuffle(),
        },
      };
    }
  }

  // Check if any player has a playable hand (skip blackjacks)
  const firstIdx = findFirstPlayableHandIndex(playerHands);

  if (firstIdx === null) {
    // All players have blackjack → go straight to dealer (which will just reveal)
    return {
      success: true,
      updates: {
        phase: 'dealer_play',
        playerHands,
        dealerCards,
        holeCardRevealed: false,
        activeSeat: null,
        activeHandIndex: null,
        shoe: deck.getShoe(),
        cardsDealt: deck.getCardsDealt(),
        needsReshuffle: deck.needsReshuffle(),
      },
    };
  }

  return {
    success: true,
    updates: {
      phase: 'player_action',
      playerHands,
      dealerCards,
      holeCardRevealed: false,
      activeSeat: playerHands[firstIdx].seatNumber,
      activeHandIndex: firstIdx,
      shoe: deck.getShoe(),
      cardsDealt: deck.getCardsDealt(),
      needsReshuffle: deck.needsReshuffle(),
    },
  };
}

// ============================================================
// Player Actions
// ============================================================

export function playerHit(state: MultiplayerGameState, userId: string): EngineResult {
  if (state.phase !== 'player_action') {
    return { success: false, error: 'Not in player action phase' };
  }

  const handIdx = getActiveHandIndex(state, userId);
  if (handIdx === -1) {
    return { success: false, error: 'Not your turn' };
  }

  const deck = new DeckManager(6);
  deck.restoreState(state.shoe, state.cardsDealt);

  const hand = { ...state.playerHands[handIdx] };
  hand.cards = [...hand.cards, deck.deal()];
  hand.actions = [...hand.actions, 'hit'];

  const total = evaluateHand(hand.cards, hand.isSplit);
  if (total.isBust || total.best === 21) {
    hand.isStood = true;
  }

  const hands = [...state.playerHands];
  hands[handIdx] = hand;

  const { nextIndex, nextSeat, nextPhase } = advanceToNextHand(hands, handIdx, hand.isStood);

  return {
    success: true,
    updates: {
      playerHands: hands,
      activeSeat: nextSeat,
      activeHandIndex: nextIndex,
      phase: nextPhase,
      shoe: deck.getShoe(),
      cardsDealt: deck.getCardsDealt(),
      needsReshuffle: deck.needsReshuffle(),
    },
  };
}

export function playerStand(state: MultiplayerGameState, userId: string): EngineResult {
  if (state.phase !== 'player_action') {
    return { success: false, error: 'Not in player action phase' };
  }

  const handIdx = getActiveHandIndex(state, userId);
  if (handIdx === -1) {
    return { success: false, error: 'Not your turn' };
  }

  const hands = [...state.playerHands];
  hands[handIdx] = {
    ...hands[handIdx],
    isStood: true,
    actions: [...hands[handIdx].actions, 'stand'],
  };

  const { nextIndex, nextSeat, nextPhase } = advanceToNextHand(hands, handIdx, true);

  return {
    success: true,
    updates: {
      playerHands: hands,
      activeSeat: nextSeat,
      activeHandIndex: nextIndex,
      phase: nextPhase,
    },
  };
}

export function playerDouble(
  state: MultiplayerGameState,
  userId: string,
  chipsAtTable: number
): EngineResult {
  if (state.phase !== 'player_action') {
    return { success: false, error: 'Not in player action phase' };
  }

  const handIdx = getActiveHandIndex(state, userId);
  if (handIdx === -1) {
    return { success: false, error: 'Not your turn' };
  }

  const hand = state.playerHands[handIdx];

  if (hand.cards.length !== 2) {
    return { success: false, error: 'Can only double on first two cards' };
  }

  if (chipsAtTable < hand.bet) {
    return { success: false, error: 'Insufficient chips to double' };
  }

  const deck = new DeckManager(6);
  deck.restoreState(state.shoe, state.cardsDealt);

  const updatedHand: PlayerHandState = {
    ...hand,
    bet: hand.bet * 2,
    cards: [...hand.cards, deck.deal()],
    actions: [...hand.actions, 'double'],
    isDoubled: true,
    isStood: true,
  };

  const hands = [...state.playerHands];
  hands[handIdx] = updatedHand;

  const { nextIndex, nextSeat, nextPhase } = advanceToNextHand(hands, handIdx, true);

  return {
    success: true,
    updates: {
      playerHands: hands,
      activeSeat: nextSeat,
      activeHandIndex: nextIndex,
      phase: nextPhase,
      shoe: deck.getShoe(),
      cardsDealt: deck.getCardsDealt(),
      needsReshuffle: deck.needsReshuffle(),
    },
  };
}

export function playerSplit(
  state: MultiplayerGameState,
  userId: string,
  chipsAtTable: number
): EngineResult {
  if (state.phase !== 'player_action') {
    return { success: false, error: 'Not in player action phase' };
  }

  const handIdx = getActiveHandIndex(state, userId);
  if (handIdx === -1) {
    return { success: false, error: 'Not your turn' };
  }

  const hand = state.playerHands[handIdx];

  if (hand.cards.length !== 2 || !canSplitCheck(hand.cards)) {
    return { success: false, error: 'Cannot split this hand' };
  }

  if (chipsAtTable < hand.bet) {
    return { success: false, error: 'Insufficient chips to split' };
  }

  const deck = new DeckManager(6);
  deck.restoreState(state.shoe, state.cardsDealt);

  const isAceSplit = hand.cards[0].rank === 'A';

  // Create two new hands from the split
  const hand1: PlayerHandState = {
    seatNumber: hand.seatNumber,
    userId: hand.userId,
    bet: hand.bet,
    cards: [hand.cards[0], deck.deal()],
    actions: ['split'],
    isDoubled: false,
    isStood: isAceSplit, // Aces get one card and auto-stand
    isSurrendered: false,
    isSplit: true,
    outcome: null,
    payout: 0,
  };

  const hand2: PlayerHandState = {
    seatNumber: hand.seatNumber,
    userId: hand.userId,
    bet: hand.bet,
    cards: [hand.cards[1], deck.deal()],
    actions: ['split'],
    isDoubled: false,
    isStood: isAceSplit, // Aces get one card and auto-stand
    isSurrendered: false,
    isSplit: true,
    outcome: null,
    payout: 0,
  };

  // Replace the original hand with the two split hands
  const hands = [...state.playerHands];
  hands.splice(handIdx, 1, hand1, hand2);

  // Determine next active hand
  let nextIndex: number | null;
  let nextPhase: MultiplayerPhase;

  if (isAceSplit) {
    // Both hands are auto-stood, find next playable hand after both split hands
    const afterSplitIdx = findNextPlayableHandIndex(hands, handIdx + 1);
    nextIndex = afterSplitIdx;
    nextPhase = afterSplitIdx === null ? 'dealer_play' : 'player_action';
  } else {
    // Play the first split hand
    nextIndex = handIdx;
    nextPhase = 'player_action';
  }

  return {
    success: true,
    updates: {
      playerHands: hands,
      activeSeat: nextIndex !== null ? hands[nextIndex].seatNumber : null,
      activeHandIndex: nextIndex,
      phase: nextPhase,
      shoe: deck.getShoe(),
      cardsDealt: deck.getCardsDealt(),
      needsReshuffle: deck.needsReshuffle(),
    },
  };
}

// ============================================================
// Dealer Play
// ============================================================

export function playDealer(state: MultiplayerGameState): EngineResult {
  if (state.phase !== 'dealer_play') {
    return { success: false, error: 'Not in dealer play phase' };
  }

  // Check if all players busted — dealer doesn't need to play
  const anyNonBust = state.playerHands.some((h) => {
    const total = evaluateHand(h.cards, h.isSplit);
    return !total.isBust;
  });

  if (!anyNonBust) {
    return {
      success: true,
      updates: {
        phase: 'resolution',
        holeCardRevealed: true,
      },
    };
  }

  const deck = new DeckManager(6);
  deck.restoreState(state.shoe, state.cardsDealt);

  const dealerCards = [...state.dealerCards];
  while (shouldDealerHit(dealerCards)) {
    dealerCards.push(deck.deal());
  }

  return {
    success: true,
    updates: {
      phase: 'resolution',
      dealerCards,
      holeCardRevealed: true,
      shoe: deck.getShoe(),
      cardsDealt: deck.getCardsDealt(),
      needsReshuffle: deck.needsReshuffle(),
    },
  };
}

// ============================================================
// Resolution
// ============================================================

export function resolveRound(state: MultiplayerGameState): ResolveResult {
  if (state.phase !== 'resolution') {
    return { success: false, error: 'Not in resolution phase' };
  }

  const dealerTotal = evaluateHand(state.dealerCards);
  const chipUpdates: ResolveResult['chipUpdates'] = [];

  const resolvedHands = state.playerHands.map((hand) => {
    const playerTotal = evaluateHand(hand.cards, hand.isSplit);
    const outcome = determineOutcome(playerTotal, dealerTotal, hand.isSurrendered);
    const payout = calculatePayout(hand.bet, outcome);

    // Net return: bet was already deducted, so return bet + payout
    // Win: bet + bet = 2x, BJ: bet + 1.5x, Push: bet + 0, Loss: bet + (-bet) = 0
    const netReturn = hand.bet + payout;

    chipUpdates!.push({
      userId: hand.userId,
      seatNumber: hand.seatNumber,
      netReturn,
    });

    return { ...hand, outcome, payout };
  });

  return {
    success: true,
    updates: {
      phase: 'round_over',
      playerHands: resolvedHands,
      holeCardRevealed: true,
      activeSeat: null,
      activeHandIndex: null,
    },
    chipUpdates,
  };
}

// ============================================================
// Hand Navigation Helpers (index-based for split support)
// ============================================================

/** Find the current active hand index, validating it belongs to the given user */
function getActiveHandIndex(state: MultiplayerGameState, userId: string): number {
  // Prefer activeHandIndex if set
  if (state.activeHandIndex !== null) {
    const hand = state.playerHands[state.activeHandIndex];
    if (hand && hand.userId === userId) {
      return state.activeHandIndex;
    }
    return -1;
  }

  // Fall back to activeSeat (backwards compat)
  return state.playerHands.findIndex(
    (h) => h.seatNumber === state.activeSeat && h.userId === userId
  );
}

/** Find the first hand index that is playable (not blackjack, not bust, not stood) */
function findFirstPlayableHandIndex(hands: PlayerHandState[]): number | null {
  for (let i = 0; i < hands.length; i++) {
    const total = evaluateHand(hands[i].cards, hands[i].isSplit);
    if (!total.isBlackjack && !total.isBust && !hands[i].isStood) {
      return i;
    }
  }
  return null;
}

/** Find the next playable hand index after the given index */
function findNextPlayableHandIndex(hands: PlayerHandState[], afterIndex: number): number | null {
  for (let i = afterIndex; i < hands.length; i++) {
    if (hands[i].isStood || hands[i].isSurrendered) continue;
    const total = evaluateHand(hands[i].cards, hands[i].isSplit);
    if (total.isBust || total.isBlackjack) continue;
    return i;
  }
  return null;
}

/** After a hand action, determine the next active hand, seat, and phase */
function advanceToNextHand(
  hands: PlayerHandState[],
  currentIndex: number,
  currentHandDone: boolean
): { nextIndex: number | null; nextSeat: number | null; nextPhase: MultiplayerPhase } {
  if (!currentHandDone) {
    return {
      nextIndex: currentIndex,
      nextSeat: hands[currentIndex].seatNumber,
      nextPhase: 'player_action',
    };
  }

  const nextIdx = findNextPlayableHandIndex(hands, currentIndex + 1);
  if (nextIdx === null) {
    return { nextIndex: null, nextSeat: null, nextPhase: 'dealer_play' };
  }

  return {
    nextIndex: nextIdx,
    nextSeat: hands[nextIdx].seatNumber,
    nextPhase: 'player_action',
  };
}
